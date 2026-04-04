const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

let db;

function initFirestore() {
  if (!db) {
    const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    let app;
    if (serviceAccountPath) {
      const serviceAccount = require(require('path').resolve(serviceAccountPath));
      app = initializeApp({
        credential: cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
    } else {
      app = initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
    }
    db = getFirestore(app);

    // Disable undefined properties warning
    db.settings({ ignoreUndefinedProperties: true });
  }
  return db;
}

function getDb() {
  if (!db) initFirestore();
  return db;
}

// ─── Buyer CRUD ───

async function createBuyer(telegramId, data) {
  const buyerRef = getDb().collection('buyers').doc(String(telegramId));
  const buyerData = {
    telegramId: String(telegramId),
    role: data.role,
    area: data.area || null,
    frequency: data.frequency || 'weekly',
    location: {
      lat: data.latitude || null,
      lng: data.longitude || null,
      area_name: data.area || null,
    },
    demands: (data.demands || []).map((d) => ({
      crop: d.crop,
      quantity_kg: d.quantityKg || d.quantity_kg || 0,
      originalQuantity: d.originalQuantity || d.quantityKg || d.quantity_kg || 0,
      unit: d.unit || 'kg',
      frequency: data.frequency || 'weekly',
    })),
    language: data.language || 'ms',
    created_at: FieldValue.serverTimestamp(),
    updated_at: FieldValue.serverTimestamp(),
  };
  await buyerRef.set(buyerData);
  return buyerData;
}

async function updateBuyer(telegramId, updates) {
  const buyerRef = getDb().collection('buyers').doc(String(telegramId));
  updates.updated_at = FieldValue.serverTimestamp();
  await buyerRef.update(updates);
}

async function getBuyer(telegramId) {
  const buyerRef = getDb().collection('buyers').doc(String(telegramId));
  const doc = await buyerRef.get();
  if (!doc.exists) return null;
  return doc.data();
}

// ─── Demand Aggregation ───

async function updateDemandAggregates(area, demands) {
  const areaRef = getDb().collection('demand_aggregates').doc(area);

  // Get all buyers in this area to recalculate totals
  const buyersSnapshot = await getDb()
    .collection('buyers')
    .where('location.area_name', '==', area)
    .get();

  const cropTotals = {};

  buyersSnapshot.forEach((doc) => {
    const buyer = doc.data();
    if (buyer.demands && Array.isArray(buyer.demands)) {
      buyer.demands.forEach((demand) => {
        const crop = demand.crop;
        const qty = parseFloat(demand.quantity_kg || demand.quantityKg) || 0;
        if (!cropTotals[crop]) {
          cropTotals[crop] = { total_weekly_kg: 0, buyer_count: 0, trend: 'stable' };
        }
        cropTotals[crop].total_weekly_kg += qty;
        cropTotals[crop].buyer_count += 1;
      });
    }
  });

  // Write each crop as a subcollection doc to match web app schema
  const batch = getDb().batch();
  for (const [crop, data] of Object.entries(cropTotals)) {
    const cropRef = areaRef.collection('crops').doc(crop);
    batch.set(cropRef, {
      ...data,
      last_updated: FieldValue.serverTimestamp(),
    }, { merge: true });
  }

  await batch.commit();
  return cropTotals;
}

// ─── Area Queries ───

async function getBuyersByArea(area) {
  const snapshot = await getDb()
    .collection('buyers')
    .where('location.area_name', '==', area)
    .get();

  const buyers = [];
  snapshot.forEach((doc) => {
    buyers.push({ id: doc.id, ...doc.data() });
  });
  return buyers;
}

async function getBuyersByCrop(area, cropName) {
  const buyers = await getBuyersByArea(area);
  return buyers.filter((buyer) => {
    if (!buyer.demands || !Array.isArray(buyer.demands)) return false;
    return buyer.demands.some(
      (d) => d.crop.toLowerCase() === cropName.toLowerCase()
    );
  });
}

module.exports = {
  initFirestore,
  getDb,
  createBuyer,
  updateBuyer,
  getBuyer,
  updateDemandAggregates,
  getBuyersByArea,
  getBuyersByCrop,
};
