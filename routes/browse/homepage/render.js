const { page_content_limit, modules, metafields, engagementtypes, lazyload, map, browse_display, welcome_module, ownDB, DB } = include('config/')
const { array, datastructures, checklanguage, join, parsers, safeArr } = include('routes/helpers/')

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
			return t1.batch(batch1)
			.catch(err => console.log(err))
		}))

		// THIS IS FOR THE BANNER AT THE TOP OF PUBLIC PAGES
		batch.push(t.any(`
			SELECT p.id, p.title, p.owner, p.sections FROM pads p
			WHERE p.id NOT IN (SELECT review FROM reviews)
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
		if (metafields.some((d) => d.type === 'location')) {
			batch.push(t.any(`
				SELECT COUNT(p.id)::INT, l.iso3 FROM pads p
				INNER JOIN locations l
					ON l.pad = p.id
				WHERE p.id NOT IN (SELECT review FROM reviews)
					$1:raw
				GROUP BY l.iso3
			;`, [ full_filters ]).then(async results => {
				// JOIN LOCATION INFO
				results = await join.locations(results, { language, key: 'iso3' })
				return results.sort((a, b) => a.country.localeCompare(b.country))
			}).catch(err => console.log(err)))
		} else {
			batch.push(t.any(`
				SELECT COUNT(p.id)::INT, p.owner FROM pads p
				WHERE p.id NOT IN (SELECT review FROM reviews)
					$1:raw
				GROUP BY p.owner
			;`, [ full_filters ]).then(results => {
				if (results.length) {
					return DB.general.tx(gt => {
						const columns = Object.keys(results[0])
						const values = DB.pgp.helpers.values(results, columns)
						const set_table = DB.pgp.as.format(`SELECT $1:name FROM (VALUES $2:raw) AS t($1:name)`, [ columns, values ])

						return gt.any(`
							SELECT t.count, u.iso3 
							FROM users u
							INNER JOIN ($1:raw) t
								ON t.owner::uuid = u.uuid::uuid
							ORDER BY u.iso3
						;`, [ set_table ])
						.then(async users => {
							// JOIN LOCATION INFO
							users = await join.locations(users, { connection: gt, language, key: 'iso3' })
							return users
						}).catch(err => console.log(err))
					}).catch(err => console.log(err))
				} else return []
			}).catch(err => console.log(err)))
		}
		// LIST OF PINBOARDS/ COLLECTIONS
		batch.push(ownDB().then(async ownId => {
			const pads = new Map();
			(await DB.general.any(`
				SELECT pb.id, pc.pad FROM pinboards pb
				INNER JOIN pinboard_contributions pc
					ON pc.pinboard = pb.id
				WHERE pb.status > 2 AND pc.db = $1 AND pc.is_included = true
			`, [ ownId ])).forEach(row => {
				const padlist = pads.get(row.id) ?? [];
				padlist.push(row.pad);
				pads.set(row.id, padlist);
			});
			const pbids = [...pads.keys()];
			const counts = await t.batch(pbids.map((pbid) => {
				return t.one(`
					SELECT COUNT(*)::INT AS count
					FROM pads p
					WHERE p.id IN ($2:csv)
						$1:raw
				`, [ full_filters, safeArr(pads.get(pbid), -1) ]);
			}));
			const countMap = new Map(pbids.map((pbid, index) => [ pbid, counts[index] ]));
			return (await DB.general.any(`
				SELECT pb.id, pb.title, pb.date, pb.owner, u.name AS ownername,
					CASE WHEN EXISTS (
						SELECT 1 FROM exploration WHERE linked_pinboard = pb.id
					) THEN TRUE ELSE FALSE END AS is_exploration
				FROM pinboards pb
				INNER JOIN users u
					ON u.uuid = pb.owner
				WHERE pb.status > 2
			;`, [ full_filters ])).map(pbRow => ({
				...pbRow,
				count: countMap.get(pbRow.id)?.count ?? 0,
			}));
		}).catch(err => console.log(err)));

		return t.batch(batch)
		.then(async results => {
			const [ statistics,
				clusters,
				sample_images,
				countries,
				pinboards
			] = results;

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
