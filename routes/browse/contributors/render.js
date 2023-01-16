const { page_content_limit, modules, metafields, lazyload, map, DB } = include('config')
const header_data = include('routes/header/').data
const load = require('./load')
const { array, checklanguage, datastructures } = include('routes/helpers/')

const filter = require('./filter').main

exports.main = (req, res) => {
	const { object, space } = req.params || {}
	const { pinboard, display } = req.query || {}
	const { uuid, rights, collaborators } = req.session || {}
	const language = checklanguage(req.params?.language || req.session.language)
	// GET FILTERS
	const [ f_space, page, full_filters ] = filter(req)
	let collaborators_ids = collaborators.filter(d => d.rights > 0).map(d => d.uuid)
	if (!collaborators_ids.length) collaborators_ids = [null]

	if (space === 'pinned' && page) res.redirect(`./invited?page=${page}`)
	else {
		DB.general.tx(async t => {
			const batch = []
			
			// PADS DATA
			batch.push(load.data({ connection: t, req }))
			// FILTERS_MENU
			batch.push(load.filters_menu({ connection: t, req }))
			// SUMMARY STATISTICS
			batch.push(load.statistics({ connection: t, req }))

			// PINBOARDS LIST
			if (modules.some(d => d.type === 'teams' && d.rights.read <= rights)) {
				batch.push(t.any(`
					SELECT t.id, t.name AS title, COALESCE(COUNT (DISTINCT (tm.member)), 0)::INT AS count FROM teams t
					INNER JOIN team_members tm
						ON tm.team = t.id
					WHERE t.host IN ($1:csv)
					GROUP BY t.id
					ORDER BY t.name
				;`, [ collaborators_ids ])
				.catch(err => console.log(err)))
			} else batch.push(null)
			// PINBOARD 
			if (modules.some(d => d.type === 'teams') && pinboard) {
				batch.push(t.one(`
					SELECT t.id, t.name AS title, t.host AS owner, t.description, t.status,
						CASE WHEN t.host = $1
						OR $2 > 2
							THEN TRUE
							ELSE FALSE
						END AS editable

					FROM teams t
					WHERE t.id = $3::INT
				;`, [ uuid, rights, pinboard, language ])
				.catch(err => console.log(err)))
			} else batch.push(null)

			return t.batch(batch)
			.then(async results => {
				let [ data,
					filters_menu,
					statistics,
					pinboards_list,
					pinboard
				] = results

				const { sections } = data
				const stats = { 
					total: array.sum.call(statistics.total, 'count'), 
					filtered: array.sum.call(statistics.filtered, 'count'),
					displayed: array.sum.call(statistics.displayed, 'count'),
					
					// breakdown: statistics.filtered,
					persistent_breakdown: statistics.persistent,

					invited: statistics.invited,
					// curated: statistics.curated,
					// shared: statistics.shared,
					// public: statistics.public,
					
					// contributors: statistics.contributors,

					toc: statistics.toc
				}


				const metadata = await datastructures.pagemetadata({ req, page, map: false, display: display || 'rows' })
				return Object.assign(metadata, { sections, pinboards_list, pinboard, stats, filters_menu })
			})
		}).then(data => res.render('browse/', data))
		.catch(err => console.log(err))
	}
}