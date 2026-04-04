const { GoogleAuth } = require('google-auth-library');
async function test() {
    const geomCoords = [[[101.5, 3.0], [101.51, 3.0], [101.51, 3.01], [101.5, 3.01], [101.5, 3.0]]];
    
    // Test geometry casting dynamically via GeometryConstructors.Polygon
    const geometryValue = {
        functionInvocationValue: {
            functionName: 'Feature',
            arguments: {
                geometry: {
                    functionInvocationValue: {
                        functionName: 'GeometryConstructors.Polygon',
                        arguments: {
                            coordinates: { constantValue: geomCoords }
                        }
                    }
                }
            }
        }
    };

    const payload = {
        result: '0',
        values: {
            '0': {
                functionInvocationValue: {
                    functionName: 'Image.reduceRegion',
                    arguments: {
                        image: { constantValue: 1 }, // mockup image just to test geometry parsing
                        reducer: { constantValue: 'mean' },
                        geometry: geometryValue,
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
