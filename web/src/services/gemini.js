import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY)
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

/**
 * Get upcoming Malaysian festive events and holidays within the next 8 weeks.
 * Includes Islamic holidays (approximate dates, shift yearly), Chinese, Indian,
 * national, and school holiday periods.
 */
function getUpcomingMalaysianEvents(fromDate) {
  const year = fromDate.getFullYear()

  // Malaysian events calendar — dates are approximate for Islamic holidays
  // which follow the lunar calendar and shift ~11 days earlier each year
  const events = [
    // Fixed-date events
    { month: 1, day: 1, name: 'New Year\'s Day', impact: 'Moderate demand spike for fresh produce, restaurants stock up' },
    { month: 1, day: 25, name: 'Thaipusam', impact: 'Increased demand for vegetarian ingredients, fresh fruits' },
    { month: 2, day: 1, name: 'Federal Territory Day', impact: 'Minor — affects KL/Putrajaya buyers' },
    { month: 5, day: 1, name: 'Labour Day / Hari Pekerja', impact: 'Minor — day off, slight home cooking increase' },
    { month: 6, day: 3, name: 'Agong Birthday', impact: 'Minor — public holiday, home cooking increases' },
    { month: 8, day: 31, name: 'Merdeka Day', impact: 'National celebrations, catering demand rises' },
    { month: 9, day: 16, name: 'Malaysia Day', impact: 'National celebrations, event catering demand' },
    { month: 12, day: 25, name: 'Christmas', impact: 'Significant demand spike — restaurants, hotels, home gatherings increase fresh produce orders 20-40%' },

    // Chinese New Year (approximate — shifts yearly)
    { month: 1, day: 29, name: 'Chinese New Year (2025)', impact: 'Major 30-50% demand spike for vegetables, especially leafy greens, spring onions, mushrooms. Restaurants fully booked. Reunion dinner tradition.' },
    { month: 2, day: 17, name: 'Chinese New Year (2026)', impact: 'Major 30-50% demand spike for vegetables, especially leafy greens, spring onions, mushrooms. Restaurants fully booked. Reunion dinner tradition.' },

    // Hari Raya Aidilfitri (approximate — shifts ~11 days earlier each year)
    { month: 3, day: 31, name: 'Hari Raya Aidilfitri (2025)', impact: 'Massive demand spike 40-60% — end of Ramadan, open houses, ketupat, rendang, fresh vegetables for traditional dishes. Peak buying 1-2 weeks before.' },
    { month: 3, day: 21, name: 'Hari Raya Aidilfitri (2026)', impact: 'Massive demand spike 40-60% — end of Ramadan, open houses, ketupat, rendang, fresh vegetables for traditional dishes. Peak buying 1-2 weeks before.' },

    // Ramadan start (approximate)
    { month: 3, day: 1, name: 'Ramadan begins (2025)', impact: 'Ramadan bazaar demand surges. Cooking at home increases. Demand for cooking vegetables (onions, chili, leafy greens) rises 20-30%. Bazaar Ramadan stalls need bulk supply.' },
    { month: 2, day: 19, name: 'Ramadan begins (2026)', impact: 'Ramadan bazaar demand surges. Cooking at home increases. Demand for cooking vegetables rises 20-30%. Bazaar stalls need bulk supply.' },

    // Hari Raya Haji (approximate)
    { month: 6, day: 7, name: 'Hari Raya Haji (2025)', impact: 'Moderate demand increase — kenduri (feasts), fresh vegetables for side dishes' },
    { month: 5, day: 27, name: 'Hari Raya Haji (2026)', impact: 'Moderate demand increase — kenduri (feasts), fresh vegetables for side dishes' },

    // Deepavali (approximate)
    { month: 10, day: 20, name: 'Deepavali (2025)', impact: 'Demand spike for fresh vegetables, especially Indian cooking ingredients. Open houses increase overall produce demand 15-25%.' },
    { month: 11, day: 8, name: 'Deepavali (2026)', impact: 'Demand spike for fresh vegetables, especially Indian cooking ingredients. Open houses increase overall produce demand 15-25%.' },

    // School holidays (approximate — Malaysia has 4 school holiday periods)
    { month: 3, day: 15, name: 'School Holiday (Mid-term 1)', impact: 'Reduced canteen/institutional demand but increased home cooking and holiday travel food demand' },
    { month: 5, day: 24, name: 'School Holiday (Mid-year)', impact: 'Reduced institutional demand for 2 weeks, families cook more at home' },
    { month: 8, day: 16, name: 'School Holiday (Mid-term 2)', impact: 'Reduced institutional demand for 1 week' },
    { month: 11, day: 22, name: 'School Holiday (Year-end)', impact: 'Extended break — institutional demand drops, but festive season overlap increases retail demand' },
  ]

  const from = fromDate.getTime()
  const eightWeeksLater = from + 56 * 24 * 60 * 60 * 1000

  return events
    .map((e) => {
      const eventDate = new Date(year, e.month - 1, e.day)
      // Also check next year for events near year boundary
      const eventDateNextYear = new Date(year + 1, e.month - 1, e.day)
      const useDate = eventDate.getTime() >= from ? eventDate : eventDateNextYear
      return { ...e, dateObj: useDate, date: useDate.toISOString().split('T')[0] }
    })
    .filter((e) => e.dateObj.getTime() >= from && e.dateObj.getTime() <= eightWeeksLater)
    .sort((a, b) => a.dateObj - b.dateObj)
}

/**
 * Determine current Malaysian monsoon/season context.
 */
function getMalaysianSeason(date) {
  const month = date.getMonth() + 1
  if (month >= 11 || month <= 3) {
    return 'Northeast Monsoon (Monsun Timur Laut) — heavy rainfall especially east coast Peninsular Malaysia, Sabah, Sarawak. Floods possible. Transport disruptions may affect supply chains. Cool weather increases leafy green growth but flooding can destroy crops.'
  }
  if (month >= 5 && month <= 9) {
    return 'Southwest Monsoon (Monsun Barat Daya) — drier conditions, less rainfall. Good growing conditions for most crops. Hotter temperatures may increase pest pressure and water stress.'
  }
  if (month === 4) {
    return 'Inter-monsoon transition (April) — unpredictable thunderstorms, variable conditions. Transitioning from wet to dry season.'
  }
  return 'Inter-monsoon transition (October) — unpredictable thunderstorms, transitioning from dry to wet season. Farmers should prepare for increased rainfall.'
}

export async function getPlantingRecommendations({ demandData, weatherData, satelliteData, farmerArea, language = 'ms' }) {
  const prompt = `You are an agricultural AI advisor for Malaysian smallholder farmers.

Analyze the following REAL data and provide planting recommendations.

## Local Demand Data (from buyers in ${farmerArea}):
${JSON.stringify(demandData, null, 2)}

## Weather Forecast (MET Malaysia):
${JSON.stringify(weatherData, null, 2)}

## Farm Satellite Data (NDVI/NDWI):
${JSON.stringify(satelliteData, null, 2)}

Respond in ${language === 'ms' ? 'Bahasa Melayu' : 'English'}.

Return ONLY valid JSON in this exact format:
{
  "recommendations": [
    {
      "crop": "crop name",
      "confidence": 0.0-1.0,
      "reasoning": {
        "demand": "cite exact buyer count and kg demand",
        "weather": "cite exact forecast data",
        "market": "price trend analysis",
        "farm_suitability": "cite NDVI/NDWI values"
      },
      "projected_profit": {
        "cost_per_hectare": 0,
        "revenue_per_hectare": 0,
        "margin_percentage": 0
      }
    }
  ]
}`

  const result = await model.generateContent(prompt)
  const text = result.response.text()
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Invalid AI response format')
  return JSON.parse(jsonMatch[0])
}

export async function generateDemandForecast({ demandData, weatherData, area, language = 'ms' }) {
  const today = new Date()
  const upcomingEvents = getUpcomingMalaysianEvents(today)

  const prompt = `You are a senior Malaysian agricultural market analyst with deep expertise in local food supply chains, seasonal demand patterns, and global commodity markets.

Predict demand changes for the next 4 weeks based on ALL the following factors:

## 1. Current Buyer Demand Data (${area}):
${JSON.stringify(demandData, null, 2)}

## 2. Weather Forecast (MET Malaysia):
${JSON.stringify(weatherData, null, 2)}

## 3. Today's Date: ${today.toISOString().split('T')[0]}

## 4. Upcoming Malaysian Festive Events & Holidays (next 8 weeks):
${upcomingEvents.length > 0 ? upcomingEvents.map(e => `- ${e.name} (${e.date}): ${e.impact}`).join('\n') : 'No major events in the next 8 weeks.'}

## 5. Seasonal & Monsoon Context:
- Current season: ${getMalaysianSeason(today)}
- Consider: Northeast Monsoon (Nov-Mar, heavy rain east coast), Southwest Monsoon (May-Sep, drier), Inter-monsoon transitions (Apr, Oct, thunderstorms)
- Seasonal crop availability and pricing patterns in Malaysia

## 6. Global Market & Crisis Awareness:
- Consider any known global supply chain disruptions, El Niño/La Niña effects, fertilizer price trends, fuel costs, and import/export dynamics affecting Malaysian agriculture
- Factor in food inflation trends and how they affect local demand shifts
- Note: Malaysia imports significant amounts of vegetables from China, Thailand, and Indonesia — any disruption increases local demand

## IMPORTANT INSTRUCTIONS:
- For each crop, explain HOW festive events, weather, and global factors affect its predicted demand
- Festive seasons (Hari Raya, Chinese New Year, Deepavali, Christmas) significantly spike demand for fresh vegetables
- Ramadan changes buying patterns (more cooking at home, bazaar demand)
- School holidays affect institutional buyer demand (canteens, catering)
- Be specific: cite which event or weather pattern drives each prediction

Respond in ${language === 'ms' ? 'Bahasa Melayu' : 'English'}.

Return ONLY valid JSON:
{
  "forecasts": [
    {
      "crop": "crop name",
      "current_weekly_kg": 0,
      "predicted_weeks": [
        { "week": 1, "predicted_kg": 0, "confidence": 0.8 },
        { "week": 2, "predicted_kg": 0, "confidence": 0.7 },
        { "week": 3, "predicted_kg": 0, "confidence": 0.6 },
        { "week": 4, "predicted_kg": 0, "confidence": 0.5 }
      ],
      "reasoning": "explain citing specific events, weather, and market factors"
    }
  ],
  "market_insight": "2-3 sentence overall market outlook considering festive, weather, and global factors",
  "events_impact": [
    {
      "event": "event name",
      "effect": "brief description of how this event affects produce demand"
    }
  ]
}`

  const result = await model.generateContent(prompt)
  const text = result.response.text()
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Invalid AI response format')
  return JSON.parse(jsonMatch[0])
}

export async function generateFarmAdvisory({
  ndviData, weatherData, cropInfo, farmArea, language = 'ms',
  // Zone data from satellite report
  zoneStats = null, changeDetection = null, criticalZones = null,
  ndreAverage = null, ndwiAverage = null,
}) {
  const today = new Date()
  const upcomingEvents = getUpcomingMalaysianEvents(today)
  const season = getMalaysianSeason(today)

  // --- Build zone context string ---
  let zoneContext = ''
  if (zoneStats && zoneStats.total_zones > 0) {
    const healthyPct = Math.round((zoneStats.healthy_count / zoneStats.total_zones) * 100)
    const moderatePct = Math.round((zoneStats.moderate_count / zoneStats.total_zones) * 100)
    const criticalPct = Math.round((zoneStats.critical_count / zoneStats.total_zones) * 100)
    zoneContext = `
## 2b. FARM ZONING DATA (Precision Grid — ${zoneStats.total_zones} micro-zones analyzed):
- Healthy zones: ${zoneStats.healthy_count} (${healthyPct}%)
- Moderate stress zones: ${zoneStats.moderate_count} (${moderatePct}%)
- Critical zones: ${zoneStats.critical_count} (${criticalPct}%)
${
  criticalZones && criticalZones.length > 0
    ? `\nCRITICAL ZONE DETAILS (require immediate attention):\n${criticalZones.slice(0, 5).map((z) =>
        `- Zone ${z.zone_id}: NDVI=${z.ndvi?.toFixed(3) ?? 'N/A'}, NDWI=${z.ndwi?.toFixed(3) ?? 'N/A'}, NDRE=${z.ndre?.toFixed(3) ?? 'N/A'} → Recommended action: ${z.action_needed ?? 'inspect'}`
      ).join('\n')}`
    : ''
}${changeDetection ? `

CHANGE DETECTION (vs previous satellite scan):
- Improved zones: ${changeDetection.zones_improved}
- Declined zones: ${changeDetection.zones_declined}
- Stable zones: ${changeDetection.zones_stable}
- Newly critical: ${changeDetection.zones_critical_new}
- Overall trend: ${changeDetection.overall_trend}` : ''}` }

  // --- Build multi-index context ---
  const ndreVal = ndreAverage ?? ndviData?.ndre_average
  const ndwiVal = ndwiAverage ?? ndviData?.ndwi_average
  const ndreContext = ndreVal !== null && ndreVal !== undefined
    ? `- NDRE (Red-Edge, early nitrogen stress): ${ndreVal.toFixed(4)}${
        ndreVal < 0.18 ? ' ⚠ CRITICAL — severe nitrogen deficiency'
        : ndreVal < 0.28 ? ' ⚠ LOW — apply nitrogen fertilizer within 7 days'
        : ' ✓ Adequate'
      }`
    : '- NDRE: unavailable'

  const prompt = `You are a senior Malaysian agricultural advisor and precision farming expert with deep knowledge of tropical crop management, pest/disease patterns, and satellite-based precision zoning.

Analyze this farm's COMPLETE data including multi-index satellites and precision zone analysis.

## 1. Farm Multi-Index Satellite Data (30-day cloud-masked composite):
- NDVI (vegetation health): ${ndviData?.ndvi_average?.toFixed(4) ?? 'N/A'} — farm-wide average
- NDWI (water/irrigation): ${ndwiVal !== null && ndwiVal !== undefined ? ndwiVal.toFixed(4) : 'N/A'}
${ndreContext}
- Health Score: ${ndviData?.health_score ?? 'N/A'}/100
${zoneContext}

## 2. Farm Details:
- Location: ${farmArea || 'Malaysia'}
- Area: ${ndviData?.area_hectares || 'Unknown'} hectares

## 3. Current Crops on Farm:
${JSON.stringify(cropInfo, null, 2)}

## 4. Weather Forecast (MET Malaysia):
${JSON.stringify(weatherData, null, 2)}

## 5. Today's Date: ${today.toISOString().split('T')[0]}

## 6. Seasonal Context:
- ${season}

## 7. Upcoming Events (next 8 weeks):
${upcomingEvents.length > 0 ? upcomingEvents.map((e) => `- ${e.name} (${e.date}): ${e.impact}`).join('\n') : 'No major events.'}

## ANALYSIS INSTRUCTIONS:
1. **Precision Zone Actions**: If there are critical zones, identify WHAT to do and WHERE. Reference critical zone IDs. Distinguish irrigate vs fertilize vs inspect actions.
2. **NDRE Early Warning**: If NDRE < 0.28, PRIORITIZE nitrogen/fertilizer advice — this detects deficiency weeks before visible damage. Cite the exact NDRE value.
3. **NDWI Irrigation**: If NDWI < -0.20, flag irrigation need. If NDWI > 0.20, flag waterlogging risk.
4. **Pest & Disease Risk**: Based on weather and satellite stress signals, name specific pests relevant to Malaysian agriculture.
5. **Crop Health Action Plan**: For each crop, provide specific actionable advice.
6. **Weekly Tasks**: Create a prioritized task list — critical zone actions first, then general maintenance.
7. **Market Timing**: Cross-reference harvest with upcoming events.

Respond in ${language === 'ms' ? 'Bahasa Melayu' : 'English'}.

Return ONLY valid JSON:
{
  "farm_status": "excellent|good|attention_needed|critical",
  "summary": "2-3 sentence overall farm assessment citing NDVI, NDWI, NDRE values and zone breakdown",
  "zone_insight": "1-2 sentence summary of zone analysis — where are problems, what actions are needed. Null if no zone data.",
  "pest_risks": [
    {
      "pest": "pest/disease name",
      "risk_level": "low|medium|medium-high|high",
      "affected_crops": ["crop names"],
      "signs": "what to look for",
      "prevention": "specific prevention action"
    }
  ],
  "crop_advice": [
    {
      "crop": "crop name",
      "health": "healthy|moderate|stressed|critical",
      "action": "specific immediate action to take",
      "irrigation": "watering recommendation",
      "fertilizer": "fertilization advice",
      "harvest_window": "estimated harvest date or timeframe",
      "market_tip": "best time/event to sell for higher price"
    }
  ],
  "weekly_tasks": [
    {
      "day": "Today|Tomorrow|Day 3|This week|Next week",
      "task": "specific task description — reference zone IDs for spatial tasks",
      "priority": "high|medium|low"
    }
  ],
  "weather_warning": "brief weather-related farming advisory or null"
}`

  const result = await model.generateContent(prompt)
  const text = result.response.text()
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Invalid AI response format')
  return JSON.parse(jsonMatch[0])
}

export async function generateHealthPrediction({ reportHistory, weatherData, cropInfo, farmArea, language = 'ms' }) {
  const today = new Date()
  const season = getMalaysianSeason(today)

  const prompt = `You are a precision agriculture data scientist specializing in satellite-based crop health forecasting for Malaysian farms.

Based on the historical satellite health data and current conditions, predict farm health for the next 4 weeks.

## 1. Historical Satellite Reports (most recent first):
${JSON.stringify(reportHistory, null, 2)}

## 2. Current Crops:
${JSON.stringify(cropInfo, null, 2)}

## 3. Weather Forecast (MET Malaysia):
${JSON.stringify(weatherData, null, 2)}

## 4. Farm Location: ${farmArea || 'Malaysia'}

## 5. Today: ${today.toISOString().split('T')[0]}

## 6. Season: ${season}

## INSTRUCTIONS:
- Analyze NDVI/NDWI trends from history to predict future health
- Factor in weather forecast (rain → NDVI recovery or flooding, heat → water stress)
- Consider crop growth stages (vegetative growth increases NDVI, harvest drops it)
- Predict specific risks: drought stress, waterlogging, nutrient deficiency, pest outbreaks
- Provide actionable prevention advice for each predicted risk
- Estimate harvest readiness for each crop based on satellite data + planted date

Respond in ${language === 'ms' ? 'Bahasa Melayu' : 'English'}.

Return ONLY valid JSON:
{
  "health_trajectory": "improving|stable|declining",
  "predicted_scores": [
    { "week": 1, "predicted_score": 0, "confidence": 0.0 },
    { "week": 2, "predicted_score": 0, "confidence": 0.0 },
    { "week": 3, "predicted_score": 0, "confidence": 0.0 },
    { "week": 4, "predicted_score": 0, "confidence": 0.0 }
  ],
  "risk_forecast": [
    {
      "risk": "risk name",
      "probability": "low|medium|high",
      "timeframe": "when it may occur",
      "impact": "what it would do to crops",
      "prevention": "specific action to prevent it"
    }
  ],
  "crop_predictions": [
    {
      "crop": "crop name",
      "health_outlook": "improving|stable|declining",
      "estimated_harvest": "date or timeframe",
      "yield_estimate": "expected|above_average|below_average",
      "key_action": "most important thing to do now"
    }
  ],
  "summary": "2-3 sentence prediction summary with data citations"
}`

  const result = await model.generateContent(prompt)
  const text = result.response.text()
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Invalid AI response format')
  return JSON.parse(jsonMatch[0])
}

export async function generateHealthReport({ ndviData, weatherData, cropInfo, language = 'ms' }) {
  const ndreVal = ndviData?.ndre_average
  const ndwiVal = ndviData?.ndwi_average
  const zoneStats = ndviData?.zone_stats

  const prompt = `You are an agricultural satellite data analyst for Malaysian farms with precision zone monitoring capability.

Analyze this farm's multi-index satellite health data and provide a clear, actionable report.

## Multi-Index Satellite Data (30-day composite):
- NDVI (vegetation health): ${ndviData?.ndvi_average?.toFixed(4) ?? 'N/A'}
- NDWI (water content): ${ndwiVal !== null && ndwiVal !== undefined ? ndwiVal.toFixed(4) : 'N/A'}
- NDRE (early nitrogen stress): ${ndreVal !== null && ndreVal !== undefined ? ndreVal.toFixed(4) : 'N/A'}
- Health Score: ${ndviData?.health_score ?? 'N/A'}/100
- Data quality: ${ndviData?.data_quality ?? 'standard'} (${ndviData?.composite_days ?? 10}-day composite)

## Zone Summary:
${zoneStats ? `- Total zones: ${zoneStats.total_zones}\n- Healthy: ${zoneStats.healthy_count} | Moderate: ${zoneStats.moderate_count} | Critical: ${zoneStats.critical_count}` : 'Zone data not available.'}

## Change Detection:
${ndviData?.change_detection ? JSON.stringify(ndviData.change_detection, null, 2) : 'No previous scan available.'}

## Current Weather:
${JSON.stringify(weatherData, null, 2)}

## Current Crops:
${JSON.stringify(cropInfo, null, 2)}

Respond in ${language === 'ms' ? 'Bahasa Melayu' : 'English'}.

Return ONLY valid JSON:
{
  "overall_status": "healthy|moderate|stressed|critical",
  "health_score": 0-100,
  "summary": "2-3 sentence summary citing NDVI, NDWI, NDRE values and zone breakdown",
  "ndre_warning": "specific nitrogen/chlorophyll advice if NDRE < 0.28, otherwise null",
  "alerts": [
    { "zone": "description", "severity": "low|medium|high", "message": "specific actionable advice" }
  ],
  "recommendations": ["specific action items ordered by priority"]
}`

  const result = await model.generateContent(prompt)
  const text = result.response.text()
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Invalid AI response format')
  return JSON.parse(jsonMatch[0])
}
