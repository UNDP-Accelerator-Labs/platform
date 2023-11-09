const { page_content_limit, modules, metafields, lazyload, DB } = include('config/')
// const header_data = include('routes/header/').data
const helpers = include('routes/helpers/')

const fetch = require('node-fetch')

const load = require('./load/')
const filter = require('./filter.js')

module.exports = async (req, res) => {
	const { public } = req.session || {}

	if (public) res.redirect('/login')
	else {
		const { object, space } = req.params || {}
		// GET FILTERS
		const [ f_space, order, page, full_filters ] = await filter(req)

		DB.conn.tx(async t => {
			// const { pagetitle, path, uuid, username, country, rights, language, query, templates, participations } = await header_data({ connection: t, req: req })

			const batch = []

			// FILES DATA
			batch.push(load.data({ connection: t, req }))
			// GET THE FILTERS FOR THE filters_MENU
			batch.push(load.filters_menu({ connection: t, req }))
			// SUMMARY STATISTICS
			batch.push(load.statistics({ connection: t, req }))

			// GET LOCATIONS, ACCORDING TO FILTERS
			// THIS IS CURRENTLY NOT USED

			return t.batch(batch)
			.then(async results => {
				let [ data,
					filters_menu,
					statistics,
					// locations
				] = results

				return {
					metadata : {
						site: {
							modules,
							metafields
						},
						page: {
							title: pagetitle,
							path,
							id: page,
							count: Math.ceil((helpers.array.sum.call(statistics.filtered, 'count') || 0) / page_content_limit),
							lazyload,
							language,
							activity: path[1],
							object,
							space,
							query,
							map: false
						},
						menu : {
							templates,
							participations
						},
						user: {
							uuid,
							name: username,
							country,
							centerpoint: JSON.stringify(req.session.country?.lnglat || {}),
							rights,
							pagestats: {
								id: req.session.read_doc_id,
								docType: req.session.read_doc_type,
							},
						}
					},
					stats: {
						total: helpers.array.sum.call(statistics.total, 'count'),
						filtered: helpers.array.sum.call(statistics.filtered, 'count'),

						private: statistics.private,
						shared: statistics.shared,
						public: statistics.public,

						displayed: data.count,
						breakdown: statistics.filtered,
						persistent_breakdown: statistics.total,
						contributors: statistics.contributors
						// sdgs: helpers.unique.call(sdgs, { key: 'key' }).length,
						// thematic_areas: helpers.unique.call(thematic_areas, { key: 'name' }).length
					},
					filters_menu,

					data: data.data, // STILL NEED THIS FOR THE MAP AND PIE CHARTS. ULTIMATELY REMOVE WHEN NEW EXPLORE VIEW IS CREATED
					sections: data.sections

					// locations: JSON.stringify(locations),
					// clusters: JSON.stringify(clusters)
				}
			})
		}).then(data => res.render('browse/', data))
		.catch(err => console.log(err))
	}
}
