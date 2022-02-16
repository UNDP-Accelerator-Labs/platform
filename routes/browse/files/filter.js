const DB = require('../../../db-config.js')
const format = require('../../formatting.js')

exports.main = req => {
	const { uuid, country, rights } = req.session || {}
	const { space } = req.params || {}
	let { pads, search, contributors, countries, templates, mobilizations, methods, datasources, sdgs, thematic_areas, page } = req.query || {} //&& Object.keys(req.query).length ? req.query : req.body && Object.keys(req.body).length ? req.body : {}
	const sudo = rights > 2
	
	// MAKE SURE WE HAVE PAGINATION INFO
	if (!page) page = 1
	else page = +page
	
	// FILTERS
	const f_pads = pads ? DB.pgp.as.format(`f.id IN ($1:csv)`, [pads]) : null

	// SEARCH IS ONLY AVAILABLE FOR PAD-BASED FILES (pdf) IN files BECAUSE THERE IS NO full_text REPRESENTATION
	// THIS WOULD REQUIRE PARSING THE pdf IN A PYTHON CHILD PROCESS UPON UPLOAD
	const f_search = search ? DB.pgp.as.format(`(f.full_text ~* $1)`, [format.regexQuery(search.trim().toLowerCase().split(' or ').map(d => d.split(' ')))]) : null
	
	const f_contributors = contributors ? DB.pgp.as.format(`f.contributor IN ($1:csv)`, [contributors]) : null
	const f_countries = countries ? DB.pgp.as.format(`f.contributor IN (SELECT c.id FROM contributors c INNER JOIN centerpoints cp ON c.country = cp.country WHERE cp.id IN ($1:csv))`, [countries]) : null
	const f_templates = templates ? DB.pgp.as.format(`p.template IN ($1:csv)`, [templates]) : null
	const f_mobilizations = mobilizations ? DB.pgp.as.format(`mob.mobilization IN ($1:csv)`, [mobilizations]) : null

	// THESE ARE DEACTIVATED FOR NOW
	// TO DO: ADD A TAGGING MECANISM FOR FILES
	// const f_methods = methods ? DB.pgp.as.format(`f.id IN (SELECT pad FROM tagging WHERE type = 'skills' AND tag_id IN ($1:csv))`, [methods]) : null
	// const f_datasources = datasources ? DB.pgp.as.format(`f.id IN (SELECT pad FROM tagging WHERE type = 'datasources' AND tag_id IN ($1:csv))`, [datasources]) : null
	// const f_thematic_areas = thematic_areas ? DB.pgp.as.format(`f.id IN (SELECT pad FROM tagging WHERE type = 'tags' AND tag_id IN ($1:csv))`, [thematic_areas]) : null
	// const f_sdgs = sdgs ? DB.pgp.as.format(`f.id IN (SELECT pad FROM tagging WHERE type = 'sdgs' AND tag_id IN ($1:csv))`, [sdgs]) : null
	
	// PUBLIC/ PRIVATE FILTERS
	let f_space = ''
	if (space === 'private' && !sudo) 	f_space	= DB.pgp.as.format(`AND f.contributor IN (SELECT id FROM contributors WHERE country = $1)`, [country])
	if (space === 'bookmarks') 			f_space	= DB.pgp.as.format(`AND f.id IN (SELECT pad FROM engagement_pads WHERE contributor = (SELECT id FROM contributors WHERE uuid = $1) AND type = 'bookmark')`, [uuid])
	if (space === 'public')	 			f_space = DB.pgp.as.format(`AND f.status = 2`)
	// ORDER
	// let 	order = DB.pgp.as.format(`ORDER BY p.status ASC, p.date DESC`)
	let order = DB.pgp.as.format(`ORDER BY f.date DESC`)

	// ADDITIONAL FILTER FOR SETTING UP THE "LINKED PADS" DISPLAY
	const f_sources = DB.pgp.as.format(`AND f.source IS NULL`)

	const platform_filters = [f_contributors, f_countries, f_templates, f_mobilizations].filter(d => d).join(' OR ')
	const content_filters = '' //[f_methods, f_datasources, f_thematic_areas, f_sdgs].filter(d => d).join(' OR ')
	const display_filters = []

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

	return [ f_space, order, page, filters ]
}