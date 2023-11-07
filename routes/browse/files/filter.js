const { DB, engagementtypes } = include('config/')
const { parsers, safeArr, DEFAULT_UUID } = include('routes/helpers/')

module.exports = req => {
	const { uuid, country, rights, collaborators } = req.session || {}
	const { space } = req.params || {}
	let { pads, search, contributors, countries, templates, mobilizations, methods, datasources, sdgs, tags, page } = Object.keys(req.query)?.length ? req.query : Object.keys(req.body)?.length ? req.body : {}
	const sudo = rights > 2
	const collaborators_ids = safeArr(collaborators.map(d => d.uuid), uuid ?? DEFAULT_UUID)

	// MAKE SURE WE HAVE PAGINATION INFO
	if (!page) page = 1
	else page = +page

	// FILTERS
	return new Promise(async resolve => {
		// TO DO: CHANGE pads TO files, ALSO IN THE req.query
		const f_pads = pads ? DB.pgp.as.format(`f.id IN ($1:csv)`, [ pads ]) : null
		// SEARCH IS ONLY AVAILABLE FOR PAD-BASED FILES (pdf) IN files BECAUSE THERE IS NO full_text REPRESENTATION
		// THIS WOULD REQUIRE PARSING THE pdf IN A PYTHON CHILD PROCESS UPON UPLOAD
		const f_search = search ? DB.pgp.as.format(`(f.full_text ~* $1 OR f.name ~* $1)`, [ parsers.regexQuery(search) ]) : null
		const f_contributors = contributors ? DB.pgp.as.format(`f.owner IN ($1:csv)`, [ contributors ]) : null

		let f_countries = null
		if (countries) {
			f_countries = await DB.general.any(`
				SELECT uuid FROM users WHERE iso3 IN ($1:csv)
			;`, [ countries ])
			.then(results =>  DB.pgp.as.format(`f.owner IN ($1:csv)`, [ safeArr(results.map(d => d.uuid), DEFAULT_UUID) ]))
			.catch(err => console.log(err))
		}

		// PUBLIC/ PRIVATE FILTERS
		let f_space = ''
		if (space === 'private') f_space = DB.pgp.as.format(`AND f.owner IN ($1:csv)`, [ collaborators_ids ])
		
		if (space === 'all')	f_space = DB.pgp.as.format(`AND f.status > 0 AND $1 > 2`, [ rights])
		// ORDER
		let order = DB.pgp.as.format(`ORDER BY f.date DESC`)

		// ADDITIONAL FILTER FOR SETTING UP THE "LINKED PADS" DISPLAY
		const platform_filters = [f_contributors, f_countries].filter(d => d).join(' OR ')
		const content_filters = [].filter(d => d).join(' OR ') 


		let filters = ''
		if (f_pads) {
			filters += f_pads
			if (f_search || platform_filters !== '' || (platform_filters === '' && content_filters !== '')) filters += ' AND '
		}
		if (f_search) {
			filters += f_search
			if (platform_filters !== '' || (platform_filters === '' && content_filters !== '')) filters += ' AND '
		}
		if (platform_filters !== '') {
			filters += `(${platform_filters})`
			if (content_filters !== '') filters += ' AND '
		}
		if (content_filters !== '') filters += `(${content_filters})`
		if (filters.length) filters = `AND ${filters}`
		
		resolve([ f_space, order, page, filters ])
	})
}
