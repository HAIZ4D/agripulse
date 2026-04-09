/**
 * earthEngine.js
 *
 * Client-side Google Earth Engine REST API helpers for the AgriPulse web app.
 * Used for real-time / manual satellite queries from the browser using
 * a user-supplied OAuth2 access token and GEE project ID.
 *
 * Indices fetched:
 *   - NDVI  (B8, B4) — vegetation health
 *   - NDWI  (B3, B8) — water content / irrigation stress
 *   - NDRE  (B8, B5) — early chlorophyll/nitrogen stress (Red-Edge)
 *
 * Uses a 30-day cloud-masked median composite, matching the Cloud Function.
 */

const GEE_API_BASE = "https://earthengine.googleapis.com/v1";
const COMPOSITE_DAYS = 30;       // match Cloud Function window
const MAX_CLOUDY_PCT = 50;       // skip images >50% cloudy

function getTodayISO() {
  return new Date().toISOString().split("T")[0];
}

function getDateNDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

/**
 * Build a GEE expression that:
 *  - Loads Sentinel-2 SR Harmonized
 *  - Filters by date range (30-day window) + cloud cover < 50%
 *  - Takes median composite
 *  - Computes normalizedDifference for given bands
 *  - Reduces to mean over the given polygon
 */
function buildGeeExpression(coordinates, bands) {
  const startStr = getDateNDaysAgo(COMPOSITE_DAYS);
  const endStr = getTodayISO();

  // Ensure double-wrapped coords for Polygon
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
              id: { constantValue: "COPERNICUS/S2_SR_HARMONIZED" },
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

/**
 * Low-level helper: call GEE value:compute for one index.
 * Returns the numeric mean value or null.
 */
async function callGeeCompute(projectId, accessToken, requestBody) {
  const res = await fetch(
    `${GEE_API_BASE}/projects/${projectId}/value:compute`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(requestBody),
    }
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error("GEE API error:", res.status, errText.slice(0, 200));
    return null;
  }

  const data = await res.json();
  const val = data?.result?.nd;
  return typeof val === "number" ? val : null;
}

/**
 * Fetch NDVI (B8, B4) for a farm boundary.
 * Kept for backward compatibility.
 */
export async function fetchNDVI(farmBoundary, projectId, accessToken) {
  if (!projectId || !accessToken || !farmBoundary) return null;

  let coordinates = farmBoundary.coordinates || farmBoundary;
  if (typeof coordinates === "string") {
    try { coordinates = JSON.parse(coordinates); } catch (_) {}
  }

  const request = buildGeeExpression(coordinates, ["B8", "B4"]);
  return callGeeCompute(projectId, accessToken, request);
}

/**
 * Fetch NDWI (B3, B8) for a farm boundary.
 * Kept for backward compatibility.
 */
export async function fetchNDWI(farmBoundary, projectId, accessToken) {
  if (!projectId || !accessToken || !farmBoundary) return null;

  let coordinates = farmBoundary.coordinates || farmBoundary;
  if (typeof coordinates === "string") {
    try { coordinates = JSON.parse(coordinates); } catch (_) {}
  }

  const request = buildGeeExpression(coordinates, ["B3", "B8"]);
  return callGeeCompute(projectId, accessToken, request);
}

/**
 * Fetch NDRE (B8, B5) — Red-Edge index for early nitrogen/chlorophyll stress.
 * Values < 0.28 indicate potential nutrient deficiency.
 */
export async function fetchNDRE(farmBoundary, projectId, accessToken) {
  if (!projectId || !accessToken || !farmBoundary) return null;

  let coordinates = farmBoundary.coordinates || farmBoundary;
  if (typeof coordinates === "string") {
    try { coordinates = JSON.parse(coordinates); } catch (_) {}
  }

  const request = buildGeeExpression(coordinates, ["B8", "B5"]);
  return callGeeCompute(projectId, accessToken, request);
}

/**
 * Build a GEE expression for EVI (Enhanced Vegetation Index).
 * EVI = 2.5 * (NIR - RED) / (NIR + 6*RED - 7.5*BLUE + 1)
 * Uses Sentinel-2 SR bands: B8 (NIR), B4 (RED), B2 (BLUE).
 * The +10000 accounts for Sentinel-2 SR surface reflectance scaling.
 */
function buildEviGeeExpression(coordinates) {
  const startStr = getDateNDaysAgo(COMPOSITE_DAYS);
  const endStr = getTodayISO();

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
              id: { constantValue: "COPERNICUS/S2_SR_HARMONIZED" },
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

/**
 * Low-level helper for EVI: call GEE value:compute.
 * EVI expression result band name is "constant" (not "nd").
 */
async function callGeeComputeEvi(projectId, accessToken, requestBody) {
  const res = await fetch(
    `${GEE_API_BASE}/projects/${projectId}/value:compute`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(requestBody),
    }
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error("GEE EVI API error:", res.status, errText.slice(0, 200));
    return null;
  }

  const data = await res.json();
  const val = data?.result?.constant ?? data?.result?.nd;
  return typeof val === "number" ? val : null;
}

/**
 * Fetch EVI (Enhanced Vegetation Index) for a farm boundary.
 * EVI is more accurate than NDVI in dense canopy (avoids saturation).
 */
export async function fetchEVI(farmBoundary, projectId, accessToken) {
  if (!projectId || !accessToken || !farmBoundary) return null;

  let coordinates = farmBoundary.coordinates || farmBoundary;
  if (typeof coordinates === "string") {
    try { coordinates = JSON.parse(coordinates); } catch (_) {}
  }

  const request = buildEviGeeExpression(coordinates);
  return callGeeComputeEvi(projectId, accessToken, request);
}

/**
 * Fetch all four indices (NDVI, NDWI, NDRE, EVI) in parallel for a farm boundary.
 * Returns { ndvi, ndwi, ndre, evi } — all values or null on failure.
 * This is the preferred function to use in the UI.
 */
export async function fetchMultiIndex(farmBoundary, projectId, accessToken) {
  if (!projectId || !accessToken || !farmBoundary) {
    return { ndvi: null, ndwi: null, ndre: null, evi: null };
  }

  let coordinates = farmBoundary.coordinates || farmBoundary;
  if (typeof coordinates === "string") {
    try { coordinates = JSON.parse(coordinates); } catch (_) {}
  }

  const [ndvi, ndwi, ndre, evi] = await Promise.all([
    callGeeCompute(projectId, accessToken, buildGeeExpression(coordinates, ["B8", "B4"])),
    callGeeCompute(projectId, accessToken, buildGeeExpression(coordinates, ["B3", "B8"])),
    callGeeCompute(projectId, accessToken, buildGeeExpression(coordinates, ["B8", "B5"])),
    callGeeComputeEvi(projectId, accessToken, buildEviGeeExpression(coordinates)),
  ]);

  return { ndvi, ndwi, ndre, evi };
}
