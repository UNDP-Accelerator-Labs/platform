const { page_content_limit, modules, metafields, lazyload, DB } = include('config/')
const load = require('./load/')
const { array, datastructures } = include('routes/helpers/')

// TO DO: INTEGRATE OPTIONS FROM config.js
const filter = require('./filter.js')

module.exports = (req, res) => {
	const { public, rights } = req.session || {}
	
	if (public || rights < modules.find(d => d.type === 'mobilizations')?.rights.read) res.redirect('/login')
	else {
		const { object, space } = req.params || {}
		const { display } = req.query || {}
		// GET FILTERS
		const [ f_space, order, page, full_filters ] = filter(req)

		DB.conn.tx(async t => {
			const batch = []
			// PADS DATA
			batch.push(load.data({ connection: t, req }))
			// FILTERS_MENU
			batch.push(load.filters_menu({ connection: t, req }))
			// SUMMARY STATISTICS
			batch.push(load.statistics({ connection: t, req }))

			return t.batch(batch)
			.then(async results => {
				let [ data,
					filters_menu,
					statistics
				] = results

				const stats = { 
						total: array.sum.call(statistics.total, 'count'), 
						filtered: array.sum.call(statistics.filtered, 'count'),
						
						scheduled: statistics.scheduled,
						ongoing: statistics.ongoing,
						past: statistics.past,
						
						displayed: data.count,
						breakdown: statistics.filtered,
						persistent_breakdown: statistics.total
						// contributors: statistics.contributors,
					}

				const metadata = await datastructures.pagemetadata({ req, page, pagecount: Math.ceil((array.sum.call(statistics.filtered, 'count') || 0) / page_content_limit), display: display || 'rows' })
				return Object.assign(metadata, { sections: data.sections, stats, filters_menu })
			})
		}).then(data => res.render('browse/', data))
		.catch(err => console.log(err))
	}
}