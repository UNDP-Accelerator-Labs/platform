const { DB, engagementtypes } = include('config/')
const { parsers, safeArr, DEFAULT_UUID } = include('routes/helpers/')

module.exports = req => {
	const { uuid, country, rights, collaborators } = req.session || {}
	const { space } = req.params || {}
	let { files, search, status, contributors, countries, regions, page, orderby } = Object.keys(req.query)?.length ? req.query : Object.keys(req.body)?.length ? req.body : {}

	const collaborators_ids = safeArr(collaborators.map(d => d.uuid), uuid ?? DEFAULT_UUID)

	// MAKE SURE WE HAVE PAGINATION INFO
	if (!page) page = 1
	else page = +page

	// FILTERS
	return new Promise(async resolve => {
		// BASE FILTERS
		const base_filters = []
		if (search) base_filters.push(DB.pgp.as.format(`f.full_text ~* $1 OR f.name ~* $1`, [ parsers.regexQuery(search) ]))
		if (status) base_filters.push(DB.pgp.as.format(`f.status IN ($1:csv)`, [ status ]))		

		let f_space = null
		if (space === 'private') f_space = DB.pgp.as.format(`f.owner IN ($1:csv)`, [ collaborators_ids ])
		else if (space === 'shared') f_space = DB.pgp.as.format(`f.status = 2`, [ collaborators_ids ])
		else if (space === 'public') f_space = DB.pgp.as.format(`f.status = 3`, [ collaborators_ids ])
		else if (space === 'all') f_space = DB.pgp.as.format(`(f.status > 0 AND $1 > 2)`, [ rights])
		base_filters.push(f_space)

		// PLATFORM FILTERS
		const platform_filters = []
		if (files) platform_filters.push(DB.pgp.as.format(`f.id IN ($1:csv)`, [ files ]))
		if (contributors) platform_filters.push(DB.pgp.as.format(`f.owner IN ($1:csv)`, [ contributors ]))		

		if (countries?.length) {
			platform_filters.push(await DB.general.any(`
				SELECT uuid FROM users WHERE iso3 IN ($1:csv)
			;`, [ countries ])
			.then(results => DB.pgp.as.format(`f.owner IN ($1:csv)`, [ safeArr(results.map(d => d.uuid), DEFAULT_UUID) ]))
			.catch(err => console.log(err)))
		} else if (regions) {
			platform_filters.push(await DB.general.any(`
				SELECT u.uuid FROM users u
				INNER JOIN adm0_subunits c
					ON c.su_a3 = u.iso3
					OR c.adm0_a3 = u.iso3
				WHERE c.undp_bureau IN ($1:csv)
			;`, [ regions ])
			.then(results => DB.pgp.as.format(`f.owner IN ($1:csv)`, [ safeArr(results.map(d => d.uuid), DEFAULT_UUID) ]))
			.catch(err => console.log(err)))
		}

		// CONTENT FILTERS
		const content_filters = []
		// NO CONTENT FILTERS (LIKE TAGS) ARE SET FOR files FOR NOW
	
		let filters = [ base_filters.filter(d => d).join(' AND '), platform_filters.filter(d => d).join(' AND '), content_filters.filter(d => d).join(' AND ') ]
			.filter(d => d?.length)
			.map(d => `(${d.trim()})`)
			.join(' AND ')
			.trim()

		if (filters.length && filters.slice(0, 3) !== 'AND') filters = `AND ${filters}`

		// ORDER
		let order = DB.pgp.as.format(`ORDER BY f.date DESC`)
		if (orderby === 'random') order = DB.pgp.as.format(`ORDER BY RANDOM()`)

		resolve([ `AND ${f_space}`, order, page, filters ])
	})
}
