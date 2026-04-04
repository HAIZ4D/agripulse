const ee = require('@google/earthengine');

// Initialize ee logic without actual API connectivity
// We just need it to generate the serialized expression graph
ee.initialize(null, null, () => {
    try {
        const geom = ee.Geometry.Polygon([[[101.5, 3.0], [101.51, 3.0], [101.51, 3.01], [101.5, 3.01], [101.5, 3.0]]]);
        
        const col = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
            .filterDate('2026-03-23', '2026-04-02')
            .filterBounds(geom)
            .mosaic();
        
        const ndvi = col.normalizedDifference(['B8', 'B4']);
        
        const reduced = ndvi.reduceRegion({
            reducer: ee.Reducer.mean(),
            geometry: geom,
            scale: 10,
            bestEffort: true
        });
        
        console.log(JSON.stringify(reduced.serialize(), null, 2));
    } catch (err) {
        console.error(err);
    }
});
