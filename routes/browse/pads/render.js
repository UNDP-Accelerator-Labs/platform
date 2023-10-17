const { page_content_limit, modules, metafields, engagementtypes, lazyload, map, browse_display, welcome_module, ownDB, DB } = include('config/')
const { array, datastructures, checklanguage, join, parsers, pagestats } = include('routes/helpers/')

const fetch = require('node-fetch')

const load = require('./load/')
const filter = require('./filter.js')

module.exports = async (req, res) => {
	const { uuid, rights, collaborators, public } = req.session || {}
	const { object, space, instance } = req.params || {}
	let { mscale, display, pinboard, section } = req.query || {}

	const language = checklanguage(req.params?.language || req.session.language)

	if (public && !(['public', 'pinned'].includes(space) || instance)) res.redirect('/login')
	else if (rights < modules.find(d => d.type === 'pads')?.rights.read && !(['public', 'pinned'].includes(space) || instance)) res.redirect(`./public`)
	else if (space === 'pinned' && !pinboard) res.redirect(`./public`)
	else {

		// FIRST CHECK IF THIS IS A PINBORD THAT HAS SECTIONS
		// AND IF THE SECTION IS NOT PASSED IN THE query, REDIRECT TO PASS IT
		if (space === 'pinned' && pinboard && !section) {
			section = await DB.general.one(`
				SELECT MIN(id) FROM pinboard_sections
				WHERE pinboard = $1::INT
			;`, [ pinboard ], d => d?.min)
			.catch(err => console.log(err))

			if (section) {
				const query = new URLSearchParams(req.query)
				query.append('section', section)
				return res.redirect(`${req.path}?${query.toString()}`)
			}
		}

		const path = req.path.substring(1).split('/')
		const activity = path[1]
		if (instance) pinboard = res.locals.instance_vars?.pinboard

		// GET FILTERS
		const filter_result = await filter(req, res);
		if (!filter_result) {
			return res.redirect('/login');
		}
		const [ f_space, order, page, full_filters ] = filter_result;

		DB.conn.tx(async t => {
			const batch = []

			// PADS DATA
			batch.push(load.data({ connection: t, req, res }))
			// LIST OF ALL PAD IDS, BASED ON FILTERS
			// GET PADS COUNT, ACCORDING TO FILTERS: TO DO: MOVE THIS TO load/data.js
			// THIS IS ONLY FOR THE pin all FUNCTION. CAN PROBABLY BE IMPROVED BASED ON FILTERS
			batch.push(t.any(`
				SELECT DISTINCT p.id FROM pads p
				LEFT JOIN mobilization_contributions mob
					ON p.id = mob.pad
				WHERE p.id NOT IN (SELECT review FROM reviews)
					$1:raw
			;`, [ full_filters ]).then(d => d.map(c => c.id))
			.catch(err => console.log(err)))

			// FILTERS MENU DATA
			batch.push(load.filters_menu({ connection: t, req, res }))
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
				// batch1.push(t1.any())
				return t1.batch(batch1)
				.catch(err => console.log(err))
			}))
			// PINBOARDS LIST
			if (modules.some(d => d.type === 'pinboards' && d.rights.read <= rights)) {
				const ownId = await ownDB();
				const pcounts = new Map((await DB.general.any(`
					SELECT COUNT (DISTINCT (pad)) as pcount, pinboard as pid
					FROM pinboard_contributions
					WHERE db = $1 AND is_included = true GROUP BY pinboard
				`, [ ownId ])).map((row) => [row.pid, row.pcount]));
				const mcounts = new Map((await t.any(`
					SELECT COUNT (DISTINCT (pad)) as mcount, mobilization as mid
					FROM mobilization_contributions
					GROUP BY mobilization
				`)).map((row) => [row.mid, row.mcount]));
				batch.push(DB.general.any(`
					SELECT p.id, p.title, mobilization_db as mdb, mobilization as mid,
						CASE WHEN EXISTS (
							SELECT 1 FROM exploration WHERE linked_pinboard = p.id
						) THEN TRUE ELSE FALSE END AS is_exploration,
						(SELECT COUNT(*) FROM pinboard_contributions WHERE pinboard = p.id AND db = $2 AND is_included = true) as count
					FROM pinboards p
					WHERE $1 IN (SELECT participant FROM pinboard_contributors WHERE pinboard = p.id)
					GROUP BY p.id
					ORDER BY p.title
				;`, [ uuid, ownId ]).then(rows => {
					return rows.map((row) => {
						let count = 0;
						if (pcounts.has(row.id)) {
							count = pcounts.get(row.id);
						} else if (mcounts.has(row.mid) && row.mdb === ownId) {
							count = mcounts.get(row.mid);
						}
						return {
							...row,
							count,
						};
					});
				}).catch(err => console.log(err)));
			} else batch.push(null)
			// PINBOARD
			if (modules.some(d => d.type === 'pinboards') && pinboard) {
				batch.push(DB.general.one(`
					SELECT p.*, array_agg(pc.participant) AS contributors,
						
						COALESCE(jsonb_agg(
							jsonb_build_object(
								'id', ps.id, 
								'title', ps.title, 
								'description', ps.description, 
								'count', (SELECT COUNT(1)::INT FROM pinboard_contributions WHERE section = ps.id)
							) ORDER BY ps.id) FILTER (WHERE ps.id IS NOT NULL), 
							'[]'::jsonb
						) AS sections,

						CASE WHEN p.owner = $1
						OR $1 IN (SELECT participant FROM pinboard_contributors WHERE pinboard = $3::INT)
						OR $2 > 2
							THEN TRUE
							ELSE FALSE
						END AS editable,
						CASE WHEN EXISTS (
							SELECT 1 FROM exploration WHERE linked_pinboard = p.id
						) THEN TRUE ELSE FALSE END AS is_exploration
					FROM pinboards p

					INNER JOIN pinboard_contributors pc
						ON pc.pinboard = p.id

					LEFT JOIN pinboard_sections ps
						ON p.id = ps.pinboard

					WHERE p.id = $3::INT
					GROUP BY p.id
				;`, [ uuid, rights, pinboard ])
				.then(async result => {
					const data = await join.users(result, [ language, 'owner' ])
					// NOTE: avoid double counting in the unlikely event that
					// the pinboard is referenced both through an instance
					// as well as a direct arg
					if (!res.locals?.instance_vars?.instanceId && !res.locals?.instance_vars?.docType) {
						data.readCount = await pagestats.getReadCount(pinboard, 'pinboard');
						await pagestats.recordRender(req, pinboard, 'pinboard');
					}
					return data
				}).catch(err => console.log(err)))
			} else batch.push(null)
			if (public && !pinboard) {
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
			} else batch.push(null)

			let [ data,
				pads,
				filters_menu,
				statistics,
				clusters,
				pinboards_list,
				pinboard_out,
				sample_images,
			] = await t.batch(batch);
			// const { sections, pads } = data
			const { sections } = data
			const stats = {
				total: array.sum.call(statistics.total, 'count'),
				filtered: array.sum.call(statistics.filtered, 'count'),

				private: statistics.private,
				curated: statistics.curated,
				shared: statistics.shared,
				reviewing: statistics.reviewing,
				public: statistics.public,

				displayed: data.count,
				breakdown: statistics.filtered,
				persistent_breakdown: statistics.persistent,
				contributors: statistics.contributors,
				tags: statistics.tags
			}

			const excerpt = pinboard_out?.status > 2 ? { title: pinboard_out.title, txt: pinboard_out.description, p: true } : null

			const metadata = await datastructures.pagemetadata({ req, res, page, pagecount: Math.ceil((array.sum.call(statistics.filtered, 'count') || 0) / page_content_limit), map, display: pinboard_out?.slideshow && (!pinboard_out?.editable || activity === 'preview') ? 'slideshow' : display, mscale, excerpt })
			return Object.assign(metadata, { sections, pads, clusters, pinboards_list, pinboard: pinboard_out, sample_images, stats, filters_menu })
		}).then(data => res.render('browse/', data))
		.catch(err => console.log(err))
	}
}
