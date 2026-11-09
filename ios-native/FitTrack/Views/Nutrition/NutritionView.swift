import SwiftUI
import SwiftData

struct NutritionView: View {
    @State private var day = Calendar.current.startOfDay(for: .now)
    @Query private var profiles: [UserProfile]
    @Query(sort: \WeightEntry.date, order: .reverse) private var weights: [WeightEntry]

    private var targets: NutritionTargets? {
        guard let profile = profiles.first, let weight = weights.first?.weight else { return nil }
        return HealthCalculator.targets(profile: profile, weightKg: weight)
    }

    var body: some View {
        NavigationStack {
            DayNutritionList(day: day, targets: targets)
                .navigationTitle("Nutrition")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .principal) {
                        HStack(spacing: 4) {
                            Button { shift(-1) } label: { Image(systemName: "chevron.left") }
                            DatePicker("Day", selection: $day, displayedComponents: .date)
                                .labelsHidden()
                            Button { shift(1) } label: { Image(systemName: "chevron.right") }
                        }
                    }
                }
        }
    }

    private func shift(_ days: Int) {
        if let d = Calendar.current.date(byAdding: .day, value: days, to: day) {
            day = Calendar.current.startOfDay(for: d)
        }
    }
}

struct NutrientTotals {
    var kcal = 0.0, protein = 0.0, carbs = 0.0, fat = 0.0, fiber = 0.0

    init(_ entries: [FoodEntry] = []) {
        for e in entries {
            kcal += e.kcal; protein += e.protein; carbs += e.carbs; fat += e.fat; fiber += e.fiber
        }
    }
}

struct DayNutritionList: View {
    @Environment(\.modelContext) private var context
    @Query private var entries: [FoodEntry]
    let day: Date
    let targets: NutritionTargets?
    @State private var addMeal: Meal?

    init(day: Date, targets: NutritionTargets?) {
        self.day = day
        self.targets = targets
        let start = Calendar.current.startOfDay(for: day)
        let end = Calendar.current.date(byAdding: .day, value: 1, to: start) ?? start.addingTimeInterval(86_400)
        _entries = Query(filter: #Predicate<FoodEntry> { $0.date >= start && $0.date < end },
                         sort: \FoodEntry.date)
    }

    var body: some View {
        List {
            Section {
                NutritionSummary(totals: NutrientTotals(entries), targets: targets)
            }

            ForEach(Meal.allCases) { meal in
                let items = entries.filter { $0.mealRaw == meal.rawValue }
                Section {
                    ForEach(items) { item in
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(item.name)
                                Text("\(item.grams.rounded0) g · P \(item.protein.rounded0) · C \(item.carbs.rounded0) · F \(item.fat.rounded0)")
                                    .font(.caption).foregroundStyle(.secondary)
                            }
                            Spacer()
                            Text("\(item.kcal.rounded0) kcal").monospacedDigit().foregroundStyle(.secondary)
                        }
                    }
                    .onDelete { offsets in
                        for i in offsets { context.delete(items[i]) }
                    }
                    Button {
                        addMeal = meal
                    } label: {
                        Label("Add food", systemImage: "plus")
                    }
                } header: {
                    HStack {
                        Text(meal.label)
                        Spacer()
                        Text("\(NutrientTotals(items).kcal.rounded0) kcal")
                    }
                }
            }
        }
        .sheet(item: $addMeal) { meal in
            AddFoodView(meal: meal, day: day)
        }
    }
}

struct NutritionSummary: View {
    let totals: NutrientTotals
    let targets: NutritionTargets?

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            if let targets {
                let left = targets.calories - totals.kcal
                HStack(alignment: .firstTextBaseline) {
                    Text(totals.kcal.rounded0).font(.system(size: 36, weight: .bold, design: .rounded))
                    Text("/ \(targets.calories.rounded0) kcal").foregroundStyle(.secondary)
                    Spacer()
                    Text(left >= 0 ? "\(left.rounded0) left" : "\((-left).rounded0) over")
                        .font(.headline)
                        .foregroundStyle(left >= 0 ? Color.green : Color.red)
                }
                ProgressView(value: min(totals.kcal / max(targets.calories, 1), 1))
                    .tint(left >= 0 ? .green : .red)
                MacroBar(label: "Protein", value: totals.protein, target: targets.protein, color: .blue)
                MacroBar(label: "Carbs", value: totals.carbs, target: targets.carbs, color: .orange)
                MacroBar(label: "Fat", value: totals.fat, target: targets.fat, color: .pink)
                MacroBar(label: "Fiber", value: totals.fiber, target: targets.fiber, color: .brown)
            } else {
                Text("\(totals.kcal.rounded0) kcal").font(.title.bold())
                Text("P \(totals.protein.rounded0) g · C \(totals.carbs.rounded0) g · F \(totals.fat.rounded0) g · Fiber \(totals.fiber.rounded0) g")
                    .font(.subheadline).foregroundStyle(.secondary)
                Text("Fill in the Profile tab and log your weight to get daily targets.")
                    .font(.footnote).foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 4)
    }
}

struct MacroBar: View {
    let label: String
    let value: Double
    let target: Double
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(label).font(.subheadline)
                Spacer()
                Text("\(value.rounded0) / \(target.rounded0) g").font(.subheadline.monospacedDigit()).foregroundStyle(.secondary)
            }
            ProgressView(value: min(value / max(target, 1), 1)).tint(color)
        }
    }
}
