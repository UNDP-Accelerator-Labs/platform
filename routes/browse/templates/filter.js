const DB = require('../../../db-config.js')

exports.main = req => {
	const { uuid, rights, restricted, restrictedTemplate } = req.session || {}
	const { space } = req.params
	
	let { query, mappers, mobilizations, page } = req.query && Object.keys(req.query).length ? req.query : req.body && Object.keys(req.body).length ? req.body : {}
	const sudo = rights > 2

	// CONVERT EVERYTHING TO ARRAYS
	if (mappers && !Array.isArray(mappers)) mappers = [mappers]
	if (mobilizations && !Array.isArray(mobilizations)) mobilizations = [mobilizations]
	// MAKE SURE WE HAVE PAGINATION INFO
	if (!page) page = 1
	else page = +page

	const 	q_parsed 			= query 				? query.trim().toLowerCase().split(' or ').map(d => d.split(' ')) 				: null
	const 	q_contributors		= mappers 				? mappers.map(d => +d) 															: null
	const 	q_mobilizations		= mobilizations 		? mobilizations.map(d => +d)													: null
	// FILTERS
	const 	f_search 			= q_parsed 				? DB.pgp.as.format(`AND (t.full_text ~* $1)`, [format.regexQuery(q_parsed)])	: ''
	const 	f_contributors		= q_contributors		? DB.pgp.as.format(`AND t.contributor IN ($1:csv)`, [q_contributors]) 			: ''
	const 	f_mobilizations		= q_mobilizations 		? DB.pgp.as.format(`AND mob.id IN ($1:csv)`, [q_mobilizations])		: ''
	// PUBLIC/ PRIVATE FILTERS
	let f_space = ''
	if (space === 'private' && !sudo) 					f_space					= DB.pgp.as.format(`AND t.contributor IN (SELECT id FROM contributors WHERE uuid = $1)`, [uuid])
	if (space === 'bookmarks') 							f_space		 			= DB.pgp.as.format(`AND t.id IN (SELECT pad FROM engagement_templates WHERE contributor = (SELECT id FROM contributors WHERE uuid = $1) AND type = 'bookmark')`, [uuid])
	if (space === 'public')	 							f_space 				= DB.pgp.as.format(`AND t.status = 2`)
	// ORDER
	let 	order 				= DB.pgp.as.format(`ORDER BY t.status ASC, t.date DESC`)

	return [f_search, f_contributors, f_mobilizations, f_space, order, page]
}