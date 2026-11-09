import SwiftUI
import SwiftData

struct ProfileView: View {
    @Environment(\.modelContext) private var context
    @Query private var profiles: [UserProfile]
    @Query(sort: \WeightEntry.date, order: .reverse) private var weights: [WeightEntry]

    var body: some View {
        NavigationStack {
            Group {
                if let profile = profiles.first {
                    ProfileForm(profile: profile, currentWeight: weights.first?.weight)
                } else {
                    ProgressView().onAppear { context.insert(UserProfile()) }
                }
            }
            .navigationTitle("Profile & Goals")
        }
    }
}

struct ProfileForm: View {
    @Bindable var profile: UserProfile
    let currentWeight: Double?

    var body: some View {
        Form {
            Section("About you") {
                Picker("Sex", selection: $profile.sex) {
                    ForEach(Sex.allCases) { Text($0.label).tag($0) }
                }
                .pickerStyle(.segmented)
                DatePicker("Birthday", selection: $profile.birthDate, in: ...Date.now, displayedComponents: .date)
                HStack {
                    Text("Height")
                    Spacer()
                    TextField("cm", value: $profile.heightCm, format: .number)
                        .keyboardType(.decimalPad)
                        .multilineTextAlignment(.trailing)
                        .frame(width: 80)
                    Text("cm").foregroundStyle(.secondary)
                }
                Picker("Activity", selection: $profile.activity) {
                    ForEach(ActivityLevel.allCases) { level in
                        VStack(alignment: .leading) {
                            Text(level.label)
                            Text(level.detail).font(.caption).foregroundStyle(.secondary)
                        }
                        .tag(level)
                    }
                }
                .pickerStyle(.navigationLink)
            }

            Section("Goal") {
                Picker("Goal", selection: $profile.goal) {
                    ForEach(GoalType.allCases) { Text($0.label).tag($0) }
                }
                .pickerStyle(.segmented)

                if profile.goal != .maintain {
                    HStack {
                        Text("Target weight")
                        Spacer()
                        TextField("kg", value: $profile.targetWeightKg, format: .number)
                            .keyboardType(.decimalPad)
                            .multilineTextAlignment(.trailing)
                            .frame(width: 80)
                        Text("kg").foregroundStyle(.secondary)
                    }
                    Stepper(value: $profile.weeklyChangeKg, in: 0.1...1.0, step: 0.05) {
                        LabeledContent("Rate per week",
                                       value: "\(profile.weeklyChangeKg.formatted(.number.precision(.fractionLength(2)))) kg")
                    }
                }
            }

            Section {
                Stepper(value: $profile.proteinPerKg, in: 1.2...2.6, step: 0.1) {
                    LabeledContent("Protein", value: "\(profile.proteinPerKg.formatted(.number.precision(.fractionLength(1)))) g/kg")
                }
                Stepper(value: $profile.fatPercent, in: 20...40, step: 5) {
                    LabeledContent("Fat", value: "\(profile.fatPercent.rounded0) % of kcal")
                }
            } header: {
                Text("Macro settings")
            } footer: {
                Text("1.6–2.2 g protein per kg supports muscle gain and keeps muscle during a diet. Fat between 20 and 35 % of calories is the usual recommendation. Carbs fill the rest.")
            }

            if let weight = currentWeight {
                results(weight: weight)
            } else {
                Section {
                    Text("Log your weight in the Weight tab to see your BMI and calorie targets.")
                        .foregroundStyle(.secondary)
                }
            }

            Section("How this is calculated") {
                Text("""
                • BMI = weight ÷ height² (WHO categories). BMI doesn't account for muscle mass, so it overrates heavily muscled people.
                • BMR uses the Mifflin-St Jeor equation, generally the most accurate prediction equation for adults.
                • Maintenance (TDEE) = BMR × activity factor (1.2–1.9).
                • Goal calories = TDEE ± (weekly rate × 7700 kcal ÷ 7).
                • These are estimates: adjust after 2–3 weeks based on your real weight trend.
                """)
                .font(.footnote)
                .foregroundStyle(.secondary)
            }
        }
        .keyboardDoneButton()
    }

    @ViewBuilder
    private func results(weight: Double) -> some View {
        let bmi = HealthCalculator.bmi(weightKg: weight, heightCm: profile.heightCm)
        let healthy = HealthCalculator.healthyWeightRange(heightCm: profile.heightCm)
        let t = HealthCalculator.targets(profile: profile, weightKg: weight)

        Section("Body") {
            LabeledContent("Current weight", value: "\(weight.clean) kg")
            LabeledContent("Age", value: "\(HealthCalculator.age(from: profile.birthDate))")
            LabeledContent("BMI", value: bmi.formatted(.number.precision(.fractionLength(1))))
            LabeledContent("Category", value: HealthCalculator.bmiCategory(bmi))
            LabeledContent("Healthy weight range", value: "\(healthy.lowerBound.clean)–\(healthy.upperBound.clean) kg")
        }

        Section("Daily energy") {
            LabeledContent("BMR (at rest)", value: "\(t.bmr.rounded0) kcal")
            LabeledContent("Maintenance", value: "\(t.tdee.rounded0) kcal")
            LabeledContent("Your target") {
                Text("\(t.calories.rounded0) kcal").bold().foregroundStyle(.tint)
            }
            if profile.goal != .maintain,
               let weeks = HealthCalculator.weeksToGoal(currentKg: weight, targetKg: profile.targetWeightKg,
                                                         weeklyChangeKg: profile.weeklyChangeKg),
               let eta = Calendar.current.date(byAdding: .day, value: Int(weeks * 7), to: .now) {
                LabeledContent("Time to goal", value: "≈ \(Int(weeks.rounded())) weeks")
                LabeledContent("Estimated date", value: eta.formatted(.dateTime.day().month().year()))
            }
        }

        Section("Daily macros") {
            LabeledContent("Protein", value: "\(t.protein.rounded0) g")
            LabeledContent("Carbohydrates", value: "\(t.carbs.rounded0) g")
            LabeledContent("Fat", value: "\(t.fat.rounded0) g")
            LabeledContent("Fiber (min.)", value: "\(t.fiber.rounded0) g")
        }

        if !t.warnings.isEmpty {
            Section("Heads up") {
                ForEach(t.warnings, id: \.self) { w in
                    Label(w, systemImage: "exclamationmark.triangle.fill")
                        .font(.footnote)
                        .foregroundStyle(.orange)
                }
            }
        }
    }
}
