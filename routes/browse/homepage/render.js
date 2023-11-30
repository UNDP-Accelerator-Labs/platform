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
	const filter_result = await filter(req, res);
	const [ full_filters ] = filter_result;

	DB.conn.tx(async t => {
		const batch = []

		// SUMMARY STATISTICS
		batch.push(load.statistics({ connection: t, req, res, filters: filter_result }))
		// LOCATIONS COUNT
		if (metafields.some(d => d.type === 'location') && map) {
			batch.push(t.oneOrNone(`
				SELECT COUNT (DISTINCT (l.lat, l.lng)) AS count FROM locations l
				INNER JOIN pads p
					ON p.id = l.pad
				WHERE TRUE
					$1:raw
			;`, [ full_filters ], d => +d.count))
		} else if (map) {
			batch.push(t.any(`
				SELECT DISTINCT (p.id), p.owner FROM pads p
				WHERE TRUE
					$1:raw
			;`, [ full_filters ])
			.then(async results => {
				// TO DO: PROBABLY NEED TO HANDLE EQUIVALENT LOCATIONS (su_a3 AND adm0_a3)
				let data = await join.users(results, [ language, 'owner' ])
				data = array.unique.call(data, { key: 'iso3', onkey: true })
				return data.length
			}).catch(err => console.log(err)))
		} else batch.push(null)

		// LIST OF COUNTRIES
		if (metafields.some((d) => d.type === 'location')) {
			batch.push(t.any(`
				SELECT COUNT(DISTINCT(p.id))::INT, jsonb_agg(DISTINCT(p.id)) AS pads, l.iso3 FROM pads p
				INNER JOIN locations l
					ON l.pad = p.id
				WHERE p.id NOT IN (SELECT review FROM reviews)
					$1:raw
				GROUP BY l.iso3
			;`, [ full_filters ])
			.then(async results => {
				// JOIN LOCATION INFO
				let countries = await join.locations(results, { language, key: 'iso3' })

				if (countries.length !== array.unique.call(countries, { key: 'country' }).length) {
					console.log('equivalents: need to do something about countries that have equivalents')
					countries = array.nest.call(countries, { key: 'country', keyname: 'country' })
					.map(d => {
						const obj = {}
						obj.country = d.country

						if (d.count > 1) {
							obj.count = array.unique.call(d.values.map(c => c.pads).flat()).length
							obj.iso3 = d.values.splice(0, 1)[0].iso3
							obj.equivalents = d.values.map(c => c.iso3)
						} else {
							obj.count = d.values[0].count
							obj.iso3 = d.values[0].iso3
						}
						return obj
					})
					.filter(d => d.country)  // FIXME: investigate why country might be undefined here
				} else console.log('no equivalents: do nothing')
				countries.sort((a, b) => a?.country?.localeCompare(b.country))
				return countries
			}).catch(err => console.log(err)))

		} else {
			// TO DO: THIS IS DIFFERENT/ CHECK EQUIVALENTS
			// batch.push(t.any(`
			// 	SELECT COUNT(p.id)::INT, p.owner FROM pads p
			// 	WHERE p.id NOT IN (SELECT review FROM reviews)
			// 		$1:raw
			// 	GROUP BY p.owner
			// ;`, [ full_filters ]).then(results => {
			// 	if (results.length) {
			// 		return DB.general.tx(gt => {
			// 			const columns = Object.keys(results[0])
			// 			const values = DB.pgp.helpers.values(results, columns)
			// 			const set_table = DB.pgp.as.format(`SELECT $1:name FROM (VALUES $2:raw) AS t($1:name)`, [ columns, values ])

			// 			return gt.any(`
			// 				SELECT t.count, u.iso3
			// 				FROM users u
			// 				INNER JOIN ($1:raw) t
			// 					ON t.owner::uuid = u.uuid::uuid
			// 				ORDER BY u.iso3
			// 			;`, [ set_table ])
			// 			.then(async users => {
			// 				console.log('pre')
			// 				console.log(users)
			// 				// JOIN LOCATION INFO
			// 				users = await join.locations(users, { connection: gt, language, key: 'iso3' })
			// 				console.log('post')
			// 				console.log(users)
			// 				return users
			// 			}).catch(err => console.log(err))
			// 		}).catch(err => console.log(err))
			// 	} else return []
			// }).catch(err => console.log(err)))


			batch.push(t.any(`
				SELECT p.owner
				FROM pads p
				WHERE p.id NOT IN (SELECT review FROM reviews)
					$1:raw
			;`, [ full_filters ])
			.then(async results => {
				if (results.length) {
					let countries = await join.users(results, [ language, 'owner' ])
					const iso3s = array.unique.call(countries, { key: 'iso3', onkey: true })

					// THIS NEEDS SOME CLEANING FOR THE FRONTEND
					if (iso3s.length !== array.unique.call(countries, { key: 'country' }).length) {
						console.log('equivalents: need to do something about countries that have equivalents')
						countries = array.nest.call(countries, { key: 'country', keyname: 'country' })
						.map(d => {
							const obj = {}
							obj.country = d.country

							if (d.count > 1) {
								obj.count = array.unique.call(d.values.map(c => c.pads).flat()).length
								obj.iso3 = d.values.splice(0, 1)[0].iso3
								obj.equivalents = d.values.map(c => c.iso3)
							} else {
								obj.count = d.values[0].count
								obj.iso3 = d.values[0].iso3
							}

							return obj
						})
					} else {
						console.log('no equivalents: do simple cleanup for frontend')
						countries = array.nest.call(countries, { key: 'country', keyname: 'country', keep: 'iso3' })
						.map(d => {
							const obj = {}
							obj.iso3 = d.iso3
							obj.country = d.country
							obj.count = d.count
							return obj
						})
					}
					countries.sort((a, b) => a.country?.localeCompare(b.country))
					return countries
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
				locations,
				countries,
				pinboards
			] = results;

			const stats = {
				total: array.sum.call(statistics.total, 'count'),
				contributors: statistics.contributors,
				tags: statistics.tags
			}

			const metadata = await datastructures.pagemetadata({ req, res, display, map, mscale })
			return Object.assign(metadata, { locations, stats, countries, pinboards })
		}).catch(err => console.log(err))
	}).then(data => res.render('home', data))
	.catch(err => console.log(err))
}
