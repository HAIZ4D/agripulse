/**
 * AgriPulse Firebase Cloud Functions — Main Entry Point
 *
 * Exports all cloud functions for the AgriPulse platform:
 *   - aggregateDemand: Firestore trigger on buyers/{userId}
 *   - generateSatelliteReport: Scheduled every 5 days + HTTP endpoint for testing
 *   - aiRecommendationOnDemand: Firestore trigger on demand_aggregates
 *   - aiRecommendationOnSatellite: Firestore trigger on satellite_reports
 */

const admin = require("firebase-admin");

// Initialize Firebase Admin SDK (uses default credentials in Cloud Functions environment)
admin.initializeApp();

const { aggregateDemand } = require("./aggregateDemand");
const {
  scheduledSatelliteReport,
  httpSatelliteReport,
} = require("./satelliteReport");
const {
  aiRecommendationOnDemand,
  aiRecommendationOnSatellite,
} = require("./aiRecommendation");
const { notifySurplus } = require("./notifySurplus");

// Demand aggregation — triggers when any buyer document is written
exports.aggregateDemand = aggregateDemand;

// Satellite reports — scheduled every 5 days
exports.scheduledSatelliteReport = scheduledSatelliteReport;

// Satellite reports — HTTP endpoint for manual testing
exports.httpSatelliteReport = httpSatelliteReport;

// AI recommendations — triggered by new demand aggregates
exports.aiRecommendationOnDemand = aiRecommendationOnDemand;

// AI recommendations — triggered by new satellite reports
exports.aiRecommendationOnSatellite = aiRecommendationOnSatellite;

// Surplus notifications — triggered when farmer announces surplus from web app
exports.notifySurplus = notifySurplus;
