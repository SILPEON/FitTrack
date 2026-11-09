# FitTrack

A fitness tracker web app for iPhone: install it from Safari with **Share → Add to Home Screen**. All data stays on your phone.

| Tab | What it does |
|---|---|
| **Training** | 3 home-gym training plans (Full Body 3×, Upper/Lower 4×, Glute & Quad Priority 5×) built around a fixed plate setup, with warm-ups, technique cues, weekly volume per muscle and pull/push shoulder balance. 130 exercises plus custom ones. Log sets × reps × kg. Prefills last time's numbers, shows "Last time: …", personal records and an estimated-1RM chart per exercise. Repeat past workouts. |
| **Yoga** | 6 guided routines (hamstrings, daily leg mobility, Pilates core, shoulder mobility, Blackroll recovery, evening wind-down) with timer player, a 4-week leg mobility program and a toe-touch flexibility tracker. |
| **Weight** | Trend graph first, stats, weigh-in list, and a progress-photo journal with ghost-overlay camera, self-timer and before/after slider. |
| **Nutrition** | Daily log by meal. **Barcode scanning** (📷) with product data from Open Food Facts, 75 built-in foods (per 100 g), your own foods, manual entry, calories and macros against your targets. |
| **Routes** | Record walks/runs/rides with GPS (screen must stay on: a pocket lock blocks accidental taps). Plan routes on an OpenStreetMap map with foot or bike routing. GPX import and export. |
| **Profile** | Body data and goal → BMI, BMR (Mifflin-St Jeor), maintenance and goal calories, macros, time to goal. Backup & restore of all data. |

## Formulas
- BMI = kg / m² (WHO categories)
- BMR = 10·kg + 6.25·cm − 5·age + 5 (male) / −161 (female)
- Maintenance = BMR × 1.2 / 1.375 / 1.55 / 1.725 / 1.9
- Goal calories = maintenance ± weekly rate × 7700 / 7, minimum 1500 (male) / 1200 (female)
- Protein = g/kg × weight (weight at BMI 25 if BMI ≥ 30), fat = % of kcal, carbs = rest, fiber = 14 g / 1000 kcal
- 1RM (Epley) = weight × (1 + reps/30)

## Limits
- **Route recording needs the screen on and FitTrack in front.** iOS pauses GPS for web apps when the phone is locked.
- Data lives only in the home-screen app. **Deleting the icon deletes the data**: use Profile → Save backup regularly.
- Food values are typical USDA values (approximate).
- Maps © OpenStreetMap contributors; routing by FOSSGIS OSRM servers; place search by Nominatim; product data from Open Food Facts (ODbL).

## Development
```
npm install
npm run dev      # local dev server
npm run build    # type-check + production build into dist/
```
Pushing to `main` deploys to GitHub Pages (`.github/workflows/deploy-web.yml`).

The earlier native SwiftUI version is in `ios-native/` (build it with the manual "Build unsigned IPA" workflow).
