const { page_content_limit, modules, DB } = include('config/')
const { array, checklanguage, datastructures } = include('routes/helpers/')

const load = require('./load/')

// TO DO: INTEGRATE OPTIONS FROM config.js
const filter = require('./filter.js')

module.exports = async (req, res) => {
	const { public, rights } = req.session || {}
	
	// GET FILTERS
	const filter_result = await filter(req);
	const [ f_space, order, page, full_filters ] = filter_result;

	if (public || rights < modules.find(d => d.type === 'files')?.rights.read) res.redirect('/login')
	else {
		const { display } = req.query || {}

		DB.conn.tx(async t => {		
			const batch = []
			
			// FILE DATA
			// batch.push(load.data({ connection: t, req }))  // THIS IS DEPRECATED: SEE brouse/pads/render.js FOR EXPLANATION
			batch.push(null)
			// FILTERS_MENU
			batch.push(load.filters_menu({ connection: t, req, filters: filter_result }))
			// SUMMARY STATISTICS
			batch.push(load.statistics({ connection: t, req, filters: filter_result }))

			return t.batch(batch)
			.then(async results => {
				let [ data, 
					filters_menu,
					statistics
				] = results

				const stats = { 
					total: array.sum.call(statistics.total, 'count'), 
					filtered: array.sum.call(statistics.filtered, 'count'),
					
					private: statistics.private,
					shared: statistics.shared,
					public: statistics.public,
					all: statistics.all,
					
					displayed: page_content_limit,
					breakdown: statistics.filtered,
					contributors: statistics.contributors
				}

				const metadata = await datastructures.pagemetadata({ req, page, pagecount: Math.ceil((array.sum.call(statistics.filtered, 'count') || 0) / page_content_limit), display })
				return Object.assign(metadata, { sections: data?.sections, stats, filters_menu })
			})
		}).then(data => res.render('browse/', data))
		.catch(err => console.log(err))
	}
}