import Foundation
import CoreLocation
import Observation

/// Records a GPS track. Lives for the whole app session so recording continues when you switch tabs
/// or lock the phone (via CLBackgroundActivitySession + the "location" background mode).
@MainActor
@Observable
final class LocationTracker {
    enum State { case idle, recording, paused }

    private(set) var state: State = .idle
    var activity: ActivityType = .run
    private(set) var points: [RoutePoint] = []
    private(set) var distance: Double = 0        // meters
    private(set) var elevationGain: Double = 0   // meters
    private(set) var authorizationDenied = false
    private(set) var startDate: Date?

    private var accumulated: TimeInterval = 0
    private var segmentStart: Date?
    private var lastLocation: CLLocation?
    private var lastAltitude: Double?

    @ObservationIgnored private var updatesTask: Task<Void, Never>?
    @ObservationIgnored private var backgroundSession: CLBackgroundActivitySession?
    private let manager = CLLocationManager()

    var coordinates: [CLLocationCoordinate2D] { points.map(\.coordinate) }

    func requestPermission() {
        if manager.authorizationStatus == .notDetermined {
            manager.requestWhenInUseAuthorization()
        }
        authorizationDenied = manager.authorizationStatus == .denied || manager.authorizationStatus == .restricted
    }

    /// Moving time (pauses excluded).
    func elapsed(at date: Date = .now) -> TimeInterval {
        accumulated + (segmentStart.map { date.timeIntervalSince($0) } ?? 0)
    }

    func start() {
        reset()
        requestPermission()
        startDate = .now
        segmentStart = .now
        state = .recording
        backgroundSession = CLBackgroundActivitySession()
        updatesTask = Task { [weak self] in
            do {
                for try await update in CLLocationUpdate.liveUpdates(.fitness) {
                    guard let self else { return }
                    if update.authorizationDenied { self.authorizationDenied = true }
                    if let location = update.location { self.handle(location) }
                }
            } catch {
                // Stream ended; nothing to do.
            }
        }
    }

    func pause() {
        guard state == .recording else { return }
        if let segmentStart { accumulated += Date.now.timeIntervalSince(segmentStart) }
        segmentStart = nil
        lastLocation = nil   // don't count the gap between pause and resume as distance
        state = .paused
    }

    func resume() {
        guard state == .paused else { return }
        segmentStart = .now
        state = .recording
    }

    func reset() {
        updatesTask?.cancel()
        updatesTask = nil
        backgroundSession?.invalidate()
        backgroundSession = nil
        state = .idle
        points = []
        distance = 0
        elevationGain = 0
        accumulated = 0
        segmentStart = nil
        startDate = nil
        lastLocation = nil
        lastAltitude = nil
    }

    func makeRoute(name: String) -> Route? {
        guard points.count >= 2 else { return nil }
        return Route(name: name, date: startDate ?? .now, activity: activity, isPlanned: false,
                     points: points, distanceMeters: distance, durationSeconds: elapsed(),
                     elevationGain: elevationGain)
    }

    private func handle(_ location: CLLocation) {
        guard state == .recording else { return }
        // Ignore poor fixes.
        guard location.horizontalAccuracy >= 0, location.horizontalAccuracy <= 30 else { return }

        if let last = lastLocation {
            let d = location.distance(from: last)
            guard d >= 4 else { return }                       // GPS jitter while standing still
            let dt = location.timestamp.timeIntervalSince(last.timestamp)
            if dt > 0, d / dt > 40 { return }                   // > 144 km/h = GPS jump
            distance += d
        }

        if location.verticalAccuracy > 0, location.verticalAccuracy < 20 {
            if let lastAlt = lastAltitude {
                let diff = location.altitude - lastAlt
                if abs(diff) >= 3 {                             // threshold filters altitude noise
                    if diff > 0 { elevationGain += diff }
                    lastAltitude = location.altitude
                }
            } else {
                lastAltitude = location.altitude
            }
        }

        lastLocation = location
        points.append(RoutePoint(lat: location.coordinate.latitude,
                                 lon: location.coordinate.longitude,
                                 alt: location.verticalAccuracy > 0 ? location.altitude : nil,
                                 time: location.timestamp))
    }
}
