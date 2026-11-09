import SwiftUI
import SwiftData
import MapKit

/// Tap the map to drop waypoints. With "Follow paths" on, each leg is routed along
/// walkable roads and paths using Apple Maps directions; otherwise legs are straight lines.
struct RoutePlannerView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var context

    private struct Segment: Identifiable {
        let id = UUID()
        var coords: [CLLocationCoordinate2D]
    }

    @State private var position: MapCameraPosition = .userLocation(fallback: .automatic)
    @State private var waypoints: [CLLocationCoordinate2D] = []
    @State private var segments: [Segment] = []
    @State private var followPaths = true
    @State private var activity: ActivityType = .walk
    @State private var pending = 0
    @State private var showSave = false
    @State private var name = ""
    @State private var searchText = ""

    private var path: [CLLocationCoordinate2D] {
        segments.isEmpty ? waypoints : segments.flatMap(\.coords)
    }

    private var distance: Double { RouteMath.distance(of: path) }

    var body: some View {
        NavigationStack {
            MapReader { proxy in
                Map(position: $position) {
                    UserAnnotation()
                    if path.count > 1 {
                        MapPolyline(coordinates: path)
                            .stroke(.purple, style: StrokeStyle(lineWidth: 5, lineCap: .round, lineJoin: .round))
                    }
                    ForEach(waypoints.indices, id: \.self) { i in
                        Annotation("", coordinate: waypoints[i]) {
                            Text("\(i + 1)")
                                .font(.caption.bold())
                                .foregroundStyle(.white)
                                .frame(width: 24, height: 24)
                                .background(i == 0 ? Color.green : Color.purple, in: Circle())
                                .overlay(Circle().stroke(.white, lineWidth: 2))
                        }
                    }
                }
                .mapControls {
                    MapUserLocationButton()
                    MapCompass()
                    MapScaleView()
                }
                .onTapGesture { screenPoint in
                    if let coordinate = proxy.convert(screenPoint, from: .local) {
                        addWaypoint(coordinate)
                    }
                }
            }
            .safeAreaInset(edge: .bottom) { panel }
            .navigationTitle("Plan Route")
            .navigationBarTitleDisplayMode(.inline)
            .searchable(text: $searchText, prompt: "Search a place")
            .onSubmit(of: .search) { searchPlace() }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Close") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        name = "\(activity.label) route \(Date.now.formatted(.dateTime.day().month()))"
                        showSave = true
                    }
                    .disabled(waypoints.count < 2)
                }
            }
            .alert("Save planned route", isPresented: $showSave) {
                TextField("Name", text: $name)
                Button("Save") { save() }
                Button("Cancel", role: .cancel) {}
            }
            .onChange(of: followPaths) { rebuildSegments() }
            .onAppear { CLLocationManager().requestWhenInUseAuthorization() }
        }
    }

    private var panel: some View {
        VStack(spacing: 10) {
            if waypoints.isEmpty {
                Text("Tap the map to add waypoints.")
                    .font(.subheadline).foregroundStyle(.secondary)
            } else {
                HStack {
                    VStack(alignment: .leading) {
                        Text(Fmt.distance(distance)).font(.title2.bold().monospacedDigit())
                        Text("≈ \(Fmt.duration(distance / 1000 / activity.typicalSpeedKmh * 3600)) at \(Int(activity.typicalSpeedKmh)) km/h")
                            .font(.caption).foregroundStyle(.secondary)
                    }
                    Spacer()
                    if pending > 0 { ProgressView() }
                }
            }

            Picker("Activity", selection: $activity) {
                ForEach(ActivityType.allCases) { Label($0.label, systemImage: $0.icon).tag($0) }
            }
            .pickerStyle(.segmented)

            Toggle("Follow roads & paths", isOn: $followPaths)
                .font(.subheadline)

            HStack {
                Button {
                    undo()
                } label: {
                    Label("Undo", systemImage: "arrow.uturn.backward")
                }
                .disabled(waypoints.isEmpty)
                Spacer()
                Button {
                    if let first = waypoints.first { addWaypoint(first) }
                } label: {
                    Label("Loop back", systemImage: "arrow.triangle.capsulepath")
                }
                .disabled(waypoints.count < 2)
                Spacer()
                Button(role: .destructive) {
                    waypoints = []
                    segments = []
                } label: {
                    Label("Clear", systemImage: "trash")
                }
                .disabled(waypoints.isEmpty)
            }
            .buttonStyle(.bordered)
            .font(.subheadline)
        }
        .padding()
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 20))
        .padding(.horizontal)
        .padding(.bottom, 4)
    }

    // MARK: - Actions

    private func addWaypoint(_ coordinate: CLLocationCoordinate2D) {
        waypoints.append(coordinate)
        guard waypoints.count >= 2 else { return }
        let from = waypoints[waypoints.count - 2]
        let segment = Segment(coords: [from, coordinate])
        segments.append(segment)
        if followPaths { route(segment.id, from: from, to: coordinate) }
    }

    private func undo() {
        guard !waypoints.isEmpty else { return }
        waypoints.removeLast()
        if !segments.isEmpty { segments.removeLast() }
    }

    private func rebuildSegments() {
        segments = zip(waypoints, waypoints.dropFirst()).map { Segment(coords: [$0, $1]) }
        if followPaths {
            for s in segments {
                if let a = s.coords.first, let b = s.coords.last { route(s.id, from: a, to: b) }
            }
        }
    }

    /// Replaces the straight placeholder leg with a walking route when Apple Maps returns one.
    private func route(_ id: UUID, from a: CLLocationCoordinate2D, to b: CLLocationCoordinate2D) {
        pending += 1
        Task {
            let coords = await Self.directions(from: a, to: b)
            pending -= 1
            if let coords, coords.count > 1, let i = segments.firstIndex(where: { $0.id == id }) {
                segments[i].coords = coords
            }
        }
    }

    private static func directions(from a: CLLocationCoordinate2D, to b: CLLocationCoordinate2D) async -> [CLLocationCoordinate2D]? {
        let request = MKDirections.Request()
        request.source = MKMapItem(placemark: MKPlacemark(coordinate: a))
        request.destination = MKMapItem(placemark: MKPlacemark(coordinate: b))
        request.transportType = .walking
        guard let response = try? await MKDirections(request: request).calculate(),
              let polyline = response.routes.first?.polyline else { return nil }
        var coords = [CLLocationCoordinate2D](repeating: kCLLocationCoordinate2DInvalid, count: polyline.pointCount)
        polyline.getCoordinates(&coords, range: NSRange(location: 0, length: polyline.pointCount))
        return coords
    }

    private func searchPlace() {
        let request = MKLocalSearch.Request()
        request.naturalLanguageQuery = searchText
        Task {
            if let response = try? await MKLocalSearch(request: request).start() {
                withAnimation { position = .region(response.boundingRegion) }
            }
        }
    }

    private func save() {
        let points = path.map { RoutePoint(lat: $0.latitude, lon: $0.longitude, alt: nil, time: nil) }
        let trimmed = name.trimmingCharacters(in: .whitespaces)
        context.insert(Route(name: trimmed.isEmpty ? "Planned route" : trimmed,
                             activity: activity, isPlanned: true,
                             points: points, distanceMeters: distance))
        dismiss()
    }
}
