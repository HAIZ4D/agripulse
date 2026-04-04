const OWM_BASE = 'https://api.openweathermap.org/data/2.5'

export async function fetchClimateOutlook(lat, lng, apiKey) {
  if (!apiKey) return null

  const res = await fetch(
    `${OWM_BASE}/forecast?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`
  )
  if (!res.ok) return null
  const data = await res.json()

  return {
    forecast: data.list?.slice(0, 10).map((item) => ({
      date: item.dt_txt,
      temp: item.main.temp,
      humidity: item.main.humidity,
      description: item.weather?.[0]?.description,
      rain: item.rain?.['3h'] || 0,
    })),
    source: 'OpenWeatherMap',
  }
}
