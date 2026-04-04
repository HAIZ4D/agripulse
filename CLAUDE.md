# CLAUDE.md — AgriPulse

## Project Overview

AgriPulse is a two-sided agricultural intelligence platform for Malaysian food security. It connects local food buyers (via Telegram bot) with smallholder farmers (via React web app) through AI-powered demand forecasting and satellite crop monitoring.

- **Consumer side:** Telegram Bot — collects recurring produce demand from restaurants, warungs, home cooks, retailers
- **Farmer side:** React Web App — shows AI planting recommendations + satellite farm health monitoring
- **AI Engine:** Gemini API — synthesizes demand, weather, satellite, and market data into transparent recommendations

## Tech Stack

- **Frontend:** React 18 + Vite + TailwindCSS + shadcn/ui
- **Backend:** Firebase Cloud Functions (Node.js)
- **Database:** Firebase Firestore (no SQL)
- **AI:** Google Gemini API (gemini-2.0-flash)
- **Maps:** Google Maps JavaScript API (polygon drawing, heatmaps)
- **Satellite:** Google Earth Engine API (NDVI, NDWI from Sentinel-2)
- **Weather (Primary):** data.gov.my Weather API (free, no key) — `https://api.data.gov.my/weather/forecast`
- **Weather (Fallback):** OpenWeatherMap API — only for long-range climate data (El Niño/La Niña)
- **Bot:** Telegram Bot API (node-telegram-bot-api)
- **i18n:** i18next (BM + EN for web), Gemini-based detection for bot (BM + EN + 中文)
- **Hosting:** Vercel or Firebase Hosting (web) + Firebase Cloud Functions (bot)

## Project Structure

```
agripulse/
├── CLAUDE.md
├── bot/                          # Telegram Bot (Node.js)
│   ├── package.json
│   ├── src/
│   │   ├── index.js              # Entry point, webhook setup
│   │   ├── handlers/
│   │   │   ├── onboarding.js     # /start → role, location, demand, frequency
│   │   │   ├── demand.js         # Parse demand input, AI crop normalization
│   │   │   ├── surplus.js        # /surplus, notifications
│   │   │   └── language.js       # /lang, auto-detect
│   │   ├── services/
│   │   │   ├── firestore.js      # Buyer CRUD, demand aggregation
│   │   │   ├── gemini.js         # Crop name normalization, language detect
│   │   │   ├── location.js       # Geocoding from Telegram location
│   │   │   └── weather.js        # data.gov.my client
│   │   └── locales/
│   │       ├── ms.json
│   │       ├── en.json
│   │       └── zh.json
│   └── .env
│
├── web/                          # Farmer React App
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx               # Router: Dashboard, DemandIntel, FarmMonitor, Settings
│   │   ├── pages/
│   │   │   ├── Onboarding.jsx    # Farmer registration (name, phone, area — no auth)
│   │   │   ├── Dashboard.jsx     # Overview: demand summary + farm health + weather
│   │   │   ├── DemandIntel.jsx   # Demand heatmap, AI recommendations, gap indicator
│   │   │   ├── FarmMonitor.jsx   # Satellite map, NDVI overlay, health reports
│   │   │   └── Settings.jsx      # Language, farm management
│   │   ├── components/
│   │   │   ├── RecommendationCard.jsx   # Glass-Box AI explainable card
│   │   │   ├── DemandHeatmap.jsx        # Aggregated demand by crop/area
│   │   │   ├── DemandGap.jsx            # Supply vs demand gap indicator
│   │   │   ├── FarmBoundaryMap.jsx      # Google Maps polygon drawing tool
│   │   │   ├── NDVIOverlay.jsx          # Satellite health color overlay
│   │   │   ├── HealthScoreCard.jsx      # 0-100 score with trend arrow
│   │   │   ├── HealthReport.jsx         # AI-generated natural language report
│   │   │   ├── WeatherPanel.jsx         # MET Malaysia 7-day forecast
│   │   │   └── LanguageSwitcher.jsx
│   │   ├── services/
│   │   │   ├── firebase.js              # Firestore init + helpers
│   │   │   ├── gemini.js                # AI recommendation requests
│   │   │   ├── earthEngine.js           # GEE NDVI/NDWI fetcher
│   │   │   ├── weatherMY.js             # data.gov.my Weather API client
│   │   │   └── weatherFallback.js       # OpenWeatherMap (El Niño only)
│   │   ├── i18n/
│   │   │   ├── index.js
│   │   │   ├── ms.json
│   │   │   └── en.json
│   │   └── lib/
│   │       └── utils.js
│   ├── .env
│   └── tailwind.config.js
│
├── functions/                    # Firebase Cloud Functions (shared backend)
│   ├── package.json
│   ├── index.js
│   ├── aggregateDemand.js        # Firestore trigger: recompute area demand on buyer write
│   ├── satelliteReport.js        # Scheduled: fetch NDVI per farm every 5 days
│   └── aiRecommendation.js       # Trigger: generate recs when new satellite/demand data arrives
│
└── firebase.json
```

## Authentication — SKIPPED

No Firebase Auth. No login. No sign-up.

- **Telegram Bot:** Uses Telegram `userId` as unique identifier (auto-provided by Telegram API)
- **Farmer Web App:** Simple onboarding form (name, phone, area). Store `farmerId` in localStorage. No password.

## CRITICAL: Real Data Only

**NO hardcoded data. NO mock data. NO placeholder values. This rule is absolute.**

| Rule | What to do instead |
|------|-------------------|
| No mock weather | Fetch live from `api.data.gov.my/weather` or OpenWeatherMap |
| No fake demand numbers | Aggregate from real Firestore buyer entries |
| No placeholder NDVI | Fetch from Google Earth Engine for actual farm polygon |
| No hardcoded crop lists | Normalize crop names via Gemini from real buyer input |
| No dummy buyers | All buyer records from actual Telegram bot onboarding |
| No simulated AI recommendations | Generate via Gemini using real concatenated data |
| Empty states required | Show "No data yet — waiting for buyers in your area" not fake numbers |
| Loading states required | Show skeleton/spinner while fetching real data |

## Firestore Collections

```
buyers/{telegramUserId}
  - role: "restaurant" | "home_cook" | "retailer"
  - location: { lat, lng, area_name }
  - language: "ms" | "en" | "zh"
  - demands: [{ crop, quantity_kg, frequency }]
  - created_at, updated_at

farmers/{farmerId}
  - name, phone, area_name, language
  - farms: [{ name, boundary (GeoJSON), area_hectares, current_crops: [{ crop, planted_date, expected_harvest }] }]
  - created_at, updated_at

demand_aggregates/{area_name}/{crop}
  - total_weekly_kg, buyer_count, trend ("rising"|"stable"|"falling"), last_updated

satellite_reports/{farmerId}/{farmIndex}/{reportDate}
  - ndvi_average, ndvi_map_url, health_score (0-100), ai_analysis, alerts: [{ zone, severity, message }], generated_at

ai_recommendations/{farmerId}/{timestamp}
  - recommended_crops, reasoning: { demand, weather, market, farm_data }, confidence (0-1), farmer_override, actual_yield
```

## Feature 1: Hyper-Local AI Demand Forecaster

### Telegram Bot Flow
1. `/start` → Select role (restaurant/home_cook/retailer)
2. Share location (GPS or manual text)
3. Input demands one by one: "Kangkung 50kg", "Cili padi 20kg" → `/done`
4. Select frequency (weekly/biweekly/monthly)
5. Confirmation + profile saved

**Commands:** `/start`, `/update`, `/status`, `/surplus`, `/lang`

### Farmer Dashboard (DemandIntel page)
- **Demand Heatmap:** Aggregated demand by crop within farmer's radius
- **AI Recommendation Cards:** Top 3 crops to plant with Glass-Box breakdown
- **Supply-Demand Gap:** Show undersupplied crops as opportunities

### AI Prompt Structure for Recommendations
Always pass REAL data to Gemini and require structured JSON response with:
- recommendation (crop name)
- confidence (0-1)
- reasoning.demand (cite exact buyer count + kg)
- reasoning.weather (cite exact MET Malaysia forecast)
- reasoning.market (cite exact price data)
- reasoning.farm_suitability (cite exact NDVI/NDWI)
- projected_profit (cost, revenue, margin)

## Feature 2: Remote Satellite Crop Monitoring

### Farm Registration Flow
1. Draw boundary on Google Maps (polygon tool) → auto-calculate hectares
2. Declare current crops + planting date
3. Monitoring activates → reports every 5 days (Sentinel-2 cycle)

### Satellite Pipeline
Farm polygon → Google Earth Engine → NDVI + NDWI + change detection → Gemini AI analysis → Dashboard

### Farm Health Dashboard (FarmMonitor page)
- **Farm Map:** NDVI color overlay (green=healthy, yellow=stress, red=critical)
- **Health Score:** 0-100 with trend arrow (↑/→/↓)
- **AI Health Report:** Natural language in farmer's language with exact data citations
- **Historical Timeline:** Farm health over weeks/months

## Glass-Box Transparent AI (Applied Everywhere)

Every AI recommendation card must show:
1. **PERMINTAAN TEMPATAN** — exact buyer count, kg demand, supply gap
2. **CUACA & IKLIM** — MET Malaysia forecast + climate outlook
3. **PASARAN GLOBAL** — import/export data, price trends
4. **KESIHATAN LADANG** — NDVI, NDWI values from satellite
5. **UNJURAN KEUNTUNGAN** — cost, revenue, margin estimate
6. **KEYAKINAN AI** — confidence % with explanation

Rules:
- Every number must be sourced from real data
- Show contradictory signals (don't hide bad news)
- Farmer can override any recommendation
- After harvest, farmer reports yield → feedback loop

## data.gov.my Weather API

```
Base: https://api.data.gov.my/weather
No API key required.

GET /forecast → 7-day forecast by district (updated daily by MET Malaysia)
GET /warning → Active weather warnings
GET /warning/earthquake → Earthquake alerts

Filter by location: ?contains=Serdang@location__location_name
Filter by type: ?contains=Ds@location__location_id (Ds=District, Tn=Town, St=State)

Response fields: date, morning_forecast, afternoon_forecast, night_forecast, summary_forecast, summary_when, min_temp, max_temp
Forecast values are in Bahasa Melayu.
```

## Multilingual

- **Web:** i18next with ms.json + en.json locale files
- **Bot:** Auto-detect language from first message via Gemini, store in user profile, `/lang` to override
- **AI responses:** Pass language param to Gemini system prompt, respond in farmer's language

## Commands

```bash
# Web app
cd web && npm install && npm run dev

# Bot
cd bot && npm install && node src/index.js

# Firebase functions
cd functions && npm install && firebase deploy --only functions
```

## Environment Variables

### web/.env
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_GEMINI_API_KEY=
VITE_GOOGLE_MAPS_API_KEY=
VITE_GEE_PROJECT_ID=
```

### bot/.env
```
TELEGRAM_BOT_TOKEN=
FIREBASE_PROJECT_ID=
GEMINI_API_KEY=
```
