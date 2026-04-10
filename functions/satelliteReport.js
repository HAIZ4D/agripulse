/**
 * satelliteReport.js
 *
 * Scheduled function: runs every 5 days (aligned with Sentinel-2 revisit cycle).
 * Also exposed as an HTTP endpoint for manual testing.
 *
 * For each farmer who has farms with valid boundaries:
 *   1. Divide the farm into 20m x 20m micro-zones using @turf/turf
 *   2. Fetch NDVI, NDWI, and NDRE for each zone via GEE REST API
 *      (30-day cloud-masked median composite for Malaysian cloud cover)
 *   3. Classify each zone: healthy / moderate / critical
 *   4. Detect change vs previous satellite scan
 *   5. Compute farm-wide averages and zone statistics
 *   6. Use Gemini AI to generate zone-aware natural language analysis
 *   7. Write full report to satellite_reports/{farmerId}/{farmIndex}/{reportDate}
 */

const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { GoogleAuth } = require("google-auth-library");
const turf = require("@turf/turf");

// ---------- Configuration ----------

const GEE_SCOPES = ["https://www.googleapis.com/auth/earthengine"];
const SENTINEL2_COLLECTION = "COPERNICUS/S2_SR_HARMONIZED";
const ZONE_CELL_SIZE_KM = 0.02;   // 20m × 20m micro-zones
const COMPOSITE_DAYS = 30;         // 30-day window for cloud resistance
const MAX_CLOUDY_PCT = 50;         // filter images cloudier than this
const MIN_ZONE_AREA_SQM = 50;      // discard tiny slivers after intersection

// ---------- Authentication ----------

async function getGeeAuthClient() {
  const auth = new GoogleAuth({ scopes: GEE_SCOPES });
  return await auth.getClient();
}

async function getProjectId() {
  const auth = new GoogleAuth();
  return await auth.getProjectId();
}

// ---------- GEE Geometry Helpers ----------

function geoJsonToEeGeometry(geoJson) {
  let coordinates;
  if (typeof geoJson === "string") {
    try { geoJson = JSON.parse(geoJson); } catch (e) {}
  }

  if (geoJson.type === "Polygon") {
    coordinates = typeof geoJson.coordinates === "string"
      ? JSON.parse(geoJson.coordinates) : geoJson.coordinates;
  } else if (geoJson.type === "Feature") {
    coordinates = typeof geoJson.geometry.coordinates === "string"
      ? JSON.parse(geoJson.geometry.coordinates) : geoJson.geometry.coordinates;
  } else if (Array.isArray(geoJson)) {
    coordinates = [geoJson];
  } else if (geoJson.coordinates) {
    coordinates = typeof geoJson.coordinates === "string"
      ? JSON.parse(geoJson.coordinates) : geoJson.coordinates;
  } else {
    return null;
  }

  // Ensure it's an outer ring array (Polygon coords are [[[lng,lat],...]])
  if (Array.isArray(coordinates[0]) && typeof coordinates[0][0] === "number") {
    coordinates = [coordinates]; // wrap single ring
  }

  return { type: "Polygon", coordinates };
}

// ---------- Farm Zone Generation (turf.js) ----------

/**
 * Divide a farm boundary into a grid of ~20m micro-zones.
 * Returns an array of zone objects with polygon coordinates and centroid.
 */
function generateFarmZones(farmBoundary) {
  try {
    const geom = geoJsonToEeGeometry(farmBoundary);
    if (!geom) return [];

    const farmFeature = turf.feature(geom);
    const bbox = turf.bbox(farmFeature);

    // Dynamically scale zone size for large farms to cap at ~50 zones
    const farmAreaKm2 = turf.area(farmFeature) / 1e6;
    const maxZones = 50;
    // Each cell covers cellSize^2 km2, so cellSize = sqrt(farmArea / maxZones)
    const minCellSize = Math.sqrt(farmAreaKm2 / maxZones);
    const cellSize = Math.max(ZONE_CELL_SIZE_KM, minCellSize);
    console.log(`  Farm area: ${farmAreaKm2.toFixed(4)} km², zone cell size: ${(cellSize * 1000).toFixed(0)}m`);

    const grid = turf.squareGrid(bbox, cellSize, { units: "kilometers" });

    const zones = [];
    let zoneIndex = 0;

    for (const cell of grid.features) {
      try {
        const intersection = turf.intersect(turf.featureCollection([farmFeature, cell]));
        if (!intersection) continue;

        const areaSqM = turf.area(intersection);
        if (areaSqM < MIN_ZONE_AREA_SQM) continue;

        const centroid = turf.centroid(intersection);

        // Ensure coordinates are a simple Polygon ring array for GEE
        let coords = intersection.geometry.coordinates;
        if (intersection.geometry.type === "MultiPolygon") {
          // Take the largest ring for MultiPolygon (edge-of-boundary artefacts)
          coords = coords.reduce((best, ring) => {
            const a = turf.area(turf.polygon(ring));
            const b = best ? turf.area(turf.polygon(best)) : 0;
            return a > b ? ring : best;
          }, null);
        }

        zones.push({
          zone_id: `z_${zoneIndex}`,
          coordinates: coords,     // [[[lng,lat],...]] format
          center: centroid.geometry.coordinates,   // [lng, lat]
          area_sqm: Math.round(areaSqM),
        });
        zoneIndex++;
      } catch (_e) {
        // Skip if intersection fails (non-overlapping cells)
      }
    }

    console.log(`Generated ${zones.length} zones for farm boundary.`);
    return zones;
  } catch (err) {
    console.error("Zone generation failed:", err.message);
    return [];
  }
}

// ---------- GEE REST API — Multi-Index Fetch ----------

/**
 * Build a GEE expression payload that:
 *   - Loads Sentinel-2 SR collection
 *   - Filters to last COMPOSITE_DAYS days
 *   - Filters by CLOUDY_PIXEL_PERCENTAGE < MAX_CLOUDY_PCT
 *   - Takes a median composite (cloud resistant)
 *   - Computes normalizedDifference for the given bands
 *   - Reduces to a mean value over the given polygon coordinates
 */
function buildIndexExpression(coordinates, bands, dateEnd) {
  const endStr = dateEnd instanceof Date
    ? dateEnd.toISOString().split("T")[0]
    : dateEnd;
  const startDate = new Date(dateEnd);
  startDate.setDate(startDate.getDate() - COMPOSITE_DAYS);
  const startStr = startDate.toISOString().split("T")[0];

  // Ensure coords are double-wrapped for Polygon
  let polyCoords = coordinates;
  if (Array.isArray(coordinates[0]) && typeof coordinates[0][0] === "number") {
    polyCoords = [coordinates]; // single ring → [[...]]
  }

  return {
    expression: {
      result: "reduceResult",
      values: {
        dateRange: {
          functionInvocationValue: {
            functionName: "DateRange",
            arguments: {
              start: { constantValue: startStr },
              end: { constantValue: endStr },
            },
          },
        },
        dateFilter: {
          functionInvocationValue: {
            functionName: "Filter.dateRangeContains",
            arguments: {
              leftValue: { valueReference: "dateRange" },
              rightField: { constantValue: "system:time_start" },
            },
          },
        },
        cloudFilter: {
          functionInvocationValue: {
            functionName: "Filter.lessThan",
            arguments: {
              leftField: { constantValue: "CLOUDY_PIXEL_PERCENTAGE" },
              rightValue: { constantValue: MAX_CLOUDY_PCT },
            },
          },
        },
        collection: {
          functionInvocationValue: {
            functionName: "ImageCollection.load",
            arguments: {
              id: { constantValue: SENTINEL2_COLLECTION },
            },
          },
        },
        datFiltered: {
          functionInvocationValue: {
            functionName: "Collection.filter",
            arguments: {
              collection: { valueReference: "collection" },
              filter: { valueReference: "dateFilter" },
            },
          },
        },
        filtered: {
          functionInvocationValue: {
            functionName: "Collection.filter",
            arguments: {
              collection: { valueReference: "datFiltered" },
              filter: { valueReference: "cloudFilter" },
            },
          },
        },
        medianReducer: {
          functionInvocationValue: {
            functionName: "Reducer.median",
            arguments: {},
          },
        },
        rawComposite: {
          functionInvocationValue: {
            functionName: "ImageCollection.reduce",
            arguments: {
              collection: { valueReference: "filtered" },
              reducer: { valueReference: "medianReducer" },
            },
          },
        },
        composite: {
          functionInvocationValue: {
            functionName: "Image.select",
            arguments: {
              input: { valueReference: "rawComposite" },
              bandSelectors: { constantValue: ["B2_median", "B3_median", "B4_median", "B5_median", "B8_median"] },
              newNames: { constantValue: ["B2", "B3", "B4", "B5", "B8"] },
            },
          },
        },
        ndImage: {
          functionInvocationValue: {
            functionName: "Image.normalizedDifference",
            arguments: {
              input: { valueReference: "composite" },
              bandNames: { constantValue: bands },
            },
          },
        },
        geometry: {
          functionInvocationValue: {
            functionName: "GeometryConstructors.Polygon",
            arguments: {
              coordinates: { constantValue: polyCoords },
            },
          },
        },
        reducer: {
          functionInvocationValue: {
            functionName: "Reducer.mean",
            arguments: {},
          },
        },
        reduceResult: {
          functionInvocationValue: {
            functionName: "Image.reduceRegion",
            arguments: {
              image: { valueReference: "ndImage" },
              reducer: { valueReference: "reducer" },
              geometry: { valueReference: "geometry" },
              scale: { constantValue: 20 },
              bestEffort: { constantValue: true },
              maxPixels: { constantValue: 1e6 },
            },
          },
        },
      },
    },
  };
}

/* EVI builder — unused (only NDVI/NDWI/NDRE active)
function _buildEviExpression(coordinates, dateEnd) {
  const endStr = dateEnd instanceof Date
    ? dateEnd.toISOString().split("T")[0]
    : dateEnd;
  const startDate = new Date(dateEnd);
  startDate.setDate(startDate.getDate() - COMPOSITE_DAYS);
  const startStr = startDate.toISOString().split("T")[0];

  let polyCoords = coordinates;
  if (Array.isArray(coordinates[0]) && typeof coordinates[0][0] === "number") {
    polyCoords = [coordinates];
  }

  return {
    expression: {
      result: "reduceResult",
      values: {
        dateRange: {
          functionInvocationValue: {
            functionName: "DateRange",
            arguments: {
              start: { constantValue: startStr },
              end: { constantValue: endStr },
            },
          },
        },
        dateFilter: {
          functionInvocationValue: {
            functionName: "Filter.dateRangeContains",
            arguments: {
              leftValue: { valueReference: "dateRange" },
              rightField: { constantValue: "system:time_start" },
            },
          },
        },
        cloudFilter: {
          functionInvocationValue: {
            functionName: "Filter.lessThan",
            arguments: {
              leftField: { constantValue: "CLOUDY_PIXEL_PERCENTAGE" },
              rightValue: { constantValue: MAX_CLOUDY_PCT },
            },
          },
        },
        collection: {
          functionInvocationValue: {
            functionName: "ImageCollection.load",
            arguments: {
              id: { constantValue: SENTINEL2_COLLECTION },
            },
          },
        },
        datFiltered: {
          functionInvocationValue: {
            functionName: "Collection.filter",
            arguments: {
              collection: { valueReference: "collection" },
              filter: { valueReference: "dateFilter" },
            },
          },
        },
        filtered: {
          functionInvocationValue: {
            functionName: "Collection.filter",
            arguments: {
              collection: { valueReference: "datFiltered" },
              filter: { valueReference: "cloudFilter" },
            },
          },
        },
        medianReducer: {
          functionInvocationValue: {
            functionName: "Reducer.median",
            arguments: {},
          },
        },
        rawComposite: {
          functionInvocationValue: {
            functionName: "ImageCollection.reduce",
            arguments: {
              collection: { valueReference: "filtered" },
              reducer: { valueReference: "medianReducer" },
            },
          },
        },
        composite: {
          functionInvocationValue: {
            functionName: "Image.select",
            arguments: {
              input: { valueReference: "rawComposite" },
              bandSelectors: { constantValue: ["B2_median", "B3_median", "B4_median", "B5_median", "B8_median"] },
              newNames: { constantValue: ["B2", "B3", "B4", "B5", "B8"] },
            },
          },
        },
        eviImage: {
          functionInvocationValue: {
            functionName: "Image.expression",
            arguments: {
              expression: { constantValue: "2.5 * (NIR - RED) / (NIR + 6.0 * RED - 7.5 * BLUE + 10000)" },
              map: {
                functionInvocationValue: {
                  functionName: "Dictionary.fromLists",
                  arguments: {
                    keys: { constantValue: ["NIR", "RED", "BLUE"] },
                    values: {
                      arrayValue: {
                        values: [
                          {
                            functionInvocationValue: {
                              functionName: "Image.select",
                              arguments: {
                                input: { valueReference: "composite" },
                                bandSelectors: { constantValue: ["B8"] },
                              },
                            },
                          },
                          {
                            functionInvocationValue: {
                              functionName: "Image.select",
                              arguments: {
                                input: { valueReference: "composite" },
                                bandSelectors: { constantValue: ["B4"] },
                              },
                            },
                          },
                          {
                            functionInvocationValue: {
                              functionName: "Image.select",
                              arguments: {
                                input: { valueReference: "composite" },
                                bandSelectors: { constantValue: ["B2"] },
                              },
                            },
                          },
                        ],
                      },
                    },
                  },
                },
              },
            },
          },
        },
        geometry: {
          functionInvocationValue: {
            functionName: "GeometryConstructors.Polygon",
            arguments: {
              coordinates: { constantValue: polyCoords },
            },
          },
        },
        reducer: {
          functionInvocationValue: {
            functionName: "Reducer.mean",
            arguments: {},
          },
        },
        reduceResult: {
          functionInvocationValue: {
            functionName: "Image.reduceRegion",
            arguments: {
              image: { valueReference: "eviImage" },
              reducer: { valueReference: "reducer" },
              geometry: { valueReference: "geometry" },
              scale: { constantValue: 20 },
              bestEffort: { constantValue: true },
              maxPixels: { constantValue: 1e6 },
            },
          },
        },
      },
    },
  };
}
END OF EVI BLOCK */

/**
 * Fetch a single index (NDVI / NDWI / NDRE) for a polygon using GEE REST API.
 * Returns the mean value or null if unavailable.
 */
async function fetchIndex(client, projectId, coordinates, bands, dateEnd) {
  const baseUrl = `https://earthengine.googleapis.com/v1/projects/${projectId}/value:compute`;
  const payload = buildIndexExpression(coordinates, bands, dateEnd);

  try {
    const response = await client.request({
      url: baseUrl,
      method: "POST",
      data: payload,
    });
    const result = response.data?.result || {};
    const value = typeof result.nd === "number" ? result.nd : null;
    return value;
  } catch (err) {
    console.warn(`GEE fetch failed for bands ${bands}:`, err.message);
    return null;
  }
}

/**
 * Fetch NDVI, NDWI, and NDRE for a polygon in parallel.
 * Returns { ndvi, ndwi, ndre }.
 */
async function fetchThreeIndices(client, projectId, coordinates, dateEnd) {
  const [ndvi, ndwi, ndre] = await Promise.all([
    fetchIndex(client, projectId, coordinates, ["B8", "B4"], dateEnd),   // NDVI
    fetchIndex(client, projectId, coordinates, ["B3", "B8"], dateEnd),   // NDWI
    fetchIndex(client, projectId, coordinates, ["B8", "B5"], dateEnd),   // NDRE
  ]);
  return { ndvi, ndwi, ndre };
}

// ---------- (Heatmap rendering is done client-side via zone data) ----------

// ---------- Zone Classification ----------

/**
 * Classify a zone based on NDVI, NDWI, NDRE.
 * Returns { classification, action_needed }.
 *
 * Priority: critical conditions take precedence over moderate.
 */
function classifyZone(ndvi, ndwi, ndre) {
  // Critical: very low biomass
  if (ndvi !== null && ndvi < 0.15) {
    return { classification: "critical", action_needed: "inspect" };
  }
  // Critical: severe water stress
  if (ndwi !== null && ndwi < -0.35) {
    return { classification: "critical", action_needed: "irrigate" };
  }
  // Critical: severe nitrogen/chlorophyll deficiency (NDRE)
  if (ndre !== null && ndre < 0.18) {
    return { classification: "critical", action_needed: "fertilize" };
  }
  // Moderate: low-moderate biomass
  if (ndvi !== null && ndvi < 0.30) {
    return { classification: "moderate", action_needed: "monitor" };
  }
  // Moderate: water stress
  if (ndwi !== null && ndwi < -0.20) {
    return { classification: "moderate", action_needed: "irrigate" };
  }
  // Moderate: mild nutrient stress
  if (ndre !== null && ndre < 0.28) {
    return { classification: "moderate", action_needed: "fertilize" };
  }
  // Healthy
  if (ndvi !== null && ndvi >= 0.45) {
    return { classification: "healthy", action_needed: null };
  }
  // Default: moderate
  return { classification: "moderate", action_needed: "monitor" };
}

/**
 * Detect change for a zone vs previous scan NDVI.
 * Returns { change_ndvi, change_trend }.
 */
function detectZoneChange(currentNdvi, previousNdvi) {
  if (currentNdvi === null || previousNdvi === null) {
    return { change_ndvi: null, change_trend: "new" };
  }
  const delta = currentNdvi - previousNdvi;
  let change_trend;
  if (delta > 0.05) change_trend = "improving";
  else if (delta < -0.05) change_trend = "declining";
  else change_trend = "stable";
  return { change_ndvi: parseFloat(delta.toFixed(4)), change_trend };
}

// ---------- Health Score (unchanged from original) ----------

function calculateHealthScore(ndviAvg) {
  if (ndviAvg === null || ndviAvg === undefined || isNaN(ndviAvg)) return null;
  const clamped = Math.max(-0.1, Math.min(1.0, ndviAvg));
  const score = ((clamped + 0.1) / 1.1) * 100;
  return Math.round(Math.max(0, Math.min(100, score)));
}

function generateAlerts(ndviAvg, ndwiAvg, zoneCriticalCount) {
  const alerts = [];
  if (ndviAvg !== null && ndviAvg < 0.2) {
    alerts.push({ zone: "overall", severity: "critical", message: "Very low vegetation index. Possible crop failure, bare soil, or recent harvest." });
  } else if (ndviAvg !== null && ndviAvg < 0.4) {
    alerts.push({ zone: "overall", severity: "warning", message: "Below-average vegetation health. Crops may be experiencing stress." });
  }
  if (ndwiAvg !== null && ndwiAvg < -0.1) {
    alerts.push({ zone: "overall", severity: "warning", message: "Low water content detected. Irrigation may be needed." });
  } else if (ndwiAvg !== null && ndwiAvg > 0.3) {
    alerts.push({ zone: "overall", severity: "info", message: "High water content. Possible waterlogging or recent heavy rain." });
  }
  if (zoneCriticalCount > 0) {
    alerts.push({ zone: "zones", severity: "critical", message: `${zoneCriticalCount} micro-zone(s) classified as critical and require immediate attention.` });
  }
  return alerts;
}

// ---------- Gemini AI Analysis ----------

async function generateAiAnalysis(
  farmerName, farmName, ndviAvg, ndwiAvg, ndreAvg, healthScore,
  alerts, currentCrops, zoneStats, changeDetection, criticalZones
) {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    console.warn("GEMINI_API_KEY not set — skipping AI analysis.");
    return "AI analysis unavailable: API key not configured.";
  }

  const genAI = new GoogleGenerativeAI(geminiApiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const cropsInfo = currentCrops && currentCrops.length > 0
    ? currentCrops.map((c) => `${c.crop} (planted: ${c.planted_date || "unknown"})`).join(", ")
    : "No crops currently declared.";

  const zoneContext = zoneStats
    ? `FARM ZONING ANALYSIS (${zoneStats.total_zones} zones total):
- Healthy zones: ${zoneStats.healthy_count} (${Math.round(zoneStats.healthy_count / zoneStats.total_zones * 100)}%)
- Moderate stress zones: ${zoneStats.moderate_count} (${Math.round(zoneStats.moderate_count / zoneStats.total_zones * 100)}%)  
- Critical zones: ${zoneStats.critical_count} (${Math.round(zoneStats.critical_count / zoneStats.total_zones * 100)}%)
- Average NDRE across zones: ${ndreAvg !== null ? ndreAvg.toFixed(4) : "unavailable"}
${criticalZones && criticalZones.length > 0 ? `
CRITICAL ZONE DETAILS:
${criticalZones.map(z => `- Zone ${z.zone_id}: NDVI=${z.ndvi?.toFixed(3) ?? "N/A"}, NDWI=${z.ndwi?.toFixed(3) ?? "N/A"}, NDRE=${z.ndre?.toFixed(3) ?? "N/A"} → Action needed: ${z.action_needed}`).join("\n")}` : ""}`
    : "Zone analysis not available for this report.";

  const changeContext = changeDetection
    ? `CHANGE DETECTION vs previous scan:
- Improved zones: ${changeDetection.zones_improved}
- Declined zones: ${changeDetection.zones_declined}
- Stable zones: ${changeDetection.zones_stable}
- Newly critical: ${changeDetection.zones_critical_new}
- Overall trend: ${changeDetection.overall_trend}`
    : "No previous scan for comparison.";

  const prompt = `You are an agricultural satellite monitoring expert for Malaysian smallholder farms with precision zoning capability.

Analyze the following satellite data for farmer "${farmerName}", farm "${farmName}":

FARM-WIDE INDICES (30-day cloud-resistant composite):
- NDVI (vegetation health): ${ndviAvg !== null ? ndviAvg.toFixed(4) : "unavailable"}
- NDWI (water content): ${ndwiAvg !== null ? ndwiAvg.toFixed(4) : "unavailable"}
- NDRE (early stress signal): ${ndreAvg !== null ? ndreAvg.toFixed(4) : "unavailable"}
- Health Score: ${healthScore !== null ? healthScore + "/100" : "unavailable"}
- Alerts: ${alerts.length > 0 ? JSON.stringify(alerts) : "None"}

${zoneContext}

${changeContext}

CURRENT CROPS: ${cropsInfo}

Provide a concise, actionable analysis (4-6 sentences) covering:
1. Overall farm health based on all three indices (NDVI, NDWI, NDRE)
2. Zone-level insights — specifically WHERE problems are and WHAT action is needed (reference critical zones)
3. NDRE interpretation — if NDRE is below 0.30, highlight nitrogen deficiency risk BEFORE it's visible
4. Change detection insight — what has improved or declined since last scan
5. Top 2-3 priority actions for this farmer this week

Respond in English. Be specific and practical — cite exact NDVI/NDWI/NDRE values and reference specific zones.`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (err) {
    console.error("Gemini AI analysis failed:", err.message);
    return `AI analysis generation failed: ${err.message}`;
  }
}

// ---------- Core Report Generation ----------

async function generateAllReports() {
  const db = admin.firestore();
  const farmersSnapshot = await db.collection("farmers").get();

  if (farmersSnapshot.empty) {
    console.log("No farmers found — nothing to process.");
    return { processed: 0, skipped: 0, errors: 0 };
  }

  let processed = 0, skipped = 0, errors = 0;
  const today = new Date();
  const reportDate = today.toISOString().split("T")[0];

  const client = await getGeeAuthClient();
  const projectId = await getProjectId();

  for (const farmerDoc of farmersSnapshot.docs) {
    const farmerId = farmerDoc.id;
    const farmer = farmerDoc.data();
    const farms = farmer.farms || [];

    if (farms.length === 0) { skipped++; continue; }

    for (let farmIndex = 0; farmIndex < farms.length; farmIndex++) {
      const farm = farms[farmIndex];

      if (!farm.boundary) {
        console.log(`Farmer ${farmerId}, farm ${farmIndex}: no boundary — skipping.`);
        skipped++;
        continue;
      }

      const geometry = geoJsonToEeGeometry(farm.boundary);
      if (!geometry) {
        console.log(`Farmer ${farmerId}, farm ${farmIndex}: invalid boundary — skipping.`);
        skipped++;
        continue;
      }

      try {
        console.log(`Processing farmer ${farmerId}, farm ${farmIndex} ("${farm.name || "unnamed"}")...`);

        // 1. Fetch farm-wide averages (NDVI, NDWI, NDRE)
        const { ndvi: ndviAvg, ndwi: ndwiAvg, ndre: ndreAvg } =
          await fetchThreeIndices(client, projectId, geometry.coordinates, today);

        console.log(`  Farm-wide: NDVI=${ndviAvg?.toFixed(4)}, NDWI=${ndwiAvg?.toFixed(4)}, NDRE=${ndreAvg?.toFixed(4)}`);

        // 2. Generate micro-zones
        const zones = generateFarmZones(farm.boundary);

        // 3. Fetch indices per zone (batches of 5 in parallel for speed)
        const enrichedZones = [];
        const ZONE_BATCH_SIZE = 5;
        for (let i = 0; i < zones.length; i += ZONE_BATCH_SIZE) {
          const batch = zones.slice(i, i + ZONE_BATCH_SIZE);
          const results = await Promise.all(
            batch.map(async (zone) => {
              try {
                const { ndvi, ndwi, ndre } = await fetchThreeIndices(
                  client, projectId, zone.coordinates, today
                );
                const { classification, action_needed } = classifyZone(ndvi, ndwi, ndre);
                return {
                  ...zone,
                  ndvi: ndvi !== null ? parseFloat(ndvi.toFixed(4)) : null,
                  ndwi: ndwi !== null ? parseFloat(ndwi.toFixed(4)) : null,
                  ndre: ndre !== null ? parseFloat(ndre.toFixed(4)) : null,
                  classification,
                  action_needed,
                  change_ndvi: null,
                  change_trend: "new",
                };
              } catch (zoneErr) {
                console.warn(`  Zone ${zone.zone_id} failed:`, zoneErr.message);
                return {
                  ...zone,
                  ndvi: null, ndwi: null, ndre: null,
                  classification: "moderate",
                  action_needed: "monitor",
                  change_ndvi: null,
                  change_trend: "new",
                };
              }
            })
          );
          enrichedZones.push(...results);
        }

        // 4. Load previous report for change detection
        const prevReportSnap = await db
          .collection("satellite_reports")
          .doc(farmerId)
          .collection(String(farmIndex))
          .orderBy("generated_at", "desc")
          .limit(1)
          .get();

        if (!prevReportSnap.empty) {
          const prevReport = prevReportSnap.docs[0].data();
          const prevZones = prevReport.zones || [];
          const prevZonesMap = {};
          prevZones.forEach((z) => { prevZonesMap[z.zone_id] = z; });

          // Apply change detection per zone
          for (const zone of enrichedZones) {
            const prev = prevZonesMap[zone.zone_id];
            if (prev) {
              const { change_ndvi, change_trend } = detectZoneChange(zone.ndvi, prev.ndvi);
              zone.change_ndvi = change_ndvi;
              zone.change_trend = change_trend;
            }
          }
        }

        // 5. Compute zone statistics
        const healthyCount = enrichedZones.filter((z) => z.classification === "healthy").length;
        const moderateCount = enrichedZones.filter((z) => z.classification === "moderate").length;
        const criticalCount = enrichedZones.filter((z) => z.classification === "critical").length;
        const criticalZones = enrichedZones.filter((z) => z.classification === "critical");

        const zonesImproved = enrichedZones.filter((z) => z.change_trend === "improving").length;
        const zonesDeclined = enrichedZones.filter((z) => z.change_trend === "declining").length;
        const zonesStable = enrichedZones.filter((z) => z.change_trend === "stable").length;
        const zonesCriticalNew = enrichedZones.filter(
          (z) => z.change_trend !== "new" && z.classification === "critical"
        ).length;

        let overallTrend = "stable";
        if (zonesImproved > zonesDeclined) overallTrend = "improving";
        else if (zonesDeclined > zonesImproved) overallTrend = "declining";

        const zoneStats = {
          total_zones: enrichedZones.length,
          healthy_count: healthyCount,
          moderate_count: moderateCount,
          critical_count: criticalCount,
        };

        const changeDetection = {
          zones_improved: zonesImproved,
          zones_declined: zonesDeclined,
          zones_stable: zonesStable,
          zones_critical_new: zonesCriticalNew,
          overall_trend: overallTrend,
        };

        // 6. Generate alerts
        const healthScore = calculateHealthScore(ndviAvg);
        const alerts = generateAlerts(ndviAvg, ndwiAvg, criticalCount);

        // 7. AI analysis (zone-aware)
        const aiAnalysis = await generateAiAnalysis(
          farmer.name || farmerId,
          farm.name || `Farm ${farmIndex + 1}`,
          ndviAvg, ndwiAvg, ndreAvg,
          healthScore, alerts,
          farm.current_crops || [],
          zoneStats, changeDetection, criticalZones
        );

        // 8. Write to Firestore
        const reportRef = db
          .collection("satellite_reports")
          .doc(farmerId)
          .collection(String(farmIndex))
          .doc(reportDate);

        await reportRef.set({
          // Farm-wide averages
          ndvi_average: ndviAvg,
          ndwi_average: ndwiAvg,
          ndre_average: ndreAvg,
          health_score: healthScore,
          // Zone data (stringify coordinates to avoid Firestore nested array limit)
          zones: enrichedZones.map((z) => ({
            ...z,
            coordinates: JSON.stringify(z.coordinates),
            center: JSON.stringify(z.center),
          })),
          zone_stats: zoneStats,
          change_detection: changeDetection,
          // Metadata
          composite_days: COMPOSITE_DAYS,
          data_quality: "composite",
          ai_analysis: aiAnalysis,
          alerts,
          current_crops: farm.current_crops || [],
          farm_name: farm.name || `Farm ${farmIndex + 1}`,
          area_hectares: farm.area_hectares || null,
          generated_at: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(
          `  ✓ Report written: NDVI=${ndviAvg?.toFixed(3)}, zones=${enrichedZones.length} (healthy=${healthyCount}, moderate=${moderateCount}, critical=${criticalCount})`
        );
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
    memory: "2GiB",
  },
  async (_event) => { await generateAllReports(); }
);

const httpSatelliteReport = onRequest(
  {
    region: "asia-southeast1",
    timeoutSeconds: 540,
    memory: "2GiB",
    cors: true,   // Enable CORS for browser calls
  },
  async (req, res) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      res.set("Access-Control-Allow-Origin", "*");
      res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.set("Access-Control-Allow-Headers", "Content-Type");
      res.status(204).send("");
      return;
    }

    res.set("Access-Control-Allow-Origin", "*");

    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed. Use POST." });
      return;
    }
    try {
      const summary = await generateAllReports();
      res.status(200).json({ status: "ok", message: "Satellite report generation complete.", ...summary });
    } catch (err) {
      console.error("HTTP satellite report failed:", err);
      res.status(500).json({ status: "error", message: err.message });
    }
  }
);

module.exports = { scheduledSatelliteReport, httpSatelliteReport };
