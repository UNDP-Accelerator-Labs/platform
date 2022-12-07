const { modules, DB } = include('config')

exports.geojson = (req, res) => {
	DB.conn.any(`
		SELECT * FROM pads
		GROUP BY template
	;`).then(results => {

	}).catch(err => console.log(err))


	batch1.push(t1.any(`
		SELECT 
		jsonb_build_object(
		    'type', 'Feature',
		    'geometry', ST_AsGeoJson(points.geo)::jsonb,
		    'properties', json_build_object('pads', json_agg(DISTINCT (points.pad)), 'count', COUNT(points.pad), 'cid', NULL)::jsonb
		) AS json
		FROM (
		    SELECT ST_Point(l.lng, l.lat) AS geo, l.pad 
		    FROM locations l
		    INNER JOIN pads p
		        ON l.pad = p.id
		    WHERE TRUE
		        $1:raw
		) AS points
		GROUP BY (points.geo)
	;`, [ full_filters ])
	.then(results => results.map(d => d.json))
	.catch(err => console.log(err)))
}