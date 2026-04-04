import { initializeApp } from 'firebase/app'
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)

// --- Farmer CRUD ---

export async function createFarmer(farmerData) {
  const farmerId = `farmer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const ref = doc(db, 'farmers', farmerId)
  await setDoc(ref, {
    ...farmerData,
    farms: [],
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  })
  return farmerId
}

export async function getFarmer(farmerId) {
  const ref = doc(db, 'farmers', farmerId)
  const snap = await getDoc(ref)
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function updateFarmer(farmerId, data) {
  const ref = doc(db, 'farmers', farmerId)
  await updateDoc(ref, { ...data, updated_at: serverTimestamp() })
}

export async function updateFarmCrops(farmerId, farmIndex, crops) {
  const ref = doc(db, 'farmers', farmerId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return
  const farmer = snap.data()
  const farms = farmer.farms || []
  if (farmIndex >= farms.length) return
  farms[farmIndex] = { ...farms[farmIndex], current_crops: crops }
  // Re-serialize boundaries for Firestore
  const farmsForStorage = farms.map((f) => ({
    ...f,
    boundary: f.boundary ? {
      type: f.boundary.type || 'Polygon',
      coordinates: typeof f.boundary.coordinates === 'string'
        ? f.boundary.coordinates
        : JSON.stringify(f.boundary.coordinates),
      area_hectares: f.boundary.area_hectares || 0,
    } : null,
  }))
  await updateDoc(ref, { farms: farmsForStorage, updated_at: serverTimestamp() })
}

// --- Demand Aggregates ---

export async function getDemandAggregates(areaName) {
  const allDemands = await getAllDemandAggregates()
  return allDemands
}

export function subscribeDemandAggregates(areaName, callback) {
  // Subscribe to ALL areas' demand data so farmers see nearby demand too
  const areasRef = collection(db, 'demand_aggregates')
  return onSnapshot(areasRef, async (areasSnap) => {
    const allCrops = {}
    for (const areaDoc of areasSnap.docs) {
      const cropsSnap = await getDocs(collection(db, 'demand_aggregates', areaDoc.id, 'crops'))
      cropsSnap.forEach((cropDoc) => {
        const data = cropDoc.data()
        const cropName = cropDoc.id
        if (allCrops[cropName]) {
          allCrops[cropName].total_weekly_kg += data.total_weekly_kg || 0
          allCrops[cropName].buyer_count += data.buyer_count || 0
        } else {
          allCrops[cropName] = {
            crop: cropName,
            total_weekly_kg: data.total_weekly_kg || 0,
            buyer_count: data.buyer_count || 0,
            trend: data.trend || 'stable',
            last_updated: data.last_updated,
          }
        }
      })
    }
    callback(Object.values(allCrops))
  })
}

async function getAllDemandAggregates() {
  const areasSnap = await getDocs(collection(db, 'demand_aggregates'))
  const allCrops = {}
  for (const areaDoc of areasSnap.docs) {
    const cropsSnap = await getDocs(collection(db, 'demand_aggregates', areaDoc.id, 'crops'))
    cropsSnap.forEach((cropDoc) => {
      const data = cropDoc.data()
      const cropName = cropDoc.id
      if (allCrops[cropName]) {
        allCrops[cropName].total_weekly_kg += data.total_weekly_kg || 0
        allCrops[cropName].buyer_count += data.buyer_count || 0
      } else {
        allCrops[cropName] = {
          crop: cropName,
          total_weekly_kg: data.total_weekly_kg || 0,
          buyer_count: data.buyer_count || 0,
          trend: data.trend || 'stable',
          last_updated: data.last_updated,
        }
      }
    })
  }
  return Object.values(allCrops)
}

// --- Satellite Reports ---

export async function getLatestSatelliteReport(farmerId, farmIndex) {
  const ref = collection(db, 'satellite_reports', farmerId, `${farmIndex}`)
  const q = query(ref, orderBy('generated_at', 'desc'), limit(1))
  const snap = await getDocs(q)
  return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() }
}

export async function getSatelliteHistory(farmerId, farmIndex, count = 10) {
  const ref = collection(db, 'satellite_reports', farmerId, `${farmIndex}`)
  const q = query(ref, orderBy('generated_at', 'desc'), limit(count))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export function subscribeSatelliteReport(farmerId, farmIndex, callback) {
  const ref = collection(db, 'satellite_reports', farmerId, `${farmIndex}`)
  const q = query(ref, orderBy('generated_at', 'desc'), limit(1))
  return onSnapshot(q, (snap) => {
    callback(snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() })
  }, (err) => {
    console.error('Satellite report subscription error:', err)
    callback(null)
  })
}

// --- AI Recommendations ---

export async function getRecommendations(farmerId) {
  const ref = collection(db, 'ai_recommendations', farmerId, 'entries')
  const q = query(ref, orderBy('generated_at', 'desc'), limit(5))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export function subscribeRecommendations(farmerId, callback) {
  const ref = collection(db, 'ai_recommendations', farmerId, 'entries')
  const q = query(ref, orderBy('generated_at', 'desc'), limit(5))
  return onSnapshot(q, (snap) => {
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    callback(data)
  })
}

// --- Planting Plan ---

export async function acceptRecommendation(farmerId, recommendation) {
  const ref = doc(db, 'farmers', farmerId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return

  const farmer = snap.data()
  const plan = farmer.planting_plan || []

  // Don't add duplicate crops
  if (plan.some((p) => p.crop?.toLowerCase() === recommendation.crop?.toLowerCase())) {
    return
  }

  plan.push({
    crop: recommendation.crop,
    confidence: recommendation.confidence || 0,
    projected_profit: recommendation.projected_profit || null,
    accepted_at: serverTimestamp(),
    status: 'planned',
  })

  await updateDoc(ref, { planting_plan: plan, updated_at: serverTimestamp() })
}

export async function removeFromPlan(farmerId, cropName) {
  const ref = doc(db, 'farmers', farmerId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return

  const farmer = snap.data()
  const plan = (farmer.planting_plan || []).filter(
    (p) => p.crop?.toLowerCase() !== cropName?.toLowerCase()
  )

  await updateDoc(ref, { planting_plan: plan, updated_at: serverTimestamp() })
}

export async function updatePlanStatus(farmerId, cropName, newStatus) {
  const ref = doc(db, 'farmers', farmerId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return

  const farmer = snap.data()
  const plan = (farmer.planting_plan || []).map((p) => {
    if (p.crop?.toLowerCase() === cropName?.toLowerCase()) {
      return { ...p, status: newStatus }
    }
    return p
  })

  await updateDoc(ref, { planting_plan: plan, updated_at: serverTimestamp() })
}

export function subscribePlantingPlan(farmerId, callback) {
  const ref = doc(db, 'farmers', farmerId)
  return onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      callback(snap.data().planting_plan || [])
    } else {
      callback([])
    }
  })
}

// --- Buyers (for demand context) ---

export async function getBuyerCountByArea(areaName) {
  const ref = collection(db, 'buyers')
  const q = query(ref, where('location.area_name', '==', areaName))
  const snap = await getDocs(q)
  return snap.size
}

// --- Surplus Alerts ---

export async function createSurplusAlert({ farmerId, farmerName, phone, area, crop, quantityKg, notes }) {
  const ref = collection(db, 'surplus_alerts')
  const docRef = await addDoc(ref, {
    farmer_id: farmerId,
    farmer_name: farmerName || '',
    phone: phone || '',
    area: area || '',
    crop: crop,
    quantity_kg: quantityKg,
    notes: notes || '',
    status: 'pending',
    buyers_notified: 0,
    created_at: serverTimestamp(),
  })
  return docRef.id
}

export function subscribeSurplusAlerts(farmerId, callback) {
  const ref = collection(db, 'surplus_alerts')
  const q = query(ref, where('farmer_id', '==', farmerId), orderBy('created_at', 'desc'), limit(10))
  return onSnapshot(q, (snap) => {
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    callback(data)
  })
}
