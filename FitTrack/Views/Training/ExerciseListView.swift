import SwiftUI
import SwiftData
import Charts

/// Searchable exercise database. With `onPick` set it acts as a picker; otherwise it's the library.
struct ExerciseListView: View {
    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss
    @Query(sort: \Exercise.name) private var exercises: [Exercise]
    var onPick: ((Exercise) -> Void)? = nil

    @State private var search = ""
    @State private var filter: MuscleGroup?
    @State private var showAdd = false

    private struct ExerciseGroup: Identifiable {
        let muscle: MuscleGroup
        let items: [Exercise]
        var id: String { muscle.rawValue }
    }

    private var groups: [ExerciseGroup] {
        let filtered = exercises.filter { ex in
            (filter == nil || ex.muscleGroupRaw == filter?.rawValue) &&
            (search.isEmpty || ex.name.localizedCaseInsensitiveContains(search))
        }
        return MuscleGroup.allCases.compactMap { muscle in
            let items = filtered.filter { $0.muscleGroupRaw == muscle.rawValue }
            return items.isEmpty ? nil : ExerciseGroup(muscle: muscle, items: items)
        }
    }

    var body: some View {
        List {
            ForEach(groups) { group in
                Section(group.muscle.rawValue) {
                    ForEach(group.items) { exercise in
                        row(exercise)
                    }
                }
            }
        }
        .overlay {
            if groups.isEmpty { ContentUnavailableView.search(text: search) }
        }
        .searchable(text: $search, prompt: "Search exercises")
        .navigationTitle(onPick == nil ? "Exercise Library" : "Add Exercise")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if onPick != nil {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
            ToolbarItemGroup(placement: .primaryAction) {
                Menu {
                    Picker("Muscle group", selection: $filter) {
                        Text("All").tag(MuscleGroup?.none)
                        ForEach(MuscleGroup.allCases) { Text($0.rawValue).tag(MuscleGroup?.some($0)) }
                    }
                } label: {
                    Image(systemName: filter == nil
                          ? "line.3.horizontal.decrease.circle"
                          : "line.3.horizontal.decrease.circle.fill")
                }
                Button {
                    showAdd = true
                } label: {
                    Image(systemName: "plus")
                }
            }
        }
        .sheet(isPresented: $showAdd) { AddExerciseView() }
    }

    @ViewBuilder
    private func row(_ exercise: Exercise) -> some View {
        if let onPick {
            Button {
                onPick(exercise)
            } label: {
                ExerciseRow(exercise: exercise)
            }
            .tint(.primary)
        } else {
            NavigationLink {
                ExerciseDetailView(exercise: exercise)
            } label: {
                ExerciseRow(exercise: exercise)
            }
            .swipeActions {
                if exercise.isCustom {
                    Button("Delete", role: .destructive) { context.delete(exercise) }
                }
            }
        }
    }
}

struct ExerciseRow: View {
    let exercise: Exercise

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            HStack {
                Text(exercise.name)
                if exercise.isCustom {
                    Text("Custom")
                        .font(.caption2.bold())
                        .padding(.horizontal, 6).padding(.vertical, 2)
                        .background(.tint.opacity(0.15), in: Capsule())
                }
            }
            Text(exercise.equipment).font(.caption).foregroundStyle(.secondary)
        }
    }
}

struct AddExerciseView: View {
    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var muscle: MuscleGroup = .chest
    @State private var equipment = "Barbell"

    var body: some View {
        NavigationStack {
            Form {
                TextField("Name", text: $name)
                Picker("Muscle group", selection: $muscle) {
                    ForEach(MuscleGroup.allCases) { Text($0.rawValue).tag($0) }
                }
                TextField("Equipment", text: $equipment)
            }
            .navigationTitle("New Exercise")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        context.insert(Exercise(name: name.trimmingCharacters(in: .whitespaces),
                                                muscleGroup: muscle, equipment: equipment, isCustom: true))
                        dismiss()
                    }
                    .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
        }
    }
}

struct ExerciseDetailView: View {
    let exercise: Exercise

    private struct HistoryPoint: Identifiable {
        let id: PersistentIdentifier
        let date: Date
        let e1rm: Double
        let top: Double
        let summary: String
    }

    private var history: [HistoryPoint] {
        exercise.entries.compactMap { entry in
            guard let date = entry.session?.date, !entry.sets.isEmpty else { return nil }
            return HistoryPoint(id: entry.persistentModelID, date: date, e1rm: entry.bestEstimated1RM,
                                top: entry.heaviestWeight, summary: entry.summary)
        }
        .sorted { $0.date > $1.date }
    }

    var body: some View {
        let history = history
        List {
            Section {
                LabeledContent("Muscle group", value: exercise.muscleGroup.rawValue)
                LabeledContent("Equipment", value: exercise.equipment)
            }

            if !history.isEmpty {
                Section("Personal records") {
                    LabeledContent("Heaviest weight", value: "\((history.map(\.top).max() ?? 0).clean) kg")
                    LabeledContent("Best estimated 1RM", value: "\((history.map(\.e1rm).max() ?? 0).clean) kg")
                }
            }

            if history.count >= 2 {
                Section("Estimated 1RM progress") {
                    Chart(Array(history.reversed())) { point in
                        LineMark(x: .value("Date", point.date), y: .value("kg", point.e1rm))
                            .interpolationMethod(.catmullRom)
                        PointMark(x: .value("Date", point.date), y: .value("kg", point.e1rm))
                    }
                    .chartYScale(domain: .automatic(includesZero: false))
                    .frame(height: 200)
                    .padding(.vertical, 8)
                }
            }

            Section("History") {
                if history.isEmpty {
                    Text("No sets logged yet.").foregroundStyle(.secondary)
                }
                ForEach(history) { point in
                    VStack(alignment: .leading, spacing: 2) {
                        Text(point.date, format: .dateTime.day().month().year()).font(.subheadline.bold())
                        Text(point.summary).font(.caption).foregroundStyle(.secondary)
                    }
                }
            }

            Section {
                Text("1RM is estimated with the Epley formula: weight × (1 + reps ÷ 30). It gets less accurate above about 10 reps.")
                    .font(.footnote).foregroundStyle(.secondary)
            }
        }
        .navigationTitle(exercise.name)
        .navigationBarTitleDisplayMode(.inline)
    }
}
