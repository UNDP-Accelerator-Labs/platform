const { metafields, map, ownDB, DB } = include('config/')
const { join, checklanguage } = include('routes/helpers/')

const filter = require('../filter')

module.exports = async kwargs => {
	const conn = kwargs.connection ? kwargs.connection : DB.conn
	let { req, res, filters } = kwargs || {}

	const language = checklanguage(req.params?.language || req.session.language)

	// GET FILTERS
	if (!filters?.length) filters = await filter(req, res)
	const [ f_space, order, page, full_filters ] = filters

	return conn.task(t => {
		const batch = []
		// GET LOCATIONS, ACCORDING TO FILTERS
		if (metafields.some(d => d.type === 'location') && map) {
			// TO DO: DEFAULT HERE IS DBSCAN, MAKE THIS DEPENDENT ON req.query
			// WE NEED CLUSTERS
			// [1000, 100] ARE THE DISTANCES (IN KM) FOR THE DBSCAN CLUSTERING
			[1000, 100].forEach(d => {
				batch.push(t.any(`
					SELECT
					jsonb_build_object(
						'type', 'Feature',
						'geometry', ST_AsGeoJson(ST_Centroid(ST_Collect(clusters.geo)))::jsonb,
						'properties', json_build_object('pads', json_agg(DISTINCT (clusters.pad)), 'count', COUNT(clusters.pad), 'cid', clusters.cid)::jsonb
					) AS json
					FROM (
						SELECT points.pad, ST_ClusterDBSCAN(points.projected_geom, eps := $1, minpoints := 2) over () AS cid, points.geo
						FROM (
							SELECT ST_Transform(ST_SetSRID(ST_Point(l.lng, l.lat), 4326), 3857) AS projected_geom, ST_Point(l.lng, l.lat) AS geo, l.pad
							FROM locations l
							INNER JOIN pads p
								ON l.pad = p.id
							WHERE TRUE
								$2:raw
						) AS points
					) clusters
					GROUP BY (clusters.cid)
					ORDER BY clusters.cid
				;`, [ d * 1000, full_filters ])
				.then(results => results.map(d => d.json))
				.catch(err => console.log(err)))
			})
			// NEED EXTRA LEVEL WITH SINGLE (NOT CLUSTERED) POINTS
			batch.push(t.any(`
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
		} else if (map) {
			// USERS CANNOT INPUT LOCATIONS, BUT THERE IS A MAP SO WE POPULATE IT WITH USER LOCATION INFO
			batch.push(t.any(`
				SELECT p.id AS pad, p.owner FROM pads p
				WHERE p.id NOT IN (SELECT review FROM reviews)
					$1:raw
			;`, [ full_filters ])
			.then(results => {
				if (results.length) {
					const columns = Object.keys(results[0])
					const values = DB.pgp.helpers.values(results, columns)
					const set_table = DB.pgp.as.format(`SELECT $1:name FROM (VALUES $2:raw) AS t($1:name)`, [ columns, values ])

					return DB.general.tx(gt => {
						return gt.any(`
							SELECT COUNT(t.pad)::INT, array_agg(t.pad) AS pads, u.iso3 
							FROM users u
							INNER JOIN ($1:raw) t
								ON t.owner::uuid = u.uuid::uuid
							GROUP BY u.iso3
							ORDER BY u.iso3
						;`, [ set_table ])
						.then(async users => {
							// JOIN LOCATION INFO
							users = await join.locations(users, { connection: gt, language, key: 'iso3', concat_location_key: 'geometry' })
							return users.map(d => {
								const obj = {}
								obj.type = 'Feature'
								obj.geometry = d.geometry
								obj.properties = { pads: d.pads, count: d.count, cid: d.iso3 }
								return obj
							}).filter(d => d.geometry)
						}).catch(err => console.log(err))
					}).catch(err => console.log(err))
				} else return []
			}).catch(err => console.log(err)))
		}
		// batch.push(t.any())
		return t.batch(batch)
		.catch(err => console.log(err))
	}).catch(err => console.log(err))
}