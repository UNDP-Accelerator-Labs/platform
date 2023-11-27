const { DB, engagementtypes } = include('config/')
const { parsers, safeArr, DEFAULT_UUID } = include('routes/helpers/')

module.exports = req => {
	const { uuid, rights } = req.session || {}
	let { space } = req.params || {}
	if (!space) space = Object.keys(req.query)?.length ? req.query.space : Object.keys(req.body)?.length ? req.body.space : {} // req.body?.space // THIS IS IN CASE OF POST REQUESTS (e.g. COMMING FROM APIS/ DOWNLOAD)

	let { search, mobilizations, templates, page, nodes } = Object.keys(req.query)?.length ? req.query : Object.keys(req.body)?.length ? req.body : {}

	// MAKE SURE WE HAVE PAGINATION INFO
	if (!page) page = 1
	else page = +page

	const filters = []
	if (search) filters.push(DB.pgp.as.format(`AND (m.title ~* $1)`, [ parsers.regexQuery(search) ]))
	if (mobilizations) filters.push(DB.pgp.as.format(`AND m.id IN ($1:csv)`, [ mobilizations ]))
	if (templates) filters.push(DB.pgp.as.format(`AND m.template IN ($1:csv)`, [ templates ]))

	// ONGOING OR PAST MOBILIZATION
	let f_space = null
	if (space === 'scheduled') f_space = DB.pgp.as.format(`AND m.status = 0`)
	else if (space === 'ongoing') f_space = DB.pgp.as.format(`AND m.status = 1`)
	else if (space === 'past') f_space = DB.pgp.as.format(`AND m.status = 2`)
	else if (space === 'versiontree') {
		f_space = DB.pgp.as.format(`
			AND (m.version @> (SELECT version FROM mobilizations WHERE id IN ($1:csv) AND (status >= m.status OR (owner IN ($2:csv) OR $3 > 2)))
			OR m.version <@ (SELECT version FROM mobilizations WHERE id IN ($1:csv) AND (status >= m.status OR (owner IN ($2:csv) OR $3 > 2))))
		`, [ safeArr(nodes, -1), safeArr(uuid, DEFAULT_UUID), rights ])
	}

	if (f_space) filters.push(f_space)

	// ORDER
	let order = null
	if (['ongoing', 'scheduled'].includes(space)) order = DB.pgp.as.format(`ORDER BY m.start_date DESC`)
	else if (['past', 'versiontree'].includes(space)) order = DB.pgp.as.format(`ORDER BY m.end_date DESC, m.start_date DESC`)

	return [ f_space, order, page, filters.join(' ') ]
}
