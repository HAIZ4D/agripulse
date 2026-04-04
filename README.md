# AgriPulse

**Agricultural Intelligence Platform for Malaysian Food Security**

AgriPulse is a two-sided agricultural intelligence platform that connects local food buyers with smallholder farmers through AI-powered demand forecasting and satellite crop monitoring. Built to address food security challenges in Malaysia by reducing information asymmetry between supply and demand.

---

## Links

| Resource | URL |
|----------|-----|
| Web App (Farmer Dashboard) | https://agripulse-alpha.vercel.app/ |
| Telegram Bot (Buyer Side) | https://t.me/agripulse_my_bot |
| GitHub Repository | https://github.com/HAIZ4D/agripulse |
| YouTube Presentation | *Coming soon* |

---

## How It Works

### For Buyers (Telegram Bot)
1. Start the bot with `/start`
2. Select your role (restaurant, home cook, retailer)
3. Share your location
4. Enter your recurring produce demands (e.g., "Kangkung 50kg", "Cili padi 20kg")
5. Select purchase frequency (weekly/biweekly/monthly)

### For Farmers (Web App)
1. Register with name, phone, and area
2. Draw farm boundaries on Google Maps
3. Receive AI-powered planting recommendations based on real buyer demand
4. Monitor crop health via satellite imagery (NDVI/NDWI from Sentinel-2)
5. Get AI farm advisory (pest risk, harvest timing, irrigation advice)
6. Announce surplus harvest to notify nearby buyers instantly via Telegram

---

## Key Features

- **Hyper-Local Demand Forecasting** — Real-time demand aggregation from Telegram buyers, visualized as heatmaps and charts
- **AI Planting Recommendations** — Gemini AI analyzes demand, weather, satellite data, and market conditions to recommend optimal crops
- **Satellite Crop Monitoring** — Google Earth Engine integration for NDVI/NDWI analysis with 5-day Sentinel-2 refresh cycle
- **AI Farm Advisor** — Pest & disease risk assessment, crop-by-crop advice, weekly task lists, and harvest window predictions
- **AI Health Prediction** — 4-week health trajectory forecast with risk probability analysis
- **Surplus-to-Buyer Pipeline** — Farmers announce surplus, buyers get instant Telegram notifications
- **Glass-Box Transparent AI** — Every recommendation shows its reasoning: demand data, weather, market conditions, farm health, and profit projections
- **Bilingual Support** — Full English and Bahasa Melayu support across all UI and AI-generated content
- **Real-Time Weather** — Live 7-day forecast from MET Malaysia (data.gov.my)
- **Demand Intelligence Dashboard** — Market pulse stats, demand comparison charts, profitability analysis, and AI demand forecasting

---

## Technologies Used

| Category | Technology |
|----------|-----------|
| **Frontend** | React 18, Vite, TailwindCSS |
| **Backend** | Firebase Cloud Functions (Node.js) |
| **Database** | Firebase Firestore (NoSQL) |
| **AI** | Google Gemini API (gemini-2.5-flash) |
| **Satellite** | Google Earth Engine REST API (Sentinel-2 NDVI/NDWI) |
| **Maps** | Google Maps JavaScript API (polygon drawing, visualization) |
| **Weather** | data.gov.my Weather API (MET Malaysia) |
| **Bot** | Telegram Bot API (node-telegram-bot-api) |
| **Charts** | Recharts |
| **i18n** | i18next (Bahasa Melayu + English) |
| **Hosting** | Vercel (web), Render (bot), Firebase (functions) |

---

## Future Roadmap

AgriPulse is designed to evolve into a fully integrated, AI-powered smart agriculture ecosystem. Our roadmap focuses on scalability, real-world adoption, and continuous improvement based on user feedback.

Phase 1: Nationwide Deployment (Short-Term)
-Expand AgriPulse across all states in Malaysia
-Target smallholder farmers with smartphone-first access
-Improve onboarding experience (simpler farm registration & UI)
-Support more crops and localized demand datasets
-Optimize Telegram bot for faster and more structured demand input

Phase 2: Smart Supply Chain Integration (Mid-Term)
-Integrate with logistics partners (e.g., Lalamove, Grab)
-Enable automated farm-to-buyer delivery coordination
-Introduce real-time pricing and supply matching
-Add auto-reorder system based on buyer feedback
-Build marketplace features for direct farmer–buyer transactions

Phase 3: Government & Data Ecosystem (Long-Term)
-Integrate with government agencies (e.g., FAMA, MAFI)
-Share anonymized agricultural data for policy planning
-Support national food security monitoring systems
-Enable large-scale agricultural analytics and forecasting
-Contribute to data-driven decision-making at national level

AI & System Enhancements
-Improve AI accuracy with more real-time and historical data
-Add predictive pest and disease detection
-Enhance explainable AI (clear reasoning for recommendations)
-Introduce personalized AI recommendations per farm
-Continuous learning from user behavior and feedback

User Experience Improvements
-Multi-language support expansion (BM, EN, others)
-SMS/WhatsApp alerts for low connectivity users
-Offline mode for rural farmers
-Simpler UI for non-technical users
-Voice input for demand submission

## Long-Term Vision

AgriPulse aims to become a regional smart agriculture platform, connecting farmers, buyers, and policymakers through real-time data and AI — reducing food waste, improving farmer income, and strengthening food security.

## Continuous Improvement

We actively incorporate feedback from real users:
-Simplifying workflows for farmers
-Automating repetitive tasks (e.g., demand input)
-Improving clarity of AI insights
-Enhancing accessibility for all user groups

## Project Structure

```
agripulse/
├── bot/                    # Telegram Bot (Node.js)
│   ├── src/
│   │   ├── index.js        # Entry point, command routing
│   │   ├── handlers/       # /start, /update, /status, /surplus, /lang
│   │   └── services/       # Firestore, Gemini, geocoding, weather
│   └── .env.example
│
├── web/                    # Farmer React App
│   ├── src/
│   │   ├── pages/          # Dashboard, DemandIntel, FarmMonitor, Settings
│   │   ├── components/     # UI components (charts, maps, AI cards)
│   │   ├── services/       # Firebase, Gemini, Earth Engine, Weather
│   │   └── i18n/           # en.json, ms.json translations
│   └── .env.example
│
├── functions/              # Firebase Cloud Functions
│   ├── aggregateDemand.js  # Buyer demand aggregation trigger
│   ├── satelliteReport.js  # Scheduled NDVI/NDWI analysis via GEE
│   ├── aiRecommendation.js # AI crop recommendation generator
│   └── notifySurplus.js    # Surplus → Telegram notification
│
├── firebase.json           # Firebase config
├── firestore.rules         # Firestore security rules
└── README.md
```

---

## Installation & Setup

### Prerequisites
- Node.js 18+
- Firebase CLI (`npm install -g firebase-tools`)
- Google Cloud project with Earth Engine API enabled
- Telegram Bot Token (from [@BotFather](https://t.me/BotFather))
- Gemini API Key (from [Google AI Studio](https://aistudio.google.com/))

### 1. Clone the repository

```bash
git clone https://github.com/HAIZ4D/agripulse.git
cd agripulse
```

### 2. Web App Setup

```bash
cd web
npm install
cp .env.example .env
# Fill in your Firebase, Gemini, Google Maps, and GEE credentials in .env
npm run dev
```

### 3. Telegram Bot Setup

```bash
cd bot
npm install
cp .env.example .env
# Fill in TELEGRAM_BOT_TOKEN, FIREBASE_PROJECT_ID, GEMINI_API_KEY
# Add your Firebase Admin SDK service account JSON file
node src/index.js
```

### 4. Firebase Cloud Functions Setup

```bash
cd functions
npm install
firebase login
firebase use --add  # Select your project

# Set secrets
firebase functions:secrets:set GEMINI_API_KEY
firebase functions:secrets:set TELEGRAM_BOT_TOKEN

# Deploy
firebase deploy --only "functions,firestore"
```

### 5. Trigger Satellite Report (Manual)

```bash
curl -X POST "https://asia-southeast1-YOUR_PROJECT.cloudfunctions.net/httpSatelliteReport" \
  -H "Content-Type: application/json" -d "{}"
```

---

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
GOOGLE_APPLICATION_CREDENTIALS=./your-service-account.json
```

---

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│   Telegram Bot   │────▶│     Firestore     │◀────│    React Web App    │
│  (Buyer Input)   │     │   (Central DB)    │     │  (Farmer Dashboard) │
└─────────────────┘     └────────┬─────────┘     └─────────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
            ┌──────────┐ ┌───────────┐ ┌───────────────┐
            │ Aggregate │ │ Satellite │ │      AI       │
            │  Demand   │ │  Report   │ │Recommendation │
            │ (Trigger) │ │(Scheduled)│ │  (Trigger)    │
            └──────────┘ └───────────┘ └───────────────┘
                              │              │
                    ┌─────────┘    ┌─────────┘
                    ▼              ▼
            ┌──────────────┐ ┌──────────┐
            │ Google Earth │ │  Gemini  │
            │   Engine     │ │   API    │
            └──────────────┘ └──────────┘
```

---

## License

This project is for educational and competition purposes.
