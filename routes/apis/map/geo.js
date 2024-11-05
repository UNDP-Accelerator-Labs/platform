const d3 = require('d3');
const { DB } = include('config/');

module.exports = async function (kwargs) {
	const { projection, geojson } = await setProjection(kwargs);

	const { features, ...properties } = geojson || {}
	let projected = {}
	
	projected.features = features?.map(d => {
		const { geometry, ...properties } = d

		const obj = {}
		obj.geometry = geometry
		if (geometry.coordinates.every(c => Array.isArray(c))) {
			obj.geometry.coordinates = geometry.coordinates.map(c => { // THIS FAILS FOR multipolygon
				if (Array.isArray(c) && c.every(b => Array.isArray(b))) {
					return c.map(b => {
						if (Array.isArray(b) && b.every(a => Array.isArray(a))) {
							return b.map(a => {
								return projection(a)
							})
						} else return projection(b)
					})
				} else return projection(c)
			})
		} else { // THIS IS A POINT
			obj.geometry.coordinates = projection(geometry.coordinates)
		}

		return Object.assign(obj, properties)
	})
	projected = Object.assign(projected, properties);
	return { data: projected, projection };
}
function getBasemap (conn) {
	if (!conn) conn = DB.general
	return conn.any(`
		SELECT ST_AsGeoJSON(wkb_geometry)::json AS geojson FROM adm0
	;`, [], d => d.geojson).then(results => {
		return {
			'type': 'FeatureCollection',
			'features': results.map(d => {
				return {
					'type': 'Feature',
					'geometry': d.geojson,
				}
			}),
		}
	}).catch(err => console.log(err))
}
async function setProjection (kwargs) {
	let { geojson, loadbase, projsize, zoom } = kwargs || {}
	if (zoom !== false) zoom = true;
	const conn = kwargs.connection || DB.general;
	
	let basemap = geojson;
	if (loadbase) {
		basemap = await getBasemap(conn);
		if (!geojson) geojson = basemap;
	}

	if (!projsize) projsize = 1960;
	const projection = d3.geoEquirectangular()
		.fitSize([projsize, projsize], basemap)
		.translate([(projsize / 2), (projsize / 2)]);
	if (zoom) projection.scale(((projsize - 1) / 2 / Math.PI) * 4);
	return { geojson, projection, projsize };
}