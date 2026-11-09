import SwiftUI
import SwiftData

struct WorkoutDetailView: View {
    @Environment(\.modelContext) private var context
    @Bindable var session: WorkoutSession
    @State private var showPicker = false

    var body: some View {
        List {
            Section {
                TextField("Workout name", text: $session.title)
                DatePicker("Date", selection: $session.date)
            }

            ForEach(session.sortedEntries) { entry in
                ExerciseEntrySection(entry: entry) {
                    session.entries.removeAll { $0.id == entry.id }
                    context.delete(entry)
                }
            }

            Section {
                Button {
                    showPicker = true
                } label: {
                    Label("Add exercise", systemImage: "plus.circle.fill")
                }
            }

            Section("Notes") {
                TextField("How did it go?", text: $session.notes, axis: .vertical)
                    .lineLimit(2...6)
            }

            Section {
                LabeledContent("Total sets", value: "\(session.totalSets)")
                LabeledContent("Total volume", value: "\(session.totalVolume.rounded0) kg")
            }
        }
        .navigationTitle(session.title.isEmpty ? "Workout" : session.title)
        .navigationBarTitleDisplayMode(.inline)
        .scrollDismissesKeyboard(.interactively)
        .keyboardDoneButton()
        .sheet(isPresented: $showPicker) {
            NavigationStack {
                ExerciseListView { exercise in
                    add(exercise)
                    showPicker = false
                }
            }
        }
    }

    private func add(_ exercise: Exercise) {
        let entry = ExerciseEntry(order: (session.entries.map(\.order).max() ?? -1) + 1)
        context.insert(entry)
        entry.exercise = exercise
        session.entries.append(entry)

        // Prefill with what you did last time so you only adjust numbers.
        if let previous = entry.previousEntry() {
            for s in previous.sortedSets {
                let set = SetEntry(order: s.order, reps: s.reps, weight: s.weight)
                context.insert(set)
                entry.sets.append(set)
            }
        } else {
            let set = SetEntry(order: 0, reps: 10, weight: 0)
            context.insert(set)
            entry.sets.append(set)
        }
    }
}

struct ExerciseEntrySection: View {
    @Environment(\.modelContext) private var context
    @Bindable var entry: ExerciseEntry
    var onRemove: () -> Void

    var body: some View {
        Section {
            if let previous = entry.previousEntry() {
                Text("Last time: \(previous.summary)")
                    .font(.caption).foregroundStyle(.secondary)
            }

            let sets = entry.sortedSets
            ForEach(Array(sets.enumerated()), id: \.element.id) { item in
                SetRow(index: item.offset + 1, set: item.element)
            }
            .onDelete { offsets in
                for i in offsets {
                    let s = sets[i]
                    entry.sets.removeAll { $0.id == s.id }
                    context.delete(s)
                }
            }

            Button {
                addSet()
            } label: {
                Label("Add set", systemImage: "plus")
            }
        } header: {
            HStack {
                Text(entry.exercise?.name ?? "Deleted exercise")
                Spacer()
                Menu {
                    Button("Remove exercise", systemImage: "trash", role: .destructive, action: onRemove)
                } label: {
                    Image(systemName: "ellipsis.circle")
                }
            }
        }
    }

    private func addSet() {
        let last = entry.sortedSets.last
        let set = SetEntry(order: (last?.order ?? -1) + 1, reps: last?.reps ?? 10, weight: last?.weight ?? 0)
        context.insert(set)
        entry.sets.append(set)
    }
}

struct SetRow: View {
    let index: Int
    @Bindable var set: SetEntry

    var body: some View {
        HStack(spacing: 8) {
            Text("\(index)")
                .font(.headline.monospacedDigit())
                .foregroundStyle(.secondary)
                .frame(width: 24)
            TextField("Reps", value: $set.reps, format: .number)
                .keyboardType(.numberPad)
                .multilineTextAlignment(.center)
                .textFieldStyle(.roundedBorder)
                .frame(width: 64)
            Text("reps").foregroundStyle(.secondary)
            Spacer()
            TextField("Weight", value: $set.weight, format: .number)
                .keyboardType(.decimalPad)
                .multilineTextAlignment(.center)
                .textFieldStyle(.roundedBorder)
                .frame(width: 80)
            Text("kg").foregroundStyle(.secondary)
        }
    }
}
