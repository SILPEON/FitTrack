import SwiftUI
import SwiftData

struct TrainingView: View {
    @Environment(\.modelContext) private var context
    @Query(sort: \WorkoutSession.date, order: .reverse) private var sessions: [WorkoutSession]
    @State private var path = NavigationPath()

    var body: some View {
        NavigationStack(path: $path) {
            List {
                Section {
                    NavigationLink {
                        ExerciseListView()
                    } label: {
                        Label("Exercise Library", systemImage: "books.vertical.fill")
                    }
                }

                Section("Workouts") {
                    if sessions.isEmpty {
                        ContentUnavailableView("No workouts yet",
                                               systemImage: "dumbbell",
                                               description: Text("Tap + to log your first workout."))
                    }
                    ForEach(sessions) { session in
                        NavigationLink(value: session) {
                            WorkoutRow(session: session)
                        }
                        .contextMenu {
                            Button {
                                repeatWorkout(session)
                            } label: {
                                Label("Repeat this workout", systemImage: "arrow.clockwise")
                            }
                        }
                    }
                    .onDelete { offsets in
                        for i in offsets { context.delete(sessions[i]) }
                    }
                }
            }
            .navigationTitle("Training")
            .navigationDestination(for: WorkoutSession.self) { WorkoutDetailView(session: $0) }
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        let session = WorkoutSession()
                        context.insert(session)
                        path.append(session)
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
        }
    }

    /// Creates a new workout today with the same exercises and set values.
    private func repeatWorkout(_ old: WorkoutSession) {
        let new = WorkoutSession(title: old.title)
        context.insert(new)
        for oldEntry in old.sortedEntries {
            let entry = ExerciseEntry(order: oldEntry.order)
            context.insert(entry)
            entry.exercise = oldEntry.exercise
            new.entries.append(entry)
            for s in oldEntry.sortedSets {
                let set = SetEntry(order: s.order, reps: s.reps, weight: s.weight)
                context.insert(set)
                entry.sets.append(set)
            }
        }
        path.append(new)
    }
}

struct WorkoutRow: View {
    let session: WorkoutSession

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(session.title).font(.headline)
                Spacer()
                Text(session.date, format: .dateTime.day().month().year())
                    .font(.subheadline).foregroundStyle(.secondary)
            }
            Text(session.sortedEntries.compactMap { $0.exercise?.name }.joined(separator: " · "))
                .font(.caption).foregroundStyle(.secondary).lineLimit(2)
            Text("\(session.totalSets) sets · \(session.totalVolume.rounded0) kg volume")
                .font(.caption2).foregroundStyle(.tertiary)
        }
        .padding(.vertical, 2)
    }
}
