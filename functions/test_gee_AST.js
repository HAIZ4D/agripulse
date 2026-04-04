const { GoogleAuth } = require('google-auth-library');

async function test() {
    const dStart = '2026-03-23';
    const dEnd = '2026-04-02';
    const geom = { type: 'Polygon', coordinates: [[[101.5, 3.0], [101.51, 3.0], [101.51, 3.01], [101.5, 3.01], [101.5, 3.0]]] };

    const payload = {
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
                                                    functionName: 'Collection.filter', // The actual function
                                                    arguments: {
                                                        collection: { constantValue: 'COPERNICUS/S2_SR_HARMONIZED' },
                                                        filter: {
                                                            functionInvocationValue: {
                                                                functionName: 'Filter.dateRangeContains',
                                                                arguments: {
                                                                    leftValue: { // DateRange
                                                                        functionInvocationValue: {
                                                                            functionName: 'DateRange',
                                                                            arguments: {
                                                                                start: { constantValue: dStart },
                                                                                end: { constantValue: dEnd }
                                                                            }
                                                                        }
                                                                    },
                                                                    rightField: { constantValue: 'system:time_start' }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                },
                                bandNames: { constantValue: ['B8', 'B4'] }
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
    };

    try {
        const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/earthengine'] });
        const client = await auth.getClient();
        const projectId = await auth.getProjectId();
        const res = await client.request({
            url: `https://earthengine.googleapis.com/v1/projects/${projectId}/value:compute`,
            method: 'POST',
            data: { expression: payload }
        });
        console.log(res.data);
    } catch (e) {
        console.error(e.response ? JSON.stringify(e.response.data, null, 2) : e.message);
    }
}
test();
