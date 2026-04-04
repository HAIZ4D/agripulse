/**
 * aiRecommendation.js
 *
 * Firestore triggers that generate AI-powered crop recommendations for farmers
 * whenever new demand aggregates or satellite reports are written.
 *
 * Two triggers:
 *   1. onWrite to demand_aggregates/{area_name}/crops/{crop}
 *   2. onWrite to satellite_reports/{farmerId}/{farmIndex}/{date}
 *
 * Each trigger gathers full context (demand, satellite, weather) and calls
 * Gemini to produce structured JSON recommendations, then writes the result
 * to ai_recommendations/{farmerId}/{timestamp}.
 */

const {
  onDocumentWritten,
} = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// ---------- Weather API ----------

/**
 * Fetch weather forecast from data.gov.my for a given area name.
 * API: GET https://api.data.gov.my/weather/forecast?contains={area}@location__location_name
 * No API key required.
 */
async function fetchWeather(areaName) {
  if (!areaName) return null;

  const encodedArea = encodeURIComponent(areaName);
  const url = `https://api.data.gov.my/weather/forecast?contains=${encodedArea}@location__location_name`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(
        `Weather API returned ${response.status} for area "${areaName}"`
      );
      return null;
    }
    const data = await response.json();
    // data is an array of forecast entries
    if (!Array.isArray(data) || data.length === 0) {
      console.warn(`No weather data found for area "${areaName}"`);
      return null;
    }
    return data;
  } catch (err) {
    console.error(`Weather API error for area "${areaName}":`, err.message);
    return null;
  }
}

/**
 * Format weather data into a human-readable summary for the AI prompt.
 */
function formatWeatherForPrompt(weatherData) {
  if (!weatherData || weatherData.length === 0) {
    return "Weather data unavailable for this area.";
  }

  const forecasts = weatherData.slice(0, 7).map((entry) => {
    const date = entry.date || "unknown date";
    const morning = entry.morning_forecast || "-";
    const afternoon = entry.afternoon_forecast || "-";
    const night = entry.night_forecast || "-";
    const summary = entry.summary_forecast || "-";
    const minTemp = entry.min_temp || "-";
    const maxTemp = entry.max_temp || "-";
    return `  ${date}: Morning=${morning}, Afternoon=${afternoon}, Night=${night}, Summary=${summary}, Temp=${minTemp}-${maxTemp}C`;
  });

  return `7-day forecast (MET Malaysia):\n${forecasts.join("\n")}`;
}

// ---------- Demand Aggregates ----------

/**
 * Fetch all demand aggregates for an area from Firestore.
 */
async function fetchDemandAggregates(areaName) {
  if (!areaName) return [];

  const db = admin.firestore();
  const cropsSnapshot = await db
    .collection("demand_aggregates")
    .doc(areaName)
    .collection("crops")
    .get();

  if (cropsSnapshot.empty) return [];

  const crops = [];
  cropsSnapshot.forEach((doc) => {
    crops.push({
      crop: doc.id,
      ...doc.data(),
    });
  });

  return crops;
}

// ---------- Satellite Reports ----------

/**
 * Fetch the latest satellite report for a farmer's farm.
 */
async function fetchLatestSatelliteReport(farmerId, farmIndex) {
  const db = admin.firestore();

  const reportsSnapshot = await db
    .collection("satellite_reports")
    .doc(farmerId)
    .collection(String(farmIndex))
    .orderBy("generated_at", "desc")
    .limit(1)
    .get();

  if (reportsSnapshot.empty) return null;

  return reportsSnapshot.docs[0].data();
}

/**
 * Fetch all satellite reports across all farms for a farmer.
 * Returns an array of { farmIndex, report } objects.
 */
async function fetchAllSatelliteReports(farmerId, farmCount) {
  const reports = [];

  for (let i = 0; i < farmCount; i++) {
    const report = await fetchLatestSatelliteReport(farmerId, i);
    if (report) {
      reports.push({ farmIndex: i, report });
    }
  }

  return reports;
}

// ---------- Gemini AI Recommendation ----------

/**
 * Generate AI recommendations using Gemini.
 * Requires structured JSON output with recommended_crops, confidence, reasoning, etc.
 */
async function generateRecommendation(
  farmer,
  demandAggregates,
  satelliteReports,
  weatherData
) {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    console.warn("GEMINI_API_KEY not set — skipping recommendation.");
    return null;
  }

  const genAI = new GoogleGenerativeAI(geminiApiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  // Build demand context
  let demandContext;
  if (demandAggregates.length === 0) {
    demandContext = "No buyer demand data available for this area yet.";
  } else {
    const demandLines = demandAggregates.map(
      (d) =>
        `- ${d.crop}: ${d.total_weekly_kg} kg/week from ${d.buyer_count} buyer(s), trend: ${d.trend}`
    );
    demandContext = `Local buyer demand in ${farmer.area_name}:\n${demandLines.join("\n")}`;
  }

  // Build satellite context
  let satelliteContext;
  if (satelliteReports.length === 0) {
    satelliteContext =
      "No satellite monitoring data available yet. Farm boundaries may not be set up.";
  } else {
    const satLines = satelliteReports.map((sr) => {
      const r = sr.report;
      return `- Farm ${sr.farmIndex} ("${r.farm_name || "unnamed"}"): NDVI=${r.ndvi_average !== null ? r.ndvi_average.toFixed(4) : "N/A"}, NDWI=${r.ndwi_average !== null ? r.ndwi_average.toFixed(4) : "N/A"}, Health Score=${r.health_score !== null ? r.health_score + "/100" : "N/A"}, Alerts: ${r.alerts?.length || 0}`;
    });
    satelliteContext = `Satellite reports:\n${satLines.join("\n")}`;
  }

  // Build weather context
  const weatherContext = formatWeatherForPrompt(weatherData);

  // Build current crops context
  const farms = farmer.farms || [];
  let currentCropsContext;
  if (farms.length === 0) {
    currentCropsContext = "No farms registered.";
  } else {
    const farmLines = farms.map((f, i) => {
      const crops = (f.current_crops || [])
        .map(
          (c) =>
            `${c.crop} (planted: ${c.planted_date || "unknown"}, harvest: ${c.expected_harvest || "unknown"})`
        )
        .join(", ");
      return `- Farm ${i} ("${f.name || "unnamed"}", ${f.area_hectares || "?"} ha): ${crops || "no crops declared"}`;
    });
    currentCropsContext = `Current farms and crops:\n${farmLines.join("\n")}`;
  }

  const prompt = `You are an AI agricultural advisor for Malaysian smallholder farmers. Based on the following REAL data, recommend the top 3 crops this farmer should plant next.

FARMER: ${farmer.name || "Unknown"}, Area: ${farmer.area_name || "Unknown"}

${demandContext}

${satelliteContext}

${weatherContext}

${currentCropsContext}

IMPORTANT RULES:
- Only use the data provided above. Do NOT make up numbers.
- If data is unavailable, say so in the reasoning and lower your confidence.
- Consider Malaysian agricultural context (tropical climate, common crops).
- Show contradictory signals — do not hide bad news.
- All monetary values in MYR (Malaysian Ringgit).

Respond with ONLY valid JSON in this exact structure:
{
  "recommended_crops": [
    {
      "crop": "crop name",
      "confidence": 0.0 to 1.0,
      "reasoning": {
        "demand": "Cite exact buyer count, weekly kg, and trend from the data above. If no data, state that clearly.",
        "weather": "Cite exact forecast data from above. Explain suitability for this crop.",
        "market": "Based on demand trends and known Malaysian market conditions for this crop.",
        "farm_suitability": "Cite exact NDVI/NDWI values and health score. Explain what they mean for this crop."
      },
      "projected_profit": {
        "cost_per_hectare_myr": estimated cost number,
        "revenue_per_hectare_myr": estimated revenue number,
        "margin_per_hectare_myr": estimated margin number,
        "basis": "Brief explanation of how cost/revenue were estimated"
      }
    }
  ]
}

Return exactly 3 recommended crops, ordered by confidence (highest first).`;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Parse the JSON response
    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch (parseErr) {
      // Try to extract JSON from the response if it contains extra text
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error(
          `Failed to parse Gemini JSON response: ${parseErr.message}`
        );
      }
    }

    return parsed;
  } catch (err) {
    console.error("Gemini recommendation failed:", err.message);
    return null;
  }
}

// ---------- Write Recommendation to Firestore ----------

/**
 * Write the AI recommendation to Firestore.
 */
async function writeRecommendation(farmerId, recommendation, context) {
  const db = admin.firestore();
  const now = Date.now();
  const timestamp = String(now);

  const docRef = db
    .collection("ai_recommendations")
    .doc(farmerId)
    .collection("recommendations")
    .doc(timestamp);

  await docRef.set({
    recommended_crops: recommendation.recommended_crops || [],
    generated_at: admin.firestore.FieldValue.serverTimestamp(),
    trigger_source: context.triggerSource,
    data_sources: {
      demand_aggregates_count: context.demandCount,
      satellite_reports_count: context.satelliteCount,
      weather_available: context.weatherAvailable,
    },
  });

  // Also write a latest reference for easy querying
  const latestRef = db.collection("ai_recommendations").doc(farmerId);
  await latestRef.set(
    {
      latest_recommendation: {
        timestamp: now,
        recommended_crops: recommendation.recommended_crops || [],
        generated_at: admin.firestore.FieldValue.serverTimestamp(),
      },
    },
    { merge: true }
  );

  console.log(
    `Recommendation written for farmer ${farmerId} at timestamp ${timestamp}`
  );
}

// ---------- Core recommendation logic ----------

/**
 * Generate and write recommendations for a single farmer.
 */
async function processRecommendationForFarmer(
  farmerId,
  triggerSource
) {
  const db = admin.firestore();

  // Fetch farmer data
  const farmerDoc = await db.collection("farmers").doc(farmerId).get();
  if (!farmerDoc.exists) {
    console.log(`Farmer ${farmerId} not found — skipping recommendation.`);
    return;
  }

  const farmer = farmerDoc.data();
  const areaName = farmer.area_name;

  // Gather all context in parallel
  const farmCount = (farmer.farms || []).length;
  const [demandAggregates, satelliteReports, weatherData] =
    await Promise.all([
      fetchDemandAggregates(areaName),
      fetchAllSatelliteReports(farmerId, farmCount),
      fetchWeather(areaName),
    ]);

  // Generate recommendation via Gemini
  const recommendation = await generateRecommendation(
    farmer,
    demandAggregates,
    satelliteReports,
    weatherData
  );

  if (!recommendation) {
    console.log(
      `No recommendation generated for farmer ${farmerId} — Gemini may be unavailable.`
    );
    return;
  }

  // Write to Firestore
  await writeRecommendation(farmerId, recommendation, {
    triggerSource,
    demandCount: demandAggregates.length,
    satelliteCount: satelliteReports.length,
    weatherAvailable: weatherData !== null && weatherData.length > 0,
  });
}

// ---------- Cloud Functions ----------

/**
 * Trigger 1: When demand aggregates change for an area, regenerate
 * recommendations for all farmers in that area.
 */
const aiRecommendationOnDemand = onDocumentWritten(
  {
    document: "demand_aggregates/{area_name}/crops/{crop}",
    region: "asia-southeast1",
    timeoutSeconds: 300,
    memory: "512MiB",
  },
  async (event) => {
    const areaName = event.params.area_name;
    const crop = event.params.crop;

    console.log(
      `Demand aggregate updated for area "${areaName}", crop "${crop}" — generating recommendations.`
    );

    const db = admin.firestore();

    // Find all farmers in this area
    const farmersSnapshot = await db
      .collection("farmers")
      .where("area_name", "==", areaName)
      .get();

    if (farmersSnapshot.empty) {
      console.log(
        `No farmers found in area "${areaName}" — no recommendations to generate.`
      );
      return null;
    }

    // Process recommendations for each farmer in the area
    // Use sequential processing to avoid overwhelming Gemini API rate limits
    for (const farmerDoc of farmersSnapshot.docs) {
      try {
        await processRecommendationForFarmer(
          farmerDoc.id,
          `demand_aggregate:${areaName}/${crop}`
        );
      } catch (err) {
        console.error(
          `Failed to generate recommendation for farmer ${farmerDoc.id}:`,
          err.message
        );
      }
    }

    return null;
  }
);

/**
 * Trigger 2: When a new satellite report is written, regenerate
 * recommendations for that specific farmer.
 */
const aiRecommendationOnSatellite = onDocumentWritten(
  {
    document: "satellite_reports/{farmerId}/{farmIndex}/{date}",
    region: "asia-southeast1",
    timeoutSeconds: 300,
    memory: "512MiB",
  },
  async (event) => {
    const farmerId = event.params.farmerId;
    const farmIndex = event.params.farmIndex;
    const date = event.params.date;

    console.log(
      `Satellite report written for farmer "${farmerId}", farm ${farmIndex}, date ${date} — generating recommendation.`
    );

    try {
      await processRecommendationForFarmer(
        farmerId,
        `satellite_report:${farmIndex}/${date}`
      );
    } catch (err) {
      console.error(
        `Failed to generate recommendation for farmer ${farmerId}:`,
        err.message
      );
    }

    return null;
  }
);

module.exports = { aiRecommendationOnDemand, aiRecommendationOnSatellite };
