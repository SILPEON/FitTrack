import SwiftUI
import SwiftData
import Charts

struct WeightView: View {
    @Environment(\.modelContext) private var context
    @Query(sort: \WeightEntry.date, order: .reverse) private var entries: [WeightEntry]
    @Query private var profiles: [UserProfile]
    @State private var showAdd = false
    @State private var range: ChartRange = .threeMonths

    enum ChartRange: String, CaseIterable, Identifiable {
        case month = "1M", threeMonths = "3M", year = "1Y", all = "All"
        var id: String { rawValue }
        var days: Int? {
            switch self {
            case .month: 30
            case .threeMonths: 90
            case .year: 365
            case .all: nil
            }
        }
    }

    private var profile: UserProfile? { profiles.first }

    private var chartEntries: [WeightEntry] {
        guard let days = range.days,
              let cutoff = Calendar.current.date(byAdding: .day, value: -days, to: .now) else {
            return entries.reversed()
        }
        return entries.filter { $0.date >= cutoff }.reversed()
    }

    /// Average of the entries from the last 7 days (smooths out water-weight swings).
    private var sevenDayAverage: Double? {
        guard let cutoff = Calendar.current.date(byAdding: .day, value: -7, to: .now) else { return nil }
        let recent = entries.filter { $0.date >= cutoff }
        guard !recent.isEmpty else { return nil }
        return recent.map(\.weight).reduce(0, +) / Double(recent.count)
    }

    var body: some View {
        NavigationStack {
            List {
                if let latest = entries.first {
                    Section { summary(latest: latest) }
                }

                if chartEntries.count >= 2 {
                    Section("Trend") {
                        Picker("Range", selection: $range) {
                            ForEach(ChartRange.allCases) { Text($0.rawValue).tag($0) }
                        }
                        .pickerStyle(.segmented)
                        chart
                    }
                }

                Section("Log") {
                    if entries.isEmpty {
                        ContentUnavailableView("No weight logged",
                                               systemImage: "scalemass",
                                               description: Text("Tap + to add your first weigh-in."))
                    }
                    ForEach(entries) { entry in
                        HStack {
                            Text(entry.date, format: .dateTime.day().month().year())
                            Spacer()
                            Text("\(entry.weight.clean) kg").monospacedDigit()
                        }
                    }
                    .onDelete { offsets in
                        for i in offsets { context.delete(entries[i]) }
                    }
                }
            }
            .navigationTitle("Weight")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { showAdd = true } label: { Image(systemName: "plus") }
                }
            }
            .sheet(isPresented: $showAdd) {
                AddWeightView(lastWeight: entries.first?.weight)
            }
        }
    }

    @ViewBuilder
    private func summary(latest: WeightEntry) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .firstTextBaseline) {
                Text(latest.weight.clean).font(.system(size: 44, weight: .bold, design: .rounded))
                Text("kg").font(.title3).foregroundStyle(.secondary)
                Spacer()
                if let first = entries.last, entries.count > 1 {
                    let diff = latest.weight - first.weight
                    VStack(alignment: .trailing) {
                        Text("\(diff >= 0 ? "+" : "")\(diff.clean) kg")
                            .font(.headline)
                            .foregroundStyle(diff <= 0 ? Color.green : Color.orange)
                        Text("since \(first.date.formatted(.dateTime.day().month()))")
                            .font(.caption).foregroundStyle(.secondary)
                    }
                }
            }

            if let avg = sevenDayAverage {
                LabeledContent("7-day average", value: "\(avg.clean) kg")
            }

            if let profile {
                let bmi = HealthCalculator.bmi(weightKg: latest.weight, heightCm: profile.heightCm)
                let healthy = HealthCalculator.healthyWeightRange(heightCm: profile.heightCm)
                LabeledContent("BMI", value: "\(bmi.formatted(.number.precision(.fractionLength(1)))) · \(HealthCalculator.bmiCategory(bmi))")
                LabeledContent("Healthy range for \(profile.heightCm.rounded0) cm",
                               value: "\(healthy.lowerBound.clean)–\(healthy.upperBound.clean) kg")
                if profile.goal != .maintain {
                    let remaining = profile.targetWeightKg - latest.weight
                    LabeledContent("Target", value: "\(profile.targetWeightKg.clean) kg (\(remaining >= 0 ? "+" : "")\(remaining.clean))")
                }
            }
        }
        .padding(.vertical, 4)
    }

    private var chart: some View {
        let data = chartEntries
        let target = (profile?.goal ?? .maintain) == .maintain ? nil : profile?.targetWeightKg
        var values = data.map(\.weight)
        if let target { values.append(target) }
        let lower = (values.min() ?? 0) - 1
        let upper = (values.max() ?? 100) + 1

        return Chart {
            ForEach(data) { entry in
                LineMark(x: .value("Date", entry.date), y: .value("kg", entry.weight))
                    .interpolationMethod(.catmullRom)
                PointMark(x: .value("Date", entry.date), y: .value("kg", entry.weight))
                    .symbolSize(20)
            }
            if let target {
                RuleMark(y: .value("Target", target))
                    .foregroundStyle(.green)
                    .lineStyle(StrokeStyle(lineWidth: 1, dash: [5, 4]))
                    .annotation(position: .top, alignment: .leading) {
                        Text("Goal").font(.caption2).foregroundStyle(.green)
                    }
            }
        }
        .chartYScale(domain: lower...upper)
        .frame(height: 220)
        .padding(.vertical, 8)
    }
}

struct AddWeightView: View {
    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss
    @State private var date = Date.now
    @State private var weight: Double?

    init(lastWeight: Double?) {
        _weight = State(initialValue: lastWeight)
    }

    var body: some View {
        NavigationStack {
            Form {
                DatePicker("Date", selection: $date, in: ...Date.now)
                HStack {
                    Text("Weight")
                    Spacer()
                    TextField("0.0", value: $weight, format: .number)
                        .keyboardType(.decimalPad)
                        .multilineTextAlignment(.trailing)
                        .frame(width: 100)
                    Text("kg").foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Log Weight")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        if let weight { context.insert(WeightEntry(date: date, weight: weight)) }
                        dismiss()
                    }
                    .disabled((weight ?? 0) <= 0)
                }
            }
        }
        .presentationDetents([.medium])
    }
}
