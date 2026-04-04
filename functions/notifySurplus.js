/**
 * notifySurplus.js
 *
 * Firestore trigger: onCreate on surplus_alerts/{docId}
 *
 * When a farmer announces surplus from the web app, this function:
 * 1. Queries buyers in the same area who demand the surplus crop
 * 2. Sends Telegram notifications to each matching buyer
 * 3. Updates the surplus doc with notification results
 */

const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { defineString } = require("firebase-functions/params");
const admin = require("firebase-admin");

// Telegram Bot token from .env file in functions/
const telegramToken = defineString("TELEGRAM_BOT_TOKEN");

/**
 * Send a Telegram message to a user via Bot API.
 */
async function sendTelegramMessage(chatId, text) {
  const url = `https://api.telegram.org/bot${telegramToken.value()}/sendMessage`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Telegram API error: ${err}`);
  }
  return response.json();
}

/**
 * Build notification message for buyer.
 */
function buildNotificationMessage(data, buyerLang) {
  const isMalay = buyerLang === "ms";

  if (isMalay) {
    return [
      "🔔 *Pemberitahuan Lebihan Hasil!*",
      "",
      `Petani *${data.farmer_name || "Petani"}* di kawasan *${data.area}* mempunyai lebihan:`,
      "",
      `🌾 *${data.crop}* — *${data.quantity_kg} kg*`,
      data.notes ? `📝 ${data.notes}` : "",
      "",
      data.phone ? `📞 Hubungi: ${data.phone}` : "",
      "",
      "_Dapatkan bekalan segar terus dari ladang!_",
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    "🔔 *Surplus Alert!*",
    "",
    `Farmer *${data.farmer_name || "Farmer"}* in *${data.area}* has surplus:`,
    "",
    `🌾 *${data.crop}* — *${data.quantity_kg} kg*`,
    data.notes ? `📝 ${data.notes}` : "",
    "",
    data.phone ? `📞 Contact: ${data.phone}` : "",
    "",
    "_Get fresh supply directly from the farm!_",
  ]
    .filter(Boolean)
    .join("\n");
}

const notifySurplus = onDocumentCreated(
  {
    document: "surplus_alerts/{docId}",
    region: "asia-southeast1",
  },
  async (event) => {
    const db = admin.firestore();
    const data = event.data.data();

    if (!data || !data.crop || !data.area) {
      console.log("Surplus alert missing required fields — skipping.");
      return null;
    }

    const cropLower = (data.crop || "").toLowerCase().trim();

    // Query ALL buyers (not just same area) to maximize reach
    const buyersSnapshot = await db.collection("buyers").get();

    if (buyersSnapshot.empty) {
      console.log("No buyers registered — no notifications sent.");
      await event.data.ref.update({
        status: "no_buyers",
        buyers_notified: 0,
        processed_at: admin.firestore.FieldValue.serverTimestamp(),
      });
      return null;
    }

    // Filter buyers who demand this crop (any area)
    const matchingBuyers = [];
    buyersSnapshot.forEach((doc) => {
      const buyer = doc.data();
      const demands = buyer.demands || [];
      const wantsCrop = demands.some(
        (d) => (d.crop || "").toLowerCase().trim() === cropLower
      );
      if (wantsCrop) {
        matchingBuyers.push({
          telegramId: buyer.telegramId || doc.id,
          language: buyer.language || "ms",
          area: buyer.location?.area_name || buyer.area || "",
        });
      }
    });

    if (matchingBuyers.length === 0) {
      // No crop match — notify ALL buyers in the area as general announcement
      buyersSnapshot.forEach((doc) => {
        const buyer = doc.data();
        matchingBuyers.push({
          telegramId: buyer.telegramId || doc.id,
          language: buyer.language || "ms",
          area: buyer.location?.area_name || buyer.area || "",
        });
      });

      if (matchingBuyers.length === 0) {
        await event.data.ref.update({
          status: "no_matching_buyers",
          buyers_notified: 0,
          processed_at: admin.firestore.FieldValue.serverTimestamp(),
        });
        return null;
      }
    }

    // Send Telegram notifications
    let notifiedCount = 0;
    const errors = [];

    for (const buyer of matchingBuyers) {
      try {
        const message = buildNotificationMessage(data, buyer.language);
        await sendTelegramMessage(buyer.telegramId, message);
        notifiedCount++;
      } catch (err) {
        console.error(
          `Failed to notify buyer ${buyer.telegramId}:`,
          err.message
        );
        errors.push({
          telegramId: buyer.telegramId,
          error: err.message,
        });
      }
    }

    // Update surplus doc with results
    await event.data.ref.update({
      status: "notified",
      buyers_notified: notifiedCount,
      buyers_matched: matchingBuyers.length,
      notification_errors: errors.length > 0 ? errors : null,
      processed_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(
      `Surplus "${data.crop}" in "${data.area}": notified ${notifiedCount}/${matchingBuyers.length} buyers.`
    );

    return null;
  }
);

module.exports = { notifySurplus };
