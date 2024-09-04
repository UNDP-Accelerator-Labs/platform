const { page_content_limit, modules, metafields, lazyload, map, welcome_module, app_home, ownDB, DB } = include('config/')
const { array, datastructures, checklanguage, join, parsers, pagestats, redirectUnauthorized } = include('routes/helpers/')

const fetch = require('node-fetch')

const load = require('./load/')
const filter = require('./filter.js')

module.exports = async (req, res) => {
	const { uuid, rights, collaborators, public } = req.session || {}
	const { object, space, instance } = req.params || {}
	let { mscale, display, pinboard, section } = req.query || {}

	const language = checklanguage(req.params?.language || req.session.language)

	if (public && !(['public', 'pinned'].includes(space) || instance)) redirectUnauthorized(req, res)
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
			return redirectUnauthorized(req, res);
		}
		const [ f_space, order, page, full_filters ] = filter_result;

		DB.conn.tx(async t => {
			const batch = []

			// PADS DATA: THIS IS NOW HANDLED THROUGH AN AJAX REQUEST
			// batch.push(load.data({ connection: t, req, res }))
			batch.push(null) // THIS IS TEMP FOR TESTING, IN ORDER TO NOT DISTURB THE DESTRUCTURING OF results BELOW
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
			batch.push(load.filters_menu({ connection: t, req, res, filters: filter_result }))
			// SUMMARY STATISTICS
			batch.push(load.statistics({ connection: t, req, res, filters: filter_result }))
			// LOCATIONS DATA
			batch.push(load.locations({ connection: t, req, res, filters: filter_result })) // TO DO: TURN THIS SIMPLPY INTO A DISTINCT LOCATION COUNT
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
					data.readCount = await pagestats.getReadCount(pinboard, 'pinboard');
					return data
				}).catch(err => console.log(err)))
			} else batch.push(null)
			if (public && !pinboard) {
				// THIS IS FOR THE BANNER AT THE TOP OF PUBLIC PAGES
				// batch.push(load.samples({ connection: t, req, res, filters: filter_result }))
				// THIS IS NO LONGER NEEDED
				batch.push(null)
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
			const { sections } = data || {} // TO DO: THIS SHOULD BE DEPRECATED
			const stats = {
				total: array.sum.call(statistics.total, 'count'),
				filtered: array.sum.call(statistics.filtered, 'count'),

				private: statistics.private,
				curated: statistics.curated,
				shared: statistics.shared,
				reviewing: statistics.reviewing,
				public: statistics.public,
				all: statistics.all, // all IS ALL PUBLISHED

				displayed: page_content_limit,
				breakdown: statistics.filtered,
				persistent_breakdown: statistics.persistent,
				contributors: statistics.contributors,
				tags: statistics.tags
			}

			const excerpt = pinboard_out?.status > 2 ? { title: pinboard_out.title, txt: pinboard_out.description, p: true } : null

			const metadata = await datastructures.pagemetadata({ req, res, page, pagecount: Math.ceil((array.sum.call(statistics.filtered, 'count') || 0) / page_content_limit), map, display: pinboard_out?.slideshow && (!pinboard_out?.editable || activity === 'preview') ? 'slideshow' : display, mscale, excerpt })
			return Object.assign(metadata, { sections, pads, clusters, pinboards_list, pinboard: pinboard_out, sample_images, stats, filters_menu, blurb: app_home[language] || app_home['en'] })
		}).then(data => res.render('browse/', data))
		.catch(err => console.log(err))
	}
}
