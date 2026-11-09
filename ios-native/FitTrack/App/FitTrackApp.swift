import SwiftUI
import SwiftData

@main
struct FitTrackApp: App {
    @State private var tracker = LocationTracker()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(tracker)
        }
        .modelContainer(for: [
            Exercise.self,
            WorkoutSession.self,
            ExerciseEntry.self,
            SetEntry.self,
            WeightEntry.self,
            FoodItem.self,
            FoodEntry.self,
            UserProfile.self,
            Route.self
        ])
    }
}

struct ContentView: View {
    @Environment(\.modelContext) private var context

    var body: some View {
        TabView {
            Tab("Training", systemImage: "dumbbell.fill") { TrainingView() }
            Tab("Weight", systemImage: "scalemass.fill") { WeightView() }
            Tab("Nutrition", systemImage: "fork.knife") { NutritionView() }
            Tab("Routes", systemImage: "map.fill") { RoutesView() }
            Tab("Profile", systemImage: "person.crop.circle") { ProfileView() }
        }
        .task { Seeder.seedIfNeeded(context: context) }
    }
}
