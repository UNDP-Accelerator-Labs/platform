// THIS IS HEAVILY INSPIRED BY browse/pads/render.js
const { page_content_limit, modules, metafields, engagementtypes, lazyload, map, browse_display, DB } = include('config/')
const { array, datastructures, checklanguage, join, redirectUnauthorized } = include('routes/helpers/')

const fetch = require('node-fetch')

const load = require('./load/')
const filter = require('./filter.js')

module.exports = async (req, res) => {
	const { uuid, rights, collaborators, public } = req.session || {}

	if (public || rights < modules.find(d => d.type === 'reviews')?.rights.read) redirectUnauthorized(req, res)
	else {
		const { object, space } = req.params || {}
		const { display } = req.query || {}
		const language = checklanguage(req.params?.language || req.session.language)

		// GET FILTERS
		const filter_result = await filter(req, res);
		const [ f_space, order, page, full_filters ] = filter_result;

		DB.conn.tx(async t => {
			const batch = []

			// PADS DATA
			// batch.push(load.data({ connection: t, req })) // THIS IS DEPRECATED: SEE brouse/pads/render.js FOR EXPLANATION
			batch.push(null)
			// FILTERS MENU DATA
			batch.push(load.filters_menu({ connection: t, req, filters: filter_result }))
			// SUMMARY STATISTICS
			batch.push(load.statistics({ connection: t, req, filters: filter_result }))

			return t.batch(batch)
			.then(async results => {
				let [ data,
					filters_menu,
					statistics
				] = results

				const { sections, pads } = data || {} // THIS SHOULD BE DEPRECATED
				const stats = {
					total: array.sum.call(statistics.total, 'count'),
					filtered: array.sum.call(statistics.filtered, 'count'),

					pending: statistics.pending,
					ongoing: statistics.ongoing,
					past: statistics.past,

					displayed: page_content_limit,
					breakdown: statistics.filtered,
					persistent_breakdown: statistics.persistent
				}

				const metadata = await datastructures.pagemetadata({ req, page, pagecount: Math.ceil((array.sum.call(statistics.filtered, 'count') || 0) / page_content_limit), display })
				return Object.assign(metadata, { sections, pads, stats, filters_menu })
			})
		}).then(data => res.render('browse/', data))
		.catch(err => console.log(err))
	}
}
