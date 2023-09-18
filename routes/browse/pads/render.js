const { page_content_limit, modules, metafields, engagementtypes, lazyload, map, browse_display, welcome_module, ownDB, DB } = include('config/')
const { array, datastructures, checklanguage, join, parsers } = include('routes/helpers/')

const fetch = require('node-fetch')

const load = require('./load/')
const filter = require('./filter.js')

module.exports = async (req, res) => {
	const { uuid, rights, collaborators, public } = req.session || {}
	const { object, space, instance } = req.params || {}

	const language = checklanguage(req.params?.language || req.session.language)

	if (public && !(['public', 'pinned'].includes(space) || instance)) res.redirect('/login')
	else if (rights < modules.find(d => d.type === 'pads')?.rights.read && !(['public', 'pinned'].includes(space) || instance)) res.redirect(`./public`)
	else {
		let { mscale, display, pinboard } = req.query || {}
		const path = req.path.substring(1).split('/')
		const activity = path[1]
		if (instance) pinboard = res.locals.instance_vars?.pinboard

		// GET FILTERS
		const [ f_space, order, page, full_filters ] = await filter(req, res)

		DB.conn.tx(async t => {
			const batch = []

			// PADS DATA
			batch.push(load.data({ connection: t, req, res }))
			// LIST OF ALL PAD IDS, BASED ON FILTERS
			// GET PADS COUNT, ACCORDING TO FILTERS: TO DO: MOVE THIS TO load/data.js
			// THIS IS ONLY FOR THE pin all FUNCTION. CAN PROBABLY BE IMPROVED BASED ON FILTERS
			batch.push(t.any(`
				SELECT p.id FROM pads p
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
			batch.push( load.map_data({ connection: t, req, res }))

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
						) THEN TRUE ELSE FALSE END AS is_exploration
					FROM pinboards p
					WHERE $1 IN (SELECT participant FROM pinboard_contributors WHERE pinboard = p.id)
					GROUP BY p.id
					ORDER BY p.title
				;`, [ uuid ]).then(rows => {
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

					WHERE p.id = $3::INT
					GROUP BY p.id
				;`, [ uuid, rights, pinboard ])
				.then(async result => {
					const data = await join.users(result, [ language, 'owner' ])
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
				sample_images
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
