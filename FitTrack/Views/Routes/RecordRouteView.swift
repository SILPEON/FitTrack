import SwiftUI
import SwiftData
import MapKit

struct RecordRouteView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var context
    @Environment(LocationTracker.self) private var tracker
    let guide: Route?

    @State private var position: MapCameraPosition = .userLocation(followsHeading: false, fallback: .automatic)
    @State private var guideCoords: [CLLocationCoordinate2D] = []
    @State private var showSave = false
    @State private var showTooShort = false
    @State private var routeName = ""

    var body: some View {
        ZStack(alignment: .bottom) {
            Map(position: $position) {
                UserAnnotation()
                if guideCoords.count > 1 {
                    MapPolyline(coordinates: guideCoords)
                        .stroke(.purple.opacity(0.6), style: StrokeStyle(lineWidth: 6, lineCap: .round, dash: [8, 6]))
                }
                if tracker.points.count > 1 {
                    MapPolyline(coordinates: tracker.coordinates)
                        .stroke(.blue, style: StrokeStyle(lineWidth: 5, lineCap: .round, lineJoin: .round))
                }
            }
            .mapControls {
                MapUserLocationButton()
                MapCompass()
                MapScaleView()
            }

            controlPanel
        }
        .overlay(alignment: .topLeading) {
            Button {
                dismiss()   // recording keeps running in the background
            } label: {
                Image(systemName: "chevron.down")
                    .font(.headline)
                    .padding(12)
                    .background(.regularMaterial, in: Circle())
            }
            .padding()
        }
        .onAppear {
            tracker.requestPermission()
            if let guide {
                guideCoords = guide.coordinates
                if tracker.state == .idle { tracker.activity = guide.activity }
            }
        }
        .alert("Save route", isPresented: $showSave) {
            TextField("Name", text: $routeName)
            Button("Save") { save() }
            Button("Discard", role: .destructive) {
                tracker.reset()
                dismiss()
            }
            Button("Keep going", role: .cancel) { tracker.resume() }
        }
        .alert("Route too short", isPresented: $showTooShort) {
            Button("Keep going", role: .cancel) { tracker.resume() }
            Button("Discard", role: .destructive) {
                tracker.reset()
                dismiss()
            }
        } message: {
            Text("Not enough GPS points were recorded to save a route yet.")
        }
    }

    private var controlPanel: some View {
        @Bindable var bindable = tracker

        return VStack(spacing: 14) {
            if tracker.authorizationDenied {
                Text("Location access is off. Enable it in Settings › Privacy & Security › Location Services › FitTrack.")
                    .font(.footnote)
                    .foregroundStyle(.red)
                    .multilineTextAlignment(.center)
            }

            TimelineView(.periodic(from: .now, by: 1)) { context in
                let elapsed = tracker.elapsed(at: context.date)
                HStack {
                    stat("Time", Fmt.duration(elapsed))
                    stat("Distance", Fmt.distance(tracker.distance))
                    if tracker.activity == .bike {
                        stat("Speed", Fmt.speed(distance: tracker.distance, time: elapsed))
                    } else {
                        stat("Pace", Fmt.pace(distance: tracker.distance, time: elapsed))
                    }
                }
            }

            switch tracker.state {
            case .idle:
                Picker("Activity", selection: $bindable.activity) {
                    ForEach(ActivityType.allCases) { Label($0.label, systemImage: $0.icon).tag($0) }
                }
                .pickerStyle(.segmented)
                Button {
                    tracker.start()
                } label: {
                    Text("Start").font(.title3.bold()).frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .tint(.green)
                .controlSize(.large)

            case .recording, .paused:
                HStack(spacing: 12) {
                    Button {
                        tracker.state == .recording ? tracker.pause() : tracker.resume()
                    } label: {
                        Text(tracker.state == .recording ? "Pause" : "Resume")
                            .font(.title3.bold()).frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.orange)

                    Button {
                        tracker.pause()
                        if tracker.points.count < 2 {
                            showTooShort = true
                        } else {
                            routeName = defaultName()
                            showSave = true
                        }
                    } label: {
                        Text("Finish").font(.title3.bold()).frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.red)
                }
                .controlSize(.large)
            }
        }
        .padding()
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 24))
        .padding()
    }

    private func stat(_ title: String, _ value: String) -> some View {
        VStack(spacing: 2) {
            Text(value).font(.title2.bold().monospacedDigit()).lineLimit(1).minimumScaleFactor(0.6)
            Text(title).font(.caption).foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
    }

    private func defaultName() -> String {
        let hour = Calendar.current.component(.hour, from: tracker.startDate ?? .now)
        let part = switch hour {
        case 5..<12: "Morning"
        case 12..<17: "Afternoon"
        case 17..<22: "Evening"
        default: "Night"
        }
        return "\(part) \(tracker.activity.label)"
    }

    private func save() {
        let name = routeName.trimmingCharacters(in: .whitespaces)
        if let route = tracker.makeRoute(name: name.isEmpty ? defaultName() : name) {
            context.insert(route)
        }
        tracker.reset()
        dismiss()
    }
}
