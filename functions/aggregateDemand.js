/**
 * aggregateDemand.js
 *
 * Firestore trigger: onWrite to buyers/{userId}
 *
 * When a buyer's document changes (create, update, or delete), recompute the
 * demand_aggregates for their area. For each crop demanded in that area, we
 * count the number of buyers, sum weekly kg, and determine the trend by
 * comparing to the previously stored value.
 *
 * Writes to: demand_aggregates/{area_name}/{crop}
 */

const {
  onDocumentWritten,
} = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

/**
 * Determine trend based on current vs. previous value.
 * Returns "rising", "falling", or "stable".
 */
function determineTrend(currentKg, previousKg) {
  if (previousKg === null || previousKg === undefined) {
    // First time we have data for this crop — no trend yet
    return "stable";
  }
  const delta = currentKg - previousKg;
  const threshold = previousKg * 0.05; // 5% change threshold
  if (delta > threshold) return "rising";
  if (delta < -threshold) return "falling";
  return "stable";
}

const aggregateDemand = onDocumentWritten(
  {
    document: "buyers/{userId}",
    region: "asia-southeast1",
  },
  async (event) => {
    const db = admin.firestore();

    // Determine the area_name from the buyer document (before or after write).
    // On delete, we use the "before" snapshot; otherwise "after".
    const afterData = event.data.after?.data();
    const beforeData = event.data.before?.data();

    const areaName =
      afterData?.location?.area_name || beforeData?.location?.area_name;

    if (!areaName) {
      console.log(
        `Buyer ${event.params.userId} has no area_name — skipping aggregation.`
      );
      return null;
    }

    // Query all buyers in this area
    const buyersSnapshot = await db
      .collection("buyers")
      .where("location.area_name", "==", areaName)
      .get();

    // Build aggregation: { crop: { total_weekly_kg, buyer_count } }
    const aggregation = {};

    buyersSnapshot.forEach((doc) => {
      const buyer = doc.data();
      const demands = buyer.demands || [];
      demands.forEach((demand) => {
        const crop = (demand.crop || "").trim().toLowerCase();
        if (!crop) return;

        const quantityKg = parseFloat(demand.quantity_kg || demand.quantityKg) || 0;

        if (!aggregation[crop]) {
          aggregation[crop] = { total_weekly_kg: 0, buyer_count: 0 };
        }
        aggregation[crop].total_weekly_kg += quantityKg;
        aggregation[crop].buyer_count += 1;
      });
    });

    // Reference to the demand_aggregates/{area_name} document's subcollection
    const areaRef = db.collection("demand_aggregates").doc(areaName);

    // Fetch all existing crop aggregates for this area so we can detect trends
    // and clean up crops that no longer have demand.
    const existingCropsSnapshot = await areaRef
      .collection("crops")
      .get();

    const existingCrops = {};
    existingCropsSnapshot.forEach((doc) => {
      existingCrops[doc.id] = doc.data();
    });

    const batch = db.batch();
    const now = admin.firestore.FieldValue.serverTimestamp();

    // Upsert each crop aggregate
    for (const [crop, data] of Object.entries(aggregation)) {
      const cropRef = areaRef.collection("crops").doc(crop);
      const previousKg = existingCrops[crop]?.total_weekly_kg ?? null;
      const trend = determineTrend(data.total_weekly_kg, previousKg);

      batch.set(cropRef, {
        total_weekly_kg: Math.round(data.total_weekly_kg * 100) / 100,
        buyer_count: data.buyer_count,
        trend,
        last_updated: now,
      });

      // Remove from existing set so we know what to clean up
      delete existingCrops[crop];
    }

    // Delete crops that no longer have any demand in this area
    for (const cropId of Object.keys(existingCrops)) {
      const cropRef = areaRef.collection("crops").doc(cropId);
      batch.delete(cropRef);
    }

    // Also update area-level metadata
    batch.set(
      areaRef,
      {
        area_name: areaName,
        crop_count: Object.keys(aggregation).length,
        total_buyers: buyersSnapshot.size,
        last_updated: now,
      },
      { merge: true }
    );

    await batch.commit();

    console.log(
      `Aggregated demand for area "${areaName}": ${Object.keys(aggregation).length} crops, ${buyersSnapshot.size} buyers.`
    );

    return null;
  }
);

module.exports = { aggregateDemand };
