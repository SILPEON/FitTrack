import SwiftUI
import SwiftData
import MapKit

struct RoutesView: View {
    @Environment(\.modelContext) private var context
    @Environment(LocationTracker.self) private var tracker
    @Query(sort: \Route.date, order: .reverse) private var routes: [Route]

    @State private var showPlanned = false
    @State private var showRecorder = false
    @State private var showPlanner = false
    @State private var guideRoute: Route?

    private var visible: [Route] { routes.filter { $0.isPlanned == showPlanned } }

    var body: some View {
        NavigationStack {
            List {
                if tracker.state != .idle {
                    Section {
                        Button {
                            showRecorder = true
                        } label: {
                            Label("Recording in progress, tap to return", systemImage: "record.circle")
                                .foregroundStyle(.red)
                        }
                    }
                }

                Section {
                    Picker("Type", selection: $showPlanned) {
                        Text("Recorded").tag(false)
                        Text("Planned").tag(true)
                    }
                    .pickerStyle(.segmented)
                }

                Section {
                    if visible.isEmpty {
                        ContentUnavailableView(
                            showPlanned ? "No planned routes" : "No recorded routes",
                            systemImage: showPlanned ? "point.topleft.down.to.point.bottomright.curvepath" : "figure.run",
                            description: Text(showPlanned ? "Tap Plan to draw a route on the map." : "Tap Record to track a walk, run or ride."))
                    }
                    ForEach(visible) { route in
                        NavigationLink {
                            RouteDetailView(route: route) { r in
                                guideRoute = r
                                showRecorder = true
                            }
                        } label: {
                            RouteRow(route: route)
                        }
                    }
                    .onDelete { offsets in
                        let list = visible
                        for i in offsets { context.delete(list[i]) }
                    }
                }

                if !showPlanned && !routes.filter({ !$0.isPlanned }).isEmpty {
                    Section("This month") { monthStats }
                }
            }
            .navigationTitle("Routes")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button {
                        showPlanner = true
                    } label: {
                        Label("Plan", systemImage: "point.topleft.down.to.point.bottomright.curvepath")
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        guideRoute = nil
                        showRecorder = true
                    } label: {
                        Label("Record", systemImage: "record.circle")
                    }
                }
            }
            .fullScreenCover(isPresented: $showRecorder) {
                RecordRouteView(guide: guideRoute)
            }
            .fullScreenCover(isPresented: $showPlanner) {
                RoutePlannerView()
            }
        }
    }

    private var monthStats: some View {
        let start = Calendar.current.dateInterval(of: .month, for: .now)?.start ?? .now
        let month = routes.filter { !$0.isPlanned && $0.date >= start }
        return Group {
            ForEach(ActivityType.allCases) { type in
                let items = month.filter { $0.activity == type }
                if !items.isEmpty {
                    LabeledContent {
                        Text("\(Fmt.distance(items.reduce(0) { $0 + $1.distanceMeters })) · \(Fmt.duration(items.reduce(0) { $0 + $1.durationSeconds }))")
                    } label: {
                        Label("\(items.count)× \(type.label)", systemImage: type.icon)
                    }
                }
            }
        }
    }
}

struct RouteRow: View {
    let route: Route

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: route.activity.icon)
                .font(.title2)
                .frame(width: 36)
                .foregroundStyle(.tint)
            VStack(alignment: .leading, spacing: 2) {
                Text(route.name).font(.headline)
                Text(route.date, format: .dateTime.day().month().year().hour().minute())
                    .font(.caption).foregroundStyle(.secondary)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 2) {
                Text(Fmt.distance(route.distanceMeters)).font(.subheadline.bold())
                if !route.isPlanned {
                    Text(Fmt.duration(route.durationSeconds)).font(.caption).foregroundStyle(.secondary)
                }
            }
        }
    }
}

struct RouteDetailView: View {
    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss
    let route: Route
    let onFollow: (Route) -> Void

    @State private var coords: [CLLocationCoordinate2D]
    @State private var position: MapCameraPosition
    @State private var gpxURL: URL?
    @State private var confirmDelete = false

    init(route: Route, onFollow: @escaping (Route) -> Void) {
        self.route = route
        self.onFollow = onFollow
        let c = route.coordinates
        _coords = State(initialValue: c)
        _position = State(initialValue: RouteMath.cameraPosition(for: c))
    }

    var body: some View {
        List {
            Section {
                Map(position: $position) {
                    if coords.count > 1 {
                        MapPolyline(coordinates: coords)
                            .stroke(route.isPlanned ? Color.purple : Color.blue, lineWidth: 5)
                    }
                    if let first = coords.first {
                        Marker("Start", systemImage: "flag.fill", coordinate: first).tint(.green)
                    }
                    if let last = coords.last, coords.count > 1 {
                        Marker("End", systemImage: "flag.checkered", coordinate: last).tint(.red)
                    }
                }
                .frame(height: 320)
                .listRowInsets(EdgeInsets())
            }

            Section("Details") {
                TextField("Name", text: Binding(get: { route.name }, set: { route.name = $0 }))
                Picker("Activity", selection: Binding(get: { route.activity }, set: { route.activity = $0 })) {
                    ForEach(ActivityType.allCases) { Label($0.label, systemImage: $0.icon).tag($0) }
                }
                LabeledContent("Distance", value: Fmt.distance(route.distanceMeters))
                if route.isPlanned {
                    let est = route.distanceMeters / 1000 / route.activity.typicalSpeedKmh * 3600
                    LabeledContent("Estimated time", value: Fmt.duration(est))
                } else {
                    LabeledContent("Moving time", value: Fmt.duration(route.durationSeconds))
                    if route.activity == .bike {
                        LabeledContent("Avg. speed", value: Fmt.speed(distance: route.distanceMeters, time: route.durationSeconds))
                    } else {
                        LabeledContent("Avg. pace", value: Fmt.pace(distance: route.distanceMeters, time: route.durationSeconds))
                    }
                    LabeledContent("Elevation gain", value: "\(Int(route.elevationGain)) m")
                }
                LabeledContent("Date", value: route.date.formatted(.dateTime.day().month().year().hour().minute()))
            }

            Section {
                Button {
                    dismiss()
                    onFollow(route)
                } label: {
                    Label(route.isPlanned ? "Start this route" : "Do this route again", systemImage: "play.fill")
                }
                if let gpxURL {
                    ShareLink(item: gpxURL) {
                        Label("Export GPX", systemImage: "square.and.arrow.up")
                    }
                }
                Button(role: .destructive) {
                    confirmDelete = true
                } label: {
                    Label("Delete route", systemImage: "trash")
                }
            }
        }
        .navigationTitle(route.name)
        .navigationBarTitleDisplayMode(.inline)
        .task { gpxURL = GPX.export(route) }
        .confirmationDialog("Delete this route?", isPresented: $confirmDelete, titleVisibility: .visible) {
            Button("Delete", role: .destructive) {
                context.delete(route)
                dismiss()
            }
        }
    }
}

enum RouteMath {
    static func distance(of coords: [CLLocationCoordinate2D]) -> Double {
        zip(coords, coords.dropFirst()).reduce(0) { total, pair in
            total + CLLocation(latitude: pair.0.latitude, longitude: pair.0.longitude)
                .distance(from: CLLocation(latitude: pair.1.latitude, longitude: pair.1.longitude))
        }
    }

    static func cameraPosition(for coords: [CLLocationCoordinate2D]) -> MapCameraPosition {
        guard !coords.isEmpty else { return .userLocation(fallback: .automatic) }
        let rect = MKPolyline(coordinates: coords, count: coords.count).boundingMapRect
        let padX = max(rect.size.width * 0.15, 400)
        let padY = max(rect.size.height * 0.15, 400)
        return .rect(rect.insetBy(dx: -padX, dy: -padY))
    }
}

enum GPX {
    static func export(_ route: Route) -> URL? {
        let iso = ISO8601DateFormatter()
        var s = """
        <?xml version="1.0" encoding="UTF-8"?>
        <gpx version="1.1" creator="FitTrack" xmlns="http://www.topografix.com/GPX/1/1">
        <trk><name>\(escape(route.name))</name><trkseg>

        """
        for p in route.points {
            s += "<trkpt lat=\"\(p.lat)\" lon=\"\(p.lon)\">"
            if let alt = p.alt { s += "<ele>\(alt)</ele>" }
            if let time = p.time { s += "<time>\(iso.string(from: time))</time>" }
            s += "</trkpt>\n"
        }
        s += "</trkseg></trk>\n</gpx>\n"

        let safe = route.name.components(separatedBy: CharacterSet.alphanumerics.inverted).joined(separator: "_")
        let url = FileManager.default.temporaryDirectory.appendingPathComponent((safe.isEmpty ? "route" : safe) + ".gpx")
        do {
            try s.write(to: url, atomically: true, encoding: .utf8)
            return url
        } catch {
            return nil
        }
    }

    private static func escape(_ text: String) -> String {
        text.replacingOccurrences(of: "&", with: "&amp;")
            .replacingOccurrences(of: "<", with: "&lt;")
            .replacingOccurrences(of: ">", with: "&gt;")
    }
}
