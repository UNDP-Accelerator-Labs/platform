const { DB, engagementtypes } = include('config')
const { parsers } = include('routes/helpers')

exports.main = req => { 
	const { uuid, rights } = req.session || {}
	const { space } = req.params || {}
	
	// TO DO: UPDATE BELOW BASED ON FILTERS PASSED
	let { search, status, countries, positions, pinboard, page } = Object.keys(req.query)?.length ? req.query : Object.keys(req.body)?.length ? req.body : {}

	// BASE FILTERS
	const base_filters = []
	// const f_search = search ? DB.pgp.as.format(`AND (u.name::TEXT || u.position::TEXT || cn.name::TEXT ~* $1)`, [ parsers.regexQuery(search) ]) : null
	if (status) base_filters.push(DB.pgp.as.format(`AND u.confirmed::INT IN ($1:csv)`, [ status ]))

	let f_space = null	
	if (space === 'invited') f_space = DB.pgp.as.format(`AND (u.uuid IN (SELECT contributor FROM cohorts WHERE host = $1) OR $2 > 2)`, [ uuid, rights ])
	if (f_space) base_filters.push(f_space)

	// PLATFORM FILTERS
	const platform_filters = []
	if (countries) platform_filters.push(DB.pgp.as.format(`AND u.iso3 IN ($1:csv)`, [ countries ]))
	if (positions) platform_filters.push(DB.pgp.as.format(`AND u.position IN ($1:csv)`, [ positions ]))
	if (pinboard) platform_filters.push(DB.pgp.as.format(`AND u.uuid IN (SELECT member FROM team_members WHERE team = $1::INT)`, [ pinboard ]))

	// CONTENT FILTERS
	const content_filters = []
	if (search) content_filters.push(DB.pgp.as.format(`AND (u.name::TEXT || ' ' || u.position::TEXT ~* $1)`, [ parsers.regexQuery(search) ]))

	const filters = [ base_filters.join(' '), platform_filters.join(' '), content_filters.join(' ') ].filter(d => d)
	if (!platform_filters.length && !content_filters.length) {
		// MAKE SURE WE HAVE PAGINATION INFO
		if (!page) page = 'A'
		filters.push(DB.pgp.as.format(`AND LEFT(u.name, 1) = $1`, [ page ]))
	}

	return [ f_space, page, filters.join(' ') ]
}