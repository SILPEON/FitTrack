import SwiftUI
import UIKit
import SwiftData

extension Double {
    /// Number without trailing ".0", max one decimal.
    var clean: String { formatted(.number.precision(.fractionLength(0...1))) }
    var rounded0: String { formatted(.number.precision(.fractionLength(0))) }
}

enum Fmt {
    static func distance(_ meters: Double) -> String {
        meters >= 1000
            ? (meters / 1000).formatted(.number.precision(.fractionLength(2))) + " km"
            : "\(Int(meters)) m"
    }

    static func duration(_ seconds: TimeInterval) -> String {
        let t = max(0, Int(seconds))
        let h = t / 3600, m = (t % 3600) / 60, s = t % 60
        return h > 0 ? String(format: "%d:%02d:%02d", h, m, s) : String(format: "%02d:%02d", m, s)
    }

    static func pace(distance: Double, time: TimeInterval) -> String {
        guard distance > 50, time > 0 else { return "–" }
        return duration(time / (distance / 1000)) + " /km"
    }

    static func speed(distance: Double, time: TimeInterval) -> String {
        guard time > 0 else { return "–" }
        return (distance / time * 3.6).formatted(.number.precision(.fractionLength(1))) + " km/h"
    }
}

extension View {
    /// Adds a "Done" button above the keyboard so number pads can be dismissed.
    func keyboardDoneButton() -> some View {
        toolbar {
            ToolbarItemGroup(placement: .keyboard) {
                Spacer()
                Button("Done") {
                    UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
                }
            }
        }
    }
}

enum Seeder {
    @MainActor
    static func seedIfNeeded(context: ModelContext) {
        if ((try? context.fetchCount(FetchDescriptor<Exercise>())) ?? 0) == 0 {
            for e in ExerciseSeed.all {
                context.insert(Exercise(name: e.0, muscleGroup: e.1, equipment: e.2))
            }
        }
        if ((try? context.fetchCount(FetchDescriptor<FoodItem>())) ?? 0) == 0 {
            for f in FoodSeed.all {
                context.insert(FoodItem(name: f.0, kcal: f.1, protein: f.2, carbs: f.3, fat: f.4, fiber: f.5))
            }
        }
        if ((try? context.fetchCount(FetchDescriptor<UserProfile>())) ?? 0) == 0 {
            context.insert(UserProfile())
        }
        try? context.save()
    }
}
