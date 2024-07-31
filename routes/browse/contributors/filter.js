const { modules, DB } = include('config/')
const { parsers } = include('routes/helpers/')

module.exports = req => {
	const { uuid, rights } = req.session || {}
	let { space } = req.params || {}
	if (!space) space = Object.keys(req.query)?.length ? req.query.space : Object.keys(req.body)?.length ? req.body.space : {} // req.body?.space // THIS IS IN CASE OF POST REQUESTS (e.g. COMMING FROM APIS/ DOWNLOAD)
	const { limit } = req.body || {} // THIS IS IN THE CASE OF AJAX REQUESTS, TO LIMIT TO A CERTAIN LETTER OR NOT

	// TO DO: UPDATE BELOW BASED ON FILTERS PASSED
	let { search, status, countries, positions, rights: userrights, pinboard, page, year, month, sso_user } = Object.keys(req.query)?.length ? req.query : Object.keys(req.body)?.length ? req.body : {}

	return (async () => {
		// BASE FILTERS
		const base_filters = []
		// const f_search = search ? DB.pgp.as.format(`AND (u.name::TEXT || u.position::TEXT || cn.name::TEXT ~* $1)`, [ parsers.regexQuery(search) ]) : null
		if (status) base_filters.push(DB.pgp.as.format(`AND u.confirmed::INT IN ($1:csv)`, [ status ]))

		let f_space = null
		// THE all SPACE SHOWS ALL CONTRIBUTORS, i.e. USERS WHO ARE ALLOWED TO WRTIE PADS
		let { write } = modules.find(d => d.type === 'pads')?.rights || { write: {}}
		if (typeof write === 'object') write = Math.min(write.blank ?? Infinity, write.templated ?? Infinity)

		if (space === 'all') f_space = DB.pgp.as.format(`AND (u.rights >= $1::INT)`, [ write ?? 4 ])
		if (space === 'invited') f_space = DB.pgp.as.format(`AND (u.uuid IN (SELECT contributor FROM cohorts WHERE host = $1) OR $2 > 2)`, [ uuid, rights ])
		if (f_space) base_filters.push(f_space)
		
		// PLATFORM FILTERS
		const platform_filters = []
		if (countries) platform_filters.push(DB.pgp.as.format(`AND u.iso3 IN ($1:csv)`, [ countries ]))
		if (userrights) platform_filters.push(DB.pgp.as.format(`AND u.rights IN ($1:csv)`, [ userrights ]))
		if (positions) platform_filters.push(DB.pgp.as.format(`AND u.position IN ($1:csv)`, [ positions ]))
		if (pinboard) platform_filters.push(DB.pgp.as.format(`AND u.uuid IN (SELECT member FROM team_members WHERE team = $1::INT)`, [ pinboard ]))

		// CONTENT FILTERS
		const content_filters = []
		if (search) content_filters.push(DB.pgp.as.format(`AND (u.name::TEXT || ' ' || u.position::TEXT ~* $1)`, [ parsers.regexQuery(search) ]))
		// BELOW IS FOR AJAX CALLS WITH POST
		if (limit === null) content_filters.push(DB.pgp.as.format(`AND TRUE`))
		else if (typeof limit === 'string' && limit.length === 1) page = limit.toUpperCase()
		
		const is_sso_user = sso_user == 'true'

		if(+year && month) {
			content_filters.push(DB.pgp.as.format(`
				AND 
				(EXTRACT(YEAR FROM COALESCE(created_at, invited_at)) =$1
				AND TRIM(TO_CHAR(COALESCE(created_at, invited_at), 'Month')) ILIKE $2)
				AND created_from_sso = $3
			`, [ year, month, is_sso_user]))
		}
		else if((!year || year == 'undefined') && +month){
			content_filters.push(DB.pgp.as.format(`
				AND 
				(EXTRACT(YEAR FROM COALESCE(created_at, invited_at)) = $1
				AND created_from_sso = $2)
			`, [ month, is_sso_user ]))
		}

		const filters = [ base_filters.join(' '), platform_filters.join(' '), content_filters.join(' ') ].filter(d => d)
		if (!platform_filters.length && !content_filters.length) {
			// MAKE SURE WE HAVE PAGINATION INFO
			if (!page) page = await DB.general.one(`
				SELECT LEFT(u.name, 1) AS letter
				FROM users u
				WHERE u.uuid IN (SELECT contributor FROM cohorts WHERE host = $1)
					OR $2 > 2
				ORDER BY u.name
				LIMIT 1
			;`, [ uuid, rights ], d => d.letter)
			.catch(err => console.log(err)) || 'A'
			
			filters.push(DB.pgp.as.format(`AND LEFT(u.name, 1) = $1`, [ page ]))
		}

		return [ f_space, page, filters.join(' ') ]
	})()
}
