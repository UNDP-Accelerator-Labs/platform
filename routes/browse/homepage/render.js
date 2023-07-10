const { page_content_limit, modules, metafields, engagementtypes, lazyload, map, browse_display, welcome_module, DB } = include('config/')
const { array, datastructures, checklanguage, join, parsers } = include('routes/helpers/')

const load = require('./load/')
const filter = require('./filter.js')

module.exports = async (req, res) => {
	if (!req.session.uuid) Object.assign(req.session, datastructures.sessiondata({ public: true }))

	const { uuid, rights, collaborators, public } = req.session || {}
	const { object, space, instance } = req.params || {}

	let { mscale, display } = req.query || {}

	const language = checklanguage(req.params?.language || req.session.language)

	// GET FILTERS
	const [ full_filters ] = filter(req, res)

	DB.conn.tx(async t => {
		const batch = []

		// SUMMARY STATISTICS
		batch.push(load.statistics({ connection: t, req, res }))
		// LOCATIONS DATA
		batch.push(t.task(t1 => {
			const batch1 = []
			// GET LOCATIONS, ACCORDING TO FILTERS
			if (metafields.some(d => d.type === 'location') && map) {
				// TO DO: DEFAULT HERE IS DBSCAN, MAKE THIS DEPENDENT ON req.query
				// WE NEED CLUSTERS
				// [1000, 100] ARE THE DISTANCES (IN KM) FOR THE DBSCAN CLUSTERING
				[1000, 100].forEach(d => {
					batch1.push(t1.any(`
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
			} else if (map) {
				// USERS CANNOT INPUT LOCATIONS, BUT THERE IS A MAP SO WE POPULATE IT WITH USER LOCATION INFO
				batch1.push(t1.any(`
					SELECT p.id AS pad, p.owner FROM pads p
					WHERE p.id NOT IN (SELECT review FROM reviews)
						$1:raw
				;`, [ full_filters ])
				.then(results => {
					if (results.length) {
						const columns = Object.keys(results[0])
						const values = DB.pgp.helpers.values(results, columns)
						const set_table = DB.pgp.as.format(`SELECT $1:name FROM (VALUES $2:raw) AS t($1:name)`, [ columns, values ])

						return DB.general.any(`
							SELECT
							jsonb_build_object(
								'type', 'Feature',
								'geometry', ST_AsGeoJson(ST_Centroid(ST_Collect(clusters.geo)))::jsonb,
								'properties', json_build_object('pads', json_agg(clusters.pad), 'count', COUNT(clusters.pad), 'cid', clusters.cid)::jsonb
							) AS json
							FROM (
								SELECT c.iso3 AS cid, ST_Point(c.lng, c.lat) AS geo, t.pad FROM countries c
								INNER JOIN users u
									ON u.iso3 = c.iso3
								INNER JOIN ($1:raw) t
									ON t.owner::uuid = u.uuid::uuid
							) AS clusters
							GROUP BY (clusters.cid)
							ORDER BY clusters.cid
						;`, [ set_table ])
						.then(results => results.map(d => d.json))
						.catch(err => console.log(err))
					} else return null
				}).catch(err => console.log(err)))
			}
			// batch1.push(t1.any())
			return t1.batch(batch1)
			.catch(err => console.log(err))
		}))

		// THIS IS FOR THE BANNER AT THE TOP OF PUBLIC PAGES
		batch.push(t.any(`
			SELECT p.id, p.title, p.owner, p.sections FROM pads p
			WHERE TRUE
				$1:raw
			ORDER BY random()
			LIMIT 72
		;`, [ full_filters ]).then(async results => {
			const data = await join.users(results, [ language, 'owner' ])
			data.forEach(d => {
				d.img = parsers.getImg(d)
				d.txt = parsers.getTxt(d)
				delete d.sections
				delete d.owner
				delete d.ownername
				delete d.position
			})
			let max = 10
			if (welcome_module === 'mosaic') max = 46
			return data.filter(d => d.img?.length).slice(0, max)
		}))
		// LIST OF COUNTRIES
		batch.push(t.any(`
			SELECT COUNT(p.id)::INT, p.owner FROM pads p
			WHERE TRUE
				$1:raw
			GROUP BY p.owner
		;`, [ full_filters ]).then(results => {
			if (!results.length) {
				return [];
			}
			return DB.general.task(gt => {
				return gt.any(`
					SELECT iso3, uuid AS owner FROM users
					WHERE uuid IN ($1:csv)
				;`, [ results.map(d => d.owner) ])
				.then(users => {
					const data = array.nest.call(join.multijoin.call(results, [ users, 'owner' ]), { key: 'iso3' })
					.map(d => { return { iso3: d.key, count: array.sum.call(d.values, 'count') } })

					return gt.any(`
						SELECT DISTINCT (cn.name), cn.iso3, cn.language
						FROM users u
						INNER JOIN country_names cn
							ON cn.iso3 = u.iso3
						WHERE u.position = 'Head of Solutions Mapping'
							AND cn.language = $1
						ORDER BY cn.name
					;`, [ language ])
					.then(countries => {
						return join.multijoin.call(countries, [ data, 'iso3' ])
					}).catch(err => console.log(err))
				}).catch(err => console.log(err))
			}).catch(err => console.log(err))
		}).catch(err => console.log(err)))
		// LIST OF PINBOARDS/ COLLECTIONS
		// FIXME @joschi update pinboards
		batch.push(t.any(`
			SELECT pb.id, COUNT(pc.id)::INT, pb.title, pb.date, pb.owner
			FROM pinboards pb
			INNER JOIN pinboard_contributions pc
				ON pc.pinboard = pb.id
			INNER JOIN pads p
				ON pc.pad = p.id
			WHERE pb.status > 2
				$1:raw
			GROUP BY pb.id
		;`, [ full_filters ]))

		return t.batch(batch)
		.then(async results => {
			let [ statistics,
				clusters,
				sample_images,
				countries,
				pinboards
			] = results

			const stats = {
				total: array.sum.call(statistics.total, 'count'),
				contributors: statistics.contributors,
				tags: statistics.tags
			}

			const metadata = await datastructures.pagemetadata({ req, res, display, map, mscale })
			return Object.assign(metadata, { clusters, sample_images, stats, countries, pinboards })
		}).catch(err => console.log(err))
	}).then(data => res.render('home', data))
	.catch(err => console.log(err))
}
