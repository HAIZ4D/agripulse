const { GoogleAuth } = require('google-auth-library');

async function test() {
  try {
    const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/earthengine'] });
    const client = await auth.getClient();
    const projectId = await auth.getProjectId();
    console.log('Project:', projectId);
    const dStart = '2026-03-23';
    const dEnd = '2026-04-02';
    const geom = { type: 'Polygon', coordinates: [[[101.5, 3.0], [101.51, 3.0], [101.51, 3.01], [101.5, 3.01], [101.5, 3.0]]] };
    
    // Removing ImageCollection.filterBounds constraint completely just to see if it parses
    const payload = {
        expression: {
            result: '0',
            values: {
                '0': {
                    functionInvocationValue: {
                    functionName: 'Image.reduceRegion',
                    arguments: {
                        image: {
                        functionInvocationValue: {
                            functionName: 'Image.normalizedDifference',
                            arguments: {
                            input: {
                                functionInvocationValue: {
                                functionName: 'ImageCollection.mosaic',
                                arguments: {
                                    collection: {
                                    functionInvocationValue: {
                                        functionName: 'ImageCollection.filterDate',
                                        arguments: {
                                        collection: { constantValue: 'COPERNICUS/S2_SR_HARMONIZED' },
                                        start: { constantValue: dStart },
                                        end: { constantValue: dEnd }
                                        }
                                    }
                                    }
                                }
                                }
                            },
                            bandNames: { constantValue: ["B8", "B4"] }
                            }
                        }
                        },
                        reducer: { constantValue: 'mean' },
                        geometry: { constantValue: geom },
                        scale: { constantValue: 10 },
                        bestEffort: { constantValue: true }
                    }
                    }
                }
            }
        }
    };
    const res = await client.request({
      url: `https://earthengine.googleapis.com/v1/projects/${projectId}/value:compute`,
      method: 'POST',
      data: payload
    });
    console.log(res.data);
  } catch (err) {
    console.error(err.response ? JSON.stringify(err.response.data, null, 2) : err.message);
  }
}
test();
