/**
 * satelliteReport.js
 *
 * Scheduled function: runs every 5 days (aligned with Sentinel-2 revisit cycle).
 * Also exposed as an HTTP endpoint for manual testing.
 *
 * For each farmer who has farms with valid boundaries:
 *   1. Fetch NDVI and NDWI data from Google Earth Engine REST API
 *   2. Calculate health_score (0-100) based on NDVI average
 *   3. Use Gemini to generate AI analysis of the satellite data
 *   4. Write report to satellite_reports/{farmerId}/{farmIndex}/{reportDate}
 */

const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { GoogleAuth } = require("google-auth-library");

// ---------- Configuration ----------

const GEE_SCOPES = ["https://www.googleapis.com/auth/earthengine"];
const SENTINEL2_COLLECTION = "COPERNICUS/S2_SR_HARMONIZED";

// ---------- Google Earth Engine REST API helpers ----------

/**
 * Get an authenticated HTTP client for Earth Engine REST API.
 * Uses Application Default Credentials (the Cloud Functions service account).
 */
async function getGeeAuthClient() {
  const auth = new GoogleAuth({ scopes: GEE_SCOPES });
  const client = await auth.getClient();
  return client;
}

/**
 * Get the GCP project ID from environment or metadata server.
 */
async function getProjectId() {
  const auth = new GoogleAuth();
  return await auth.getProjectId();
}

/**
 * Convert a GeoJSON polygon to Earth Engine REST API geometry format.
 */
function geoJsonToEeGeometry(geoJson) {
  let coordinates;
  if (typeof geoJson === "string") {
    try {
      geoJson = JSON.parse(geoJson);
    } catch(e) {}
  }

  if (geoJson.type === "Polygon") {
    coordinates = typeof geoJson.coordinates === 'string' ? JSON.parse(geoJson.coordinates) : geoJson.coordinates;
  } else if (geoJson.type === "Feature") {
    coordinates = typeof geoJson.geometry.coordinates === 'string' ? JSON.parse(geoJson.geometry.coordinates) : geoJson.geometry.coordinates;
  } else if (Array.isArray(geoJson)) {
    coordinates = [geoJson];
  } else if (geoJson.coordinates) {
    coordinates = typeof geoJson.coordinates === 'string' ? JSON.parse(geoJson.coordinates) : geoJson.coordinates;
  } else {
    return null;
  }

  return { type: "Polygon", coordinates };
}

/**
 * Fetch NDVI and NDWI for a farm polygon using the GEE REST API.
 * Uses ImageCollection.mosaic alongside proper REST API functional mapping
 * for date filters.
 */
async function fetchNdviNdwi(geomGeojson, dateEnd) {
  const client = await getGeeAuthClient();
  const projectId = await getProjectId();

  const geometry = geoJsonToEeGeometry(geomGeojson);
  if (!geometry) throw new Error("Invalid geometry");

  // 15-day window to ensure at least one Sentinel-2 pass
  const dateStart = new Date(dateEnd);
  dateStart.setDate(dateStart.getDate() - 15);
  const startStr = dateStart.toISOString().split("T")[0];
  const endStr = dateEnd instanceof Date
    ? dateEnd.toISOString().split("T")[0]
    : dateEnd;

  const baseUrl = `https://earthengine.googleapis.com/v1/projects/${projectId}/value:compute`;

  function buildReduceExpression(bands, geom) {
    // Use flat values map with valueReference so each function result
    // is properly typed by the GEE evaluation engine (fixes Dictionary vs Geometry error)
    return {
      expression: {
        result: "reduceResult",
        values: {
          "dateRange": {
            functionInvocationValue: {
              functionName: "DateRange",
              arguments: {
                start: { constantValue: startStr },
                end: { constantValue: endStr },
              },
            },
          },
          "dateFilter": {
            functionInvocationValue: {
              functionName: "Filter.dateRangeContains",
              arguments: {
                leftValue: { valueReference: "dateRange" },
                rightField: { constantValue: "system:time_start" },
              },
            },
          },
          "collection": {
            functionInvocationValue: {
              functionName: "ImageCollection.load",
              arguments: {
                id: { constantValue: SENTINEL2_COLLECTION },
              },
            },
          },
          "filtered": {
            functionInvocationValue: {
              functionName: "Collection.filter",
              arguments: {
                collection: { valueReference: "collection" },
                filter: { valueReference: "dateFilter" },
              },
            },
          },
          "mosaic": {
            functionInvocationValue: {
              functionName: "ImageCollection.mosaic",
              arguments: {
                collection: { valueReference: "filtered" },
              },
            },
          },
          "ndImage": {
            functionInvocationValue: {
              functionName: "Image.normalizedDifference",
              arguments: {
                input: { valueReference: "mosaic" },
                bandNames: { constantValue: bands },
              },
            },
          },
          "geometry": {
            functionInvocationValue: {
              functionName: "GeometryConstructors.Polygon",
              arguments: {
                coordinates: { constantValue: geom.coordinates },
              },
            },
          },
          "reducer": {
            functionInvocationValue: {
              functionName: "Reducer.mean",
              arguments: {},
            },
          },
          "reduceResult": {
            functionInvocationValue: {
              functionName: "Image.reduceRegion",
              arguments: {
                image: { valueReference: "ndImage" },
                reducer: { valueReference: "reducer" },
                geometry: { valueReference: "geometry" },
                scale: { constantValue: 10 },
                bestEffort: { constantValue: true },
              },
            },
          },
        },
      },
    };
  }

  const ndviPayload = buildReduceExpression(["B8", "B4"], geometry);
  const ndwiPayload = buildReduceExpression(["B3", "B8"], geometry);

  const [ndviResponse, ndwiResponse] = await Promise.all([
    client.request({ url: baseUrl, method: "POST", data: ndviPayload }),
    client.request({ url: baseUrl, method: "POST", data: ndwiPayload }),
  ]);

  const ndviResult = ndviResponse.data?.result || {};
  const ndwiResult = ndwiResponse.data?.result || {};

  const ndviAvg = typeof ndviResult.nd === "number" ? ndviResult.nd : null;
  const ndwiAvg = typeof ndwiResult.nd === "number" ? ndwiResult.nd : null;

  console.log(`GEE result — NDVI: ${ndviAvg}, NDWI: ${ndwiAvg}`);
  return { ndviAvg, ndwiAvg };
}

// ---------- Health Score Calculation ----------

/**
 * Convert NDVI average to a health score (0-100).
 *
 * NDVI ranges:
 *   < 0.0  : bare soil / water (score 0-10)
 *   0.0-0.2: sparse vegetation (score 10-30)
 *   0.2-0.4: moderate vegetation (score 30-55)
 *   0.4-0.6: healthy vegetation (score 55-75)
 *   0.6-0.8: very healthy (score 75-90)
 *   0.8-1.0: extremely healthy / dense canopy (score 90-100)
 */
function calculateHealthScore(ndviAvg) {
  if (ndviAvg === null || ndviAvg === undefined || isNaN(ndviAvg)) {
    return null;
  }
  const clamped = Math.max(-0.1, Math.min(1.0, ndviAvg));
  const score = ((clamped + 0.1) / 1.1) * 100;
  return Math.round(Math.max(0, Math.min(100, score)));
}

/**
 * Generate alert messages based on NDVI and NDWI values.
 */
function generateAlerts(ndviAvg, ndwiAvg) {
  const alerts = [];

  if (ndviAvg !== null && ndviAvg < 0.2) {
    alerts.push({
      zone: "overall",
      severity: "critical",
      message: "Very low vegetation index detected. Possible crop failure, bare soil, or recent harvest.",
    });
  } else if (ndviAvg !== null && ndviAvg < 0.4) {
    alerts.push({
      zone: "overall",
      severity: "warning",
      message: "Below-average vegetation health. Crops may be experiencing stress from drought, pests, or nutrient deficiency.",
    });
  }

  if (ndwiAvg !== null && ndwiAvg < -0.1) {
    alerts.push({
      zone: "overall",
      severity: "warning",
      message: "Low water content detected in vegetation. Irrigation may be needed.",
    });
  } else if (ndwiAvg !== null && ndwiAvg > 0.3) {
    alerts.push({
      zone: "overall",
      severity: "info",
      message: "High water content detected. Possible waterlogging or recent heavy rainfall.",
    });
  }

  return alerts;
}

// ---------- Gemini AI Analysis ----------

async function generateAiAnalysis(farmerName, farmName, ndviAvg, ndwiAvg, healthScore, alerts, currentCrops) {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    console.warn("GEMINI_API_KEY not set — skipping AI analysis.");
    return "AI analysis unavailable: API key not configured.";
  }

  const genAI = new GoogleGenerativeAI(geminiApiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const cropsInfo = currentCrops && currentCrops.length > 0
    ? currentCrops.map((c) => `${c.crop} (planted: ${c.planted_date || "unknown"}, expected harvest: ${c.expected_harvest || "unknown"})`).join(", ")
    : "No crops currently declared.";

  const prompt = `You are an agricultural satellite monitoring expert for Malaysian smallholder farms.

Analyze the following satellite data for farmer "${farmerName}", farm "${farmName}":

SATELLITE DATA:
- NDVI Average: ${ndviAvg !== null ? ndviAvg.toFixed(4) : "unavailable"}
- NDWI Average: ${ndwiAvg !== null ? ndwiAvg.toFixed(4) : "unavailable"}
- Health Score: ${healthScore !== null ? healthScore + "/100" : "unavailable"}
- Alerts: ${alerts.length > 0 ? JSON.stringify(alerts) : "None"}

CURRENT CROPS: ${cropsInfo}

Provide a concise analysis (3-5 sentences) covering:
1. Overall farm health assessment based on the NDVI/NDWI values
2. What the readings suggest about crop growth stage and condition
3. Any actionable recommendations (irrigation, fertilizer, pest inspection)
4. Cite the exact NDVI/NDWI numbers in your response

Respond in English. Be specific and practical — this farmer needs actionable advice, not general theory.`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (err) {
    console.error("Gemini AI analysis failed:", err.message);
    return `AI analysis generation failed: ${err.message}`;
  }
}

// ---------- Core Report Generation Logic ----------

async function generateAllReports() {
  const db = admin.firestore();
  const farmersSnapshot = await db.collection("farmers").get();

  if (farmersSnapshot.empty) {
    console.log("No farmers found in Firestore — nothing to process.");
    return { processed: 0, skipped: 0, errors: 0 };
  }

  let processed = 0;
  let skipped = 0;
  let errors = 0;
  const today = new Date();
  const reportDate = today.toISOString().split("T")[0];

  for (const farmerDoc of farmersSnapshot.docs) {
    const farmerId = farmerDoc.id;
    const farmer = farmerDoc.data();
    const farms = farmer.farms || [];

    if (farms.length === 0) {
      console.log(`Farmer ${farmerId} has no farms — skipping.`);
      skipped++;
      continue;
    }

    for (let farmIndex = 0; farmIndex < farms.length; farmIndex++) {
      const farm = farms[farmIndex];

      if (!farm.boundary) {
        console.log(`Farmer ${farmerId}, farm ${farmIndex} ("${farm.name || "unnamed"}") has no boundary — skipping.`);
        skipped++;
        continue;
      }

      const geometry = geoJsonToEeGeometry(farm.boundary);
      if (!geometry) {
        console.log(`Farmer ${farmerId}, farm ${farmIndex}: invalid boundary format — skipping.`);
        skipped++;
        continue;
      }

      try {
        const { ndviAvg, ndwiAvg } = await fetchNdviNdwi(geometry, today);
        const healthScore = calculateHealthScore(ndviAvg);
        const alerts = generateAlerts(ndviAvg, ndwiAvg);

        const aiAnalysis = await generateAiAnalysis(
          farmer.name || farmerId,
          farm.name || `Farm ${farmIndex + 1}`,
          ndviAvg,
          ndwiAvg,
          healthScore,
          alerts,
          farm.current_crops || []
        );

        const reportRef = db
          .collection("satellite_reports")
          .doc(farmerId)
          .collection(String(farmIndex))
          .doc(reportDate);

        await reportRef.set({
          ndvi_average: ndviAvg,
          ndwi_average: ndwiAvg,
          health_score: healthScore,
          ai_analysis: aiAnalysis,
          alerts,
          current_crops: farm.current_crops || [],
          farm_name: farm.name || `Farm ${farmIndex + 1}`,
          area_hectares: farm.area_hectares || null,
          generated_at: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(`Report generated: farmer=${farmerId}, farm=${farmIndex}, NDVI=${ndviAvg?.toFixed(4)}, health=${healthScore}`);
        processed++;
      } catch (err) {
        console.error(`Error processing farmer ${farmerId}, farm ${farmIndex}:`, err.message);
        errors++;
      }
    }
  }

  const summary = { processed, skipped, errors };
  console.log("Satellite report generation complete:", summary);
  return summary;
}

// ---------- Cloud Functions ----------

const scheduledSatelliteReport = onSchedule(
  {
    schedule: "every 120 hours",
    region: "asia-southeast1",
    timeoutSeconds: 540,
    memory: "1GiB",
  },
  async (_event) => {
    await generateAllReports();
  }
);

const httpSatelliteReport = onRequest(
  {
    region: "asia-southeast1",
    timeoutSeconds: 540,
    memory: "1GiB",
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed. Use POST." });
      return;
    }

    try {
      const summary = await generateAllReports();
      res.status(200).json({
        status: "ok",
        message: "Satellite report generation complete.",
        ...summary,
      });
    } catch (err) {
      console.error("HTTP satellite report failed:", err);
      res.status(500).json({ status: "error", message: err.message });
    }
  }
);

module.exports = { scheduledSatelliteReport, httpSatelliteReport };
