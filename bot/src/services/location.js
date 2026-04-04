const https = require('https');

/**
 * Extract lat/lng from a Telegram location message.
 *
 * @param {object} msg - Telegram message with location
 * @returns {{ latitude: number, longitude: number }} Coordinates
 */
function handleLocationShare(msg) {
  if (!msg.location) {
    throw new Error('No location data in message');
  }
  return {
    latitude: msg.location.latitude,
    longitude: msg.location.longitude,
  };
}

/**
 * Reverse geocode coordinates to determine the area name.
 * Uses OpenStreetMap Nominatim (free, no API key needed).
 *
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<string>} Area/district name
 */
async function reverseGeocode(lat, lng) {
  return new Promise((resolve, reject) => {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`;

    const options = {
      headers: {
        'User-Agent': 'AgriPulse-Bot/1.0',
        Accept: 'application/json',
      },
    };

    https
      .get(url, options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) {
              reject(new Error(parsed.error));
              return;
            }

            const address = parsed.address || {};
            // Try to get the most relevant area name for Malaysian addresses
            const areaName =
              address.city_district ||
              address.suburb ||
              address.city ||
              address.town ||
              address.county ||
              address.state_district ||
              address.state ||
              parsed.display_name?.split(',')[0] ||
              'Unknown';

            resolve(areaName);
          } catch (err) {
            reject(new Error('Failed to parse geocoding response'));
          }
        });
      })
      .on('error', (err) => {
        reject(err);
      });
  });
}

/**
 * Parse a manual text location input.
 * Simply cleans up the text and capitalizes it.
 *
 * @param {string} text - User-provided area name
 * @returns {string} Cleaned area name
 */
function parseManualLocation(text) {
  return text
    .trim()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

module.exports = {
  handleLocationShare,
  reverseGeocode,
  parseManualLocation,
};
