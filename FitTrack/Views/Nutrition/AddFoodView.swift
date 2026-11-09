import SwiftUI
import SwiftData

struct AddFoodView: View {
    @Environment(\.dismiss) private var dismiss
    let meal: Meal
    let day: Date
    @State private var mode = 0

    /// Timestamp for the new entry: now if logging today, otherwise midday of the chosen day.
    private var entryDate: Date {
        let cal = Calendar.current
        if cal.isDateInToday(day) { return .now }
        return cal.date(byAdding: .hour, value: 12, to: cal.startOfDay(for: day)) ?? day
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                Picker("Mode", selection: $mode) {
                    Text("Food database").tag(0)
                    Text("Manual entry").tag(1)
                }
                .pickerStyle(.segmented)
                .padding(.horizontal)
                .padding(.bottom, 8)

                if mode == 0 {
                    FoodSearchList(meal: meal, date: entryDate) { dismiss() }
                } else {
                    ManualFoodForm(meal: meal, date: entryDate) { dismiss() }
                }
            }
            .navigationTitle("Add to \(meal.label)")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
            }
            .keyboardDoneButton()
        }
    }
}

struct FoodSearchList: View {
    @Environment(\.modelContext) private var context
    @Query(sort: \FoodItem.name) private var foods: [FoodItem]
    let meal: Meal
    let date: Date
    let onDone: () -> Void
    @State private var search = ""

    private var recent: [FoodItem] {
        foods.filter { $0.lastUsed != nil }
            .sorted { ($0.lastUsed ?? .distantPast) > ($1.lastUsed ?? .distantPast) }
            .prefix(8).map { $0 }
    }

    private var filtered: [FoodItem] {
        search.isEmpty ? foods : foods.filter { $0.name.localizedCaseInsensitiveContains(search) }
    }

    var body: some View {
        List {
            if search.isEmpty && !recent.isEmpty {
                Section("Recent") {
                    ForEach(recent) { link(for: $0) }
                }
            }
            Section(search.isEmpty ? "All foods (per 100 g)" : "Results") {
                ForEach(filtered) { food in
                    link(for: food)
                        .swipeActions {
                            if food.isCustom {
                                Button("Delete", role: .destructive) { context.delete(food) }
                            }
                        }
                }
            }
        }
        .searchable(text: $search, prompt: "Search foods")
    }

    private func link(for food: FoodItem) -> some View {
        NavigationLink {
            FoodAmountView(food: food, meal: meal, date: date, onDone: onDone)
        } label: {
            VStack(alignment: .leading, spacing: 2) {
                Text(food.name)
                Text("\(food.kcal.rounded0) kcal · P \(food.protein.clean) · C \(food.carbs.clean) · F \(food.fat.clean)")
                    .font(.caption).foregroundStyle(.secondary)
            }
        }
    }
}

struct FoodAmountView: View {
    @Environment(\.modelContext) private var context
    let food: FoodItem
    let meal: Meal
    let date: Date
    let onDone: () -> Void
    @State private var grams: Double? = 100

    private var factor: Double { (grams ?? 0) / 100 }

    var body: some View {
        Form {
            Section("Amount") {
                HStack {
                    TextField("Grams", value: $grams, format: .number)
                        .keyboardType(.decimalPad)
                        .font(.title2)
                    Text("g").foregroundStyle(.secondary)
                }
                HStack {
                    ForEach([30.0, 50, 100, 150, 200, 250], id: \.self) { g in
                        Button("\(Int(g))") { grams = g }
                            .buttonStyle(.bordered)
                            .controlSize(.small)
                    }
                }
            }
            Section("Nutrients for this amount") {
                LabeledContent("Calories", value: "\((food.kcal * factor).rounded0) kcal")
                LabeledContent("Protein", value: "\((food.protein * factor).clean) g")
                LabeledContent("Carbohydrates", value: "\((food.carbs * factor).clean) g")
                LabeledContent("Fat", value: "\((food.fat * factor).clean) g")
                LabeledContent("Fiber", value: "\((food.fiber * factor).clean) g")
            }
            Section {
                Button("Add to \(meal.label)") {
                    let g = grams ?? 0
                    context.insert(FoodEntry(date: date, meal: meal, name: food.name, grams: g,
                                             kcal: food.kcal * factor, protein: food.protein * factor,
                                             carbs: food.carbs * factor, fat: food.fat * factor,
                                             fiber: food.fiber * factor))
                    food.lastUsed = .now
                    onDone()
                }
                .disabled((grams ?? 0) <= 0)
                .frame(maxWidth: .infinity)
                .bold()
            }
        }
        .navigationTitle(food.name)
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct ManualFoodForm: View {
    @Environment(\.modelContext) private var context
    let meal: Meal
    let date: Date
    let onDone: () -> Void

    @State private var name = ""
    @State private var grams: Double? = 100
    @State private var kcal: Double?
    @State private var protein: Double?
    @State private var carbs: Double?
    @State private var fat: Double?
    @State private var fiber: Double?
    @State private var saveToDatabase = true

    var body: some View {
        Form {
            Section {
                TextField("Food name", text: $name)
                numberRow("Amount", value: $grams, unit: "g")
            }
            Section("Nutrients for this amount (from the label)") {
                numberRow("Calories", value: $kcal, unit: "kcal")
                numberRow("Protein", value: $protein, unit: "g")
                numberRow("Carbohydrates", value: $carbs, unit: "g")
                numberRow("Fat", value: $fat, unit: "g")
                numberRow("Fiber", value: $fiber, unit: "g")
            }
            Section {
                Toggle("Save to my food database", isOn: $saveToDatabase)
                    .disabled((grams ?? 0) <= 0)
            } footer: {
                Text("Saved foods are stored per 100 g so you can log any amount later.")
            }
            Section {
                Button("Add to \(meal.label)") { save() }
                    .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty || kcal == nil)
                    .frame(maxWidth: .infinity)
                    .bold()
            }
        }
    }

    private func numberRow(_ label: String, value: Binding<Double?>, unit: String) -> some View {
        HStack {
            Text(label)
            Spacer()
            TextField("0", value: value, format: .number)
                .keyboardType(.decimalPad)
                .multilineTextAlignment(.trailing)
                .frame(width: 90)
            Text(unit).foregroundStyle(.secondary).frame(width: 36, alignment: .leading)
        }
    }

    private func save() {
        let g = grams ?? 0
        let trimmed = name.trimmingCharacters(in: .whitespaces)
        context.insert(FoodEntry(date: date, meal: meal, name: trimmed, grams: g,
                                 kcal: kcal ?? 0, protein: protein ?? 0, carbs: carbs ?? 0,
                                 fat: fat ?? 0, fiber: fiber ?? 0))
        if saveToDatabase && g > 0 {
            let f = 100 / g
            let item = FoodItem(name: trimmed, kcal: (kcal ?? 0) * f, protein: (protein ?? 0) * f,
                                carbs: (carbs ?? 0) * f, fat: (fat ?? 0) * f, fiber: (fiber ?? 0) * f,
                                isCustom: true)
            item.lastUsed = .now
            context.insert(item)
        }
        onDone()
    }
}
