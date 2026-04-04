const GEE_API_BASE = 'https://earthengine.googleapis.com/v1'

function getTodayISO() {
  return new Date().toISOString().split('T')[0]
}

function getDateNDaysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

function buildGeeExpression(coordinates, bands) {
  return {
    expression: {
      result: 'reduceResult',
      values: {
        dateRange: {
          functionInvocationValue: {
            functionName: 'DateRange',
            arguments: {
              start: { constantValue: getDateNDaysAgo(10) },
              end: { constantValue: getTodayISO() },
            },
          },
        },
        dateFilter: {
          functionInvocationValue: {
            functionName: 'Filter.dateRangeContains',
            arguments: {
              leftValue: { valueReference: 'dateRange' },
              rightField: { constantValue: 'system:time_start' },
            },
          },
        },
        collection: {
          functionInvocationValue: {
            functionName: 'ImageCollection.load',
            arguments: {
              id: { constantValue: 'COPERNICUS/S2_SR_HARMONIZED' },
            },
          },
        },
        filtered: {
          functionInvocationValue: {
            functionName: 'Collection.filter',
            arguments: {
              collection: { valueReference: 'collection' },
              filter: { valueReference: 'dateFilter' },
            },
          },
        },
        mosaic: {
          functionInvocationValue: {
            functionName: 'ImageCollection.mosaic',
            arguments: {
              collection: { valueReference: 'filtered' },
            },
          },
        },
        ndImage: {
          functionInvocationValue: {
            functionName: 'Image.normalizedDifference',
            arguments: {
              input: { valueReference: 'mosaic' },
              bandNames: { constantValue: bands },
            },
          },
        },
        geometry: {
          functionInvocationValue: {
            functionName: 'GeometryConstructors.Polygon',
            arguments: {
              coordinates: { constantValue: coordinates },
            },
          },
        },
        reducer: {
          functionInvocationValue: {
            functionName: 'Reducer.mean',
            arguments: {},
          },
        },
        reduceResult: {
          functionInvocationValue: {
            functionName: 'Image.reduceRegion',
            arguments: {
              image: { valueReference: 'ndImage' },
              reducer: { valueReference: 'reducer' },
              geometry: { valueReference: 'geometry' },
              scale: { constantValue: 10 },
            },
          },
        },
      },
    },
  }
}

export async function fetchNDVI(farmBoundary, projectId, accessToken) {
  if (!projectId || !accessToken || !farmBoundary) return null

  let coordinates = farmBoundary.coordinates || farmBoundary
  if (typeof coordinates === 'string') {
    try { coordinates = JSON.parse(coordinates) } catch (e) {}
  }

  const request = buildGeeExpression(coordinates, ['B8', 'B4'])

  const res = await fetch(
    `${GEE_API_BASE}/projects/${projectId}/value:compute`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(request),
    }
  )

  if (!res.ok) {
    console.error('GEE API error:', res.status)
    return null
  }

  const data = await res.json()
  return data.result
}

export async function fetchNDWI(farmBoundary, projectId, accessToken) {
  if (!projectId || !accessToken || !farmBoundary) return null

  let coordinates = farmBoundary.coordinates || farmBoundary
  if (typeof coordinates === 'string') {
    try { coordinates = JSON.parse(coordinates) } catch (e) {}
  }

  const request = buildGeeExpression(coordinates, ['B3', 'B8'])

  const res = await fetch(
    `${GEE_API_BASE}/projects/${projectId}/value:compute`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(request),
    }
  )

  if (!res.ok) {
    console.error('GEE NDWI API error:', res.status)
    return null
  }

  const data = await res.json()
  return data.result
}
