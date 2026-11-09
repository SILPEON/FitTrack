import Foundation
import SwiftData
import CoreLocation

// MARK: - Enums

enum MuscleGroup: String, CaseIterable, Identifiable {
    case chest = "Chest", back = "Back", shoulders = "Shoulders", biceps = "Biceps",
         triceps = "Triceps", forearms = "Forearms", quads = "Quads", hamstrings = "Hamstrings",
         glutes = "Glutes", calves = "Calves", core = "Core", fullBody = "Full Body"
    var id: String { rawValue }
}

enum Meal: String, CaseIterable, Identifiable {
    case breakfast, lunch, dinner, snack
    var id: String { rawValue }
    var label: String {
        switch self {
        case .breakfast: "Breakfast"
        case .lunch: "Lunch"
        case .dinner: "Dinner"
        case .snack: "Snacks"
        }
    }
}

enum ActivityType: String, CaseIterable, Identifiable {
    case walk, run, bike
    var id: String { rawValue }
    var label: String {
        switch self {
        case .walk: "Walk"
        case .run: "Run"
        case .bike: "Bike"
        }
    }
    var icon: String {
        switch self {
        case .walk: "figure.walk"
        case .run: "figure.run"
        case .bike: "bicycle"
        }
    }
    /// Typical average speed, used to estimate duration of planned routes.
    var typicalSpeedKmh: Double {
        switch self {
        case .walk: 5
        case .run: 10
        case .bike: 20
        }
    }
}

// MARK: - Training

@Model
final class Exercise {
    var name: String
    var muscleGroupRaw: String
    var equipment: String
    var isCustom: Bool
    @Relationship(deleteRule: .nullify, inverse: \ExerciseEntry.exercise)
    var entries: [ExerciseEntry] = []

    init(name: String, muscleGroup: MuscleGroup, equipment: String, isCustom: Bool = false) {
        self.name = name
        self.muscleGroupRaw = muscleGroup.rawValue
        self.equipment = equipment
        self.isCustom = isCustom
    }
}

extension Exercise {
    var muscleGroup: MuscleGroup { MuscleGroup(rawValue: muscleGroupRaw) ?? .fullBody }
}

@Model
final class WorkoutSession {
    var date: Date
    var title: String
    var notes: String
    @Relationship(deleteRule: .cascade, inverse: \ExerciseEntry.session)
    var entries: [ExerciseEntry] = []

    init(date: Date = .now, title: String = "Workout", notes: String = "") {
        self.date = date
        self.title = title
        self.notes = notes
    }
}

extension WorkoutSession {
    var sortedEntries: [ExerciseEntry] { entries.sorted { $0.order < $1.order } }
    var totalSets: Int { entries.reduce(0) { $0 + $1.sets.count } }
    var totalVolume: Double {
        entries.flatMap(\.sets).reduce(0) { $0 + Double($1.reps) * $1.weight }
    }
}

@Model
final class ExerciseEntry {
    var order: Int
    var exercise: Exercise?
    var session: WorkoutSession?
    @Relationship(deleteRule: .cascade, inverse: \SetEntry.entry)
    var sets: [SetEntry] = []

    init(order: Int) {
        self.order = order
    }
}

extension ExerciseEntry {
    var sortedSets: [SetEntry] { sets.sorted { $0.order < $1.order } }

    var bestEstimated1RM: Double {
        sets.map { HealthCalculator.oneRepMax(weight: $0.weight, reps: $0.reps) }.max() ?? 0
    }

    var heaviestWeight: Double { sets.map(\.weight).max() ?? 0 }

    var summary: String {
        sortedSets.map { "\($0.reps)×\($0.weight.clean) kg" }.joined(separator: ", ")
    }

    /// Most recent earlier entry for the same exercise (for "last time" hints and prefill).
    func previousEntry() -> ExerciseEntry? {
        guard let exercise, let date = session?.date else { return nil }
        return exercise.entries
            .filter { $0 !== self && !$0.sets.isEmpty && ($0.session?.date ?? .distantFuture) < date }
            .max { ($0.session?.date ?? .distantPast) < ($1.session?.date ?? .distantPast) }
    }
}

@Model
final class SetEntry {
    var order: Int
    var reps: Int
    var weight: Double
    var entry: ExerciseEntry?

    init(order: Int, reps: Int, weight: Double) {
        self.order = order
        self.reps = reps
        self.weight = weight
    }
}

// MARK: - Body weight

@Model
final class WeightEntry {
    var date: Date
    var weight: Double // kg

    init(date: Date = .now, weight: Double) {
        self.date = date
        self.weight = weight
    }
}

// MARK: - Nutrition

/// A food in the database. All nutrient values are per 100 g.
@Model
final class FoodItem {
    var name: String
    var kcal: Double
    var protein: Double
    var carbs: Double
    var fat: Double
    var fiber: Double
    var isCustom: Bool
    var lastUsed: Date?

    init(name: String, kcal: Double, protein: Double, carbs: Double, fat: Double, fiber: Double, isCustom: Bool = false) {
        self.name = name
        self.kcal = kcal
        self.protein = protein
        self.carbs = carbs
        self.fat = fat
        self.fiber = fiber
        self.isCustom = isCustom
    }
}

/// One logged food. Values are absolute for the logged amount.
@Model
final class FoodEntry {
    var date: Date
    var mealRaw: String
    var name: String
    var grams: Double
    var kcal: Double
    var protein: Double
    var carbs: Double
    var fat: Double
    var fiber: Double

    init(date: Date, meal: Meal, name: String, grams: Double, kcal: Double, protein: Double, carbs: Double, fat: Double, fiber: Double) {
        self.date = date
        self.mealRaw = meal.rawValue
        self.name = name
        self.grams = grams
        self.kcal = kcal
        self.protein = protein
        self.carbs = carbs
        self.fat = fat
        self.fiber = fiber
    }
}

extension FoodEntry {
    var meal: Meal { Meal(rawValue: mealRaw) ?? .snack }
}

// MARK: - Profile

@Model
final class UserProfile {
    var sexRaw: String = Sex.male.rawValue
    var birthDate: Date = Calendar.current.date(byAdding: .year, value: -30, to: .now) ?? .now
    var heightCm: Double = 175
    var activityRaw: String = ActivityLevel.moderate.rawValue
    var goalRaw: String = GoalType.maintain.rawValue
    var targetWeightKg: Double = 75
    var weeklyChangeKg: Double = 0.5
    var proteinPerKg: Double = 1.8
    var fatPercent: Double = 25

    init() {}
}

extension UserProfile {
    var sex: Sex {
        get { Sex(rawValue: sexRaw) ?? .male }
        set { sexRaw = newValue.rawValue }
    }
    var activity: ActivityLevel {
        get { ActivityLevel(rawValue: activityRaw) ?? .moderate }
        set { activityRaw = newValue.rawValue }
    }
    var goal: GoalType {
        get { GoalType(rawValue: goalRaw) ?? .maintain }
        set { goalRaw = newValue.rawValue }
    }
}

// MARK: - Routes

struct RoutePoint: Codable, Hashable {
    var lat: Double
    var lon: Double
    var alt: Double?
    var time: Date?

    var coordinate: CLLocationCoordinate2D { CLLocationCoordinate2D(latitude: lat, longitude: lon) }
}

@Model
final class Route {
    var name: String
    var date: Date
    var activityRaw: String
    var isPlanned: Bool
    var distanceMeters: Double
    var durationSeconds: Double
    var elevationGain: Double
    @Attribute(.externalStorage) var pointsData: Data

    init(name: String, date: Date = .now, activity: ActivityType, isPlanned: Bool,
         points: [RoutePoint], distanceMeters: Double, durationSeconds: Double = 0, elevationGain: Double = 0) {
        self.name = name
        self.date = date
        self.activityRaw = activity.rawValue
        self.isPlanned = isPlanned
        self.distanceMeters = distanceMeters
        self.durationSeconds = durationSeconds
        self.elevationGain = elevationGain
        self.pointsData = (try? JSONEncoder().encode(points)) ?? Data()
    }
}

extension Route {
    var activity: ActivityType {
        get { ActivityType(rawValue: activityRaw) ?? .walk }
        set { activityRaw = newValue.rawValue }
    }
    var points: [RoutePoint] { (try? JSONDecoder().decode([RoutePoint].self, from: pointsData)) ?? [] }
    var coordinates: [CLLocationCoordinate2D] { points.map(\.coordinate) }
}
