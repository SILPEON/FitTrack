# FitTrack

A native SwiftUI fitness tracker for iPhone. All data stays on the device (SwiftData). No accounts, no server.

| Tab | What it does |
|---|---|
| **Training** | ~95 built-in exercises (searchable, filter by muscle group) plus your own custom ones. Log workouts with sets × reps × kg. When you add an exercise it's prefilled with what you did last time, and shows "Last time: …". Each exercise has history, PRs and an estimated-1RM chart. Long-press a workout to repeat it. |
| **Weight** | Log weigh-ins, trend chart (1M/3M/1Y/All) with your goal line, 7-day average, BMI and healthy range. |
| **Nutrition** | Daily log by meal. Built-in database of ~75 common foods (per 100 g), custom foods, manual entry. Calories, protein, carbs, fat and fiber compared with your targets. |
| **Routes** | Record walks/runs/rides with GPS (keeps recording with the screen locked). Shows time, distance, pace/speed and elevation gain. Plan routes by tapping waypoints on the map (optionally snapped to paths), then follow them while recording. GPX export. |
| **Profile** | Sex, birthday, height, activity level, goal, rate, macro settings. Shows BMI, BMR, maintenance calories, target calories, macros and time to goal. |

## Formulas
- **BMI** = kg / m², WHO categories
- **BMR**: Mifflin-St Jeor: `10·kg + 6.25·cm − 5·age + 5` (male) / `−161` (female)
- **Maintenance (TDEE)** = BMR × activity factor (1.2 / 1.375 / 1.55 / 1.725 / 1.9)
- **Goal calories** = TDEE ± weekly rate × 7700 kcal / 7. Floor of 1500 (male) / 1200 (female) kcal.
- **Protein** = g/kg setting × body weight (uses weight at BMI 25 if BMI ≥ 30). **Fat** = % of kcal. **Carbs** = the rest. **Fiber** = 14 g per 1000 kcal.
- **1RM**: Epley: `weight × (1 + reps/30)`

## Install on your iPhone

You need a **Mac with Xcode 26 or newer** (free from the Mac App Store). There is no way to install a self-built iOS app without a Mac.

1. Copy this `FitTrack` folder to the Mac and double-click `FitTrack.xcodeproj`.
2. In Xcode: **Settings → Accounts → +**, then sign in with your Apple ID.
3. Click the **FitTrack** project (blue icon), then the **FitTrack** target, then **Signing & Capabilities**:
   - Team: choose your Apple ID ("Personal Team")
   - Bundle Identifier: change `com.yourname.fittrack` to something unique, e.g. `com.<yourname>.fittrack`
4. Plug in the iPhone with a USB-C cable and tap **Trust** on the phone.
5. On the iPhone: **Settings → Privacy & Security → Developer Mode → On** (the phone restarts).
6. In Xcode, pick your iPhone in the device menu at the top and press **▶ Run** (⌘R).
7. The first time, the iPhone will block the app. Go to **Settings → General → VPN & Device Management**, tap your Apple ID and choose **Trust**.

**Free Apple ID limitation:** the app stops opening after **7 days**. Re-run it from Xcode to renew it (your data is kept). A paid Apple Developer account ($99/yr) makes it last 1 year and allows TestFlight.

### If the project won't open
Create a new project in Xcode instead (**File → New → Project → iOS App**, name *FitTrack*, Interface: SwiftUI, Storage: None). Delete the generated `ContentView.swift` and `FitTrackApp.swift`, then drag in everything inside the `FitTrack/` folder. Then add these settings:
- **Info** tab: add `Privacy - Location When In Use Usage Description` with any text
- **Signing & Capabilities → + Capability → Background Modes**, then tick **Location updates**

## Notes / limitations
- Units are metric only (kg, km, cm).
- Food values are typical USDA values, so they're approximate. For packaged food, enter it once from the label via *Manual entry → Save to my food database*.
- Route planning uses Apple Maps **walking** directions for all activities (also bike), so the paths it picks can differ from bike lanes. Turn off "Follow roads & paths" to draw straight lines.
- No Apple Health sync yet.
