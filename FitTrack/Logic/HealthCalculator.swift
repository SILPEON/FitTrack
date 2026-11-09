import Foundation

enum Sex: String, CaseIterable, Identifiable {
    case male, female
    var id: String { rawValue }
    var label: String { self == .male ? "Male" : "Female" }
}

enum ActivityLevel: String, CaseIterable, Identifiable {
    case sedentary, light, moderate, active, veryActive
    var id: String { rawValue }

    /// Standard Harris-Benedict / Mifflin activity multipliers.
    var factor: Double {
        switch self {
        case .sedentary: 1.2
        case .light: 1.375
        case .moderate: 1.55
        case .active: 1.725
        case .veryActive: 1.9
        }
    }
    var label: String {
        switch self {
        case .sedentary: "Sedentary"
        case .light: "Lightly active"
        case .moderate: "Moderately active"
        case .active: "Very active"
        case .veryActive: "Extremely active"
        }
    }
    var detail: String {
        switch self {
        case .sedentary: "Desk job, little or no exercise"
        case .light: "Light exercise 1–3 days/week"
        case .moderate: "Moderate exercise 3–5 days/week"
        case .active: "Hard exercise 6–7 days/week"
        case .veryActive: "Physical job plus hard training"
        }
    }
}

enum GoalType: String, CaseIterable, Identifiable {
    case lose, maintain, gain
    var id: String { rawValue }
    var label: String {
        switch self {
        case .lose: "Lose"
        case .maintain: "Maintain"
        case .gain: "Gain"
        }
    }
}

struct NutritionTargets {
    var bmr: Double
    var tdee: Double
    var calories: Double
    var protein: Double
    var carbs: Double
    var fat: Double
    var fiber: Double
    var warnings: [String]
}

enum HealthCalculator {
    /// kcal stored in 1 kg of body weight change (commonly used approximation).
    static let kcalPerKg = 7700.0

    static func age(from birthDate: Date, now: Date = .now) -> Int {
        Calendar.current.dateComponents([.year], from: birthDate, to: now).year ?? 0
    }

    /// BMI = weight (kg) / height (m)²
    static func bmi(weightKg: Double, heightCm: Double) -> Double {
        let m = heightCm / 100
        guard m > 0 else { return 0 }
        return weightKg / (m * m)
    }

    /// WHO adult BMI classification.
    static func bmiCategory(_ bmi: Double) -> String {
        switch bmi {
        case ..<16: "Severely underweight"
        case ..<18.5: "Underweight"
        case ..<25: "Normal weight"
        case ..<30: "Overweight"
        case ..<35: "Obesity class I"
        case ..<40: "Obesity class II"
        default: "Obesity class III"
        }
    }

    /// Weight range corresponding to BMI 18.5–24.9 for the given height.
    static func healthyWeightRange(heightCm: Double) -> ClosedRange<Double> {
        let m2 = pow(heightCm / 100, 2)
        return (18.5 * m2)...(24.9 * m2)
    }

    /// Mifflin-St Jeor resting energy expenditure (kcal/day).
    static func bmr(weightKg: Double, heightCm: Double, age: Int, sex: Sex) -> Double {
        10 * weightKg + 6.25 * heightCm - 5 * Double(age) + (sex == .male ? 5 : -161)
    }

    /// Epley estimated one-rep max.
    static func oneRepMax(weight: Double, reps: Int) -> Double {
        guard reps > 0, weight > 0 else { return 0 }
        if reps == 1 { return weight }
        return weight * (1 + Double(reps) / 30)
    }

    static func weeksToGoal(currentKg: Double, targetKg: Double, weeklyChangeKg: Double) -> Double? {
        guard weeklyChangeKg > 0 else { return nil }
        return abs(currentKg - targetKg) / weeklyChangeKg
    }

    static func targets(profile: UserProfile, weightKg: Double) -> NutritionTargets {
        var warnings: [String] = []
        let age = age(from: profile.birthDate)
        let bmr = bmr(weightKg: weightKg, heightCm: profile.heightCm, age: age, sex: profile.sex)
        let tdee = bmr * profile.activity.factor

        let dailyDelta = profile.weeklyChangeKg * kcalPerKg / 7
        var calories: Double
        switch profile.goal {
        case .maintain:
            calories = tdee
        case .lose:
            calories = tdee - dailyDelta
            if profile.targetWeightKg >= weightKg {
                warnings.append("Your goal is to lose weight but your target weight isn't below your current weight.")
            }
            if profile.weeklyChangeKg > weightKg * 0.01 {
                warnings.append("Losing more than ~1% of body weight per week raises the risk of muscle loss.")
            }
        case .gain:
            calories = tdee + dailyDelta
            if profile.targetWeightKg <= weightKg {
                warnings.append("Your goal is to gain weight but your target weight isn't above your current weight.")
            }
            if profile.weeklyChangeKg > 0.5 {
                warnings.append("Gaining faster than ~0.25–0.5 kg per week mostly adds fat, not muscle.")
            }
        }

        let floor = profile.sex == .male ? 1500.0 : 1200.0
        if calories < floor {
            calories = floor
            warnings.append("Target raised to \(Int(floor)) kcal, a common minimum for unsupervised dieting. Choose a slower rate or talk to a doctor.")
        }

        // Protein: for BMI ≥ 30, base it on the weight at BMI 25 to avoid overestimating.
        let currentBMI = bmi(weightKg: weightKg, heightCm: profile.heightCm)
        var proteinBasis = weightKg
        if currentBMI >= 30 {
            proteinBasis = 25 * pow(profile.heightCm / 100, 2)
            warnings.append("Protein is based on an adjusted weight of \(Int(proteinBasis)) kg because BMI is 30 or more.")
        }
        let protein = profile.proteinPerKg * proteinBasis
        let fat = calories * profile.fatPercent / 100 / 9
        let carbs = max(0, (calories - protein * 4 - fat * 9) / 4)
        if carbs == 0 {
            warnings.append("Protein and fat use up all your calories. Lower the protein or fat setting.")
        }
        let fiber = calories / 1000 * 14

        return NutritionTargets(bmr: bmr, tdee: tdee, calories: calories, protein: protein,
                                carbs: carbs, fat: fat, fiber: fiber, warnings: warnings)
    }
}
