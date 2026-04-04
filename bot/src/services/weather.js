const https = require('https');

/**
 * Make an HTTPS GET request and return parsed JSON.
 *
 * @param {string} url - Full URL to fetch
 * @returns {Promise<object>} Parsed JSON response
 */
function httpGet(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { Accept: 'application/json' } }, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed);
          } catch (err) {
            reject(new Error('Failed to parse weather API response'));
          }
        });
      })
      .on('error', (err) => {
        reject(err);
      });
  });
}

/**
 * Fetch weather forecast for a specific area from data.gov.my.
 *
 * @param {string} areaName - The location/area name to search for
 * @returns {Promise<Array>} Array of forecast entries
 */
async function fetchForecast(areaName) {
  const encodedArea = encodeURIComponent(areaName);
  const url = `https://api.data.gov.my/weather/forecast?contains=${encodedArea}@location__location_name`;

  try {
    const data = await httpGet(url);
    if (Array.isArray(data)) {
      return data;
    }
    if (data && Array.isArray(data.data)) {
      return data.data;
    }
    return [];
  } catch (error) {
    console.error('Weather forecast fetch error:', error.message);
    return [];
  }
}

/**
 * Fetch active weather warnings from data.gov.my.
 *
 * @returns {Promise<Array>} Array of warning entries
 */
async function fetchWarnings() {
  const url = 'https://api.data.gov.my/weather/warning';

  try {
    const data = await httpGet(url);
    if (Array.isArray(data)) {
      return data;
    }
    if (data && Array.isArray(data.data)) {
      return data.data;
    }
    return [];
  } catch (error) {
    console.error('Weather warnings fetch error:', error.message);
    return [];
  }
}

/**
 * Format forecast data into a readable string.
 *
 * @param {Array} forecasts - Array of forecast entries
 * @returns {string} Formatted forecast text
 */
function formatForecast(forecasts) {
  if (!forecasts || forecasts.length === 0) {
    return null;
  }

  // Take the latest forecasts (up to 7 entries)
  const recent = forecasts.slice(0, 7);

  return recent
    .map((f) => {
      const date = f.date || 'N/A';
      const morning = f.morning_forecast || f.summary_forecast || '';
      const afternoon = f.afternoon_forecast || '';
      const night = f.night_forecast || '';
      const summary = f.summary_forecast || '';

      let line = `📅 ${date}`;
      if (summary) {
        line += `\n   ${summary}`;
      } else {
        if (morning) line += `\n   Pagi: ${morning}`;
        if (afternoon) line += `\n   Petang: ${afternoon}`;
        if (night) line += `\n   Malam: ${night}`;
      }
      const minTemp = f.min_temp || '';
      const maxTemp = f.max_temp || '';
      if (minTemp && maxTemp) {
        line += `\n   🌡 ${minTemp}°C - ${maxTemp}°C`;
      }
      return line;
    })
    .join('\n\n');
}

/**
 * Format weather warnings into a readable string.
 *
 * @param {Array} warnings - Array of warning entries
 * @returns {string|null} Formatted warnings or null if none
 */
function formatWarnings(warnings) {
  if (!warnings || warnings.length === 0) {
    return null;
  }

  return warnings
    .map((w) => {
      const heading = w.heading || w.title || 'Warning';
      const text = w.text_content || w.description || '';
      return `⚠️ ${heading}\n${text}`;
    })
    .join('\n\n');
}

module.exports = {
  fetchForecast,
  fetchWarnings,
  formatForecast,
  formatWarnings,
};
