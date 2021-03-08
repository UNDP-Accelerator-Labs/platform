const DB = require('../config.js')
const request = require('request')
const format = require('./formatting.js')
const path = require('path')
const fs = require('fs')
const mime = require('mime')

const Jimp = require('jimp')

const { execFile } = require('child_process')

const fetch = require('node-fetch')
const Pageres = require('pageres')
const d3 = require('d3')
const turf = require('@turf/turf')

const archiver = require('archiver')


const lazyLimit = 25

if (!exports.redirect) { exports.redirect = {} }
if (!exports.render) { exports.render = {} }
if (!exports.process) { exports.process = {} }
if (!exports.public) { exports.public = {} }
if (!exports.private) { exports.private = {} }
if (!exports.dispatch) { exports.dispatch = {} }

const checklanguage = lang => ['en', 'fr', 'es', 'pt'].includes(lang) ? lang : 'en'


exports.forwardGeocoding = (req, res) => {
	const { locations, list } = req.body || {}
	DB.conn.one(`
		SELECT p.lat, p.lng FROM centerpoints cp
		INNER JOIN contributors c
			ON c.country = cp.country
		WHERE c.uuid = $1
	;`, [req.session.uuid])
	.then(centerpoint => {
		const promises = geocode(locations, centerpoint, list)
		Promise.all(promises)
		.then(data => res.json(data))
		.catch(err => {
			console.log(err)
			res.json({ status: 500, message: 'Oops! Something went wrong while searching for locations.' })
		})
	}).catch(err => console.log(err))
}
function geocode (locations, centerpoint, list = false, dir = 'forward') { // FOR NOW WE ONLY DO FORWARD GEOCODING
	console.log('pay attention to forward geocode')
	return locations.map(l => {
		return new Promise(resolve => {
			if (!l || typeof l !== 'string') {
				const obj = {}
				obj.found = false
				obj.centerpoint = centerpoint
				obj.caption = `No location was found for <strong>${l}</strong>.`
				resolve(obj)
			} else {
				setTimeout(_ => {
					l_formatted = l.removeAccents().replacePunctuation(', ').trim()
					console.log(`https://api.opencagedata.com/geocode/v1/json?q=${l_formatted}`)
					fetch(`https://api.opencagedata.com/geocode/v1/json?q=${l_formatted}&key=${process.env.OPENCAGE_API}`)
					.then(response => response.json())
					.then(data => {
						const obj = {}
						if (data.results.length) {
							if (!list) {
								const location = data.results[0] // NOTE CONFIDENCE IS SOMETHING ELSE: https://opencagedata.com/api#ranking
								obj.centerpoint = { lat: +location.geometry.lat, lng: +location.geometry.lng }
							} else {
								obj.locations = data.results
							}
							obj.found = true
							obj.caption = `<strong>${l.trim().capitalize()}</strong> found using <a href='https://opencagedata.com/credits' target='_blank'>OpenCage Geocoder</a> | &copy; <a href='https://www.openstreetmap.org/copyright' target='_blank'>OpenStreetMap contributors</a>`
						} else {
							obj.found = false
							obj.centerpoint = centerpoint
							obj.caption = `No location was found for <strong>${l.trim().capitalize()}</strong>.`
						}
						resolve(obj)
					}).catch(err => console.log(err))
				}, 1000)
			}
		})
	})
}









/* =============================================================== */
/* =========================== LOGIN ============================= */
/* =============================================================== */
exports.render.login = (req, res, next) => {
	if (req.session.uuid) next()
	else res.render('login', { title: 'Solutions mapping platform | Login', originalUrl: req.originalUrl })
}
exports.process.login = (req, res, next) => { // REROUTE
	const { username, password, originalUrl } = req.body
	if (!username || !password) res.redirect('/login')
	else { 
		DB.conn.oneOrNone(`
			SELECT name, uuid, rights, lang FROM contributors
			WHERE (name = $1 OR email = $1)
				AND password = CRYPT($2, password)
		;`, [username, password])
		.then(result => {
			if (result) {
				req.session.uuid = result.uuid
				req.session.username = result.name
				req.session.sudo = result.name === 'sudo' // THIS SHOULD BE DEPRECATED
				req.session.rights = result.rights
				if (!result.lang) req.session.lang = 'en'
				else req.session.lang = checklanguage(result.lang)

				res.redirect(originalUrl)

			} else res.redirect('/login')
		})
		.catch(err => console.log(err))
	}
}
exports.process.logout = (req, res) => {
	req.session.destroy()
	res.redirect('/')
}
exports.redirect.home = (req, res, next) => {
	const lang = checklanguage(req.params && req.params.lang ? req.params.lang : req.session.lang)
	if (req.session.uuid) {
		if (req.session.rights > 0) res.redirect(`/${lang}/browse/pads/private`)
		else res.redirect(`/${lang}/browse/pads/public`)
	} else next()
}

function navigationData (kwargs) {
	const conn = kwargs.connection ? kwargs.connection : DB.conn
	let { path, query } = kwargs.req
	path = path.substring(1).split('/')
	const { uuid, username, rights } = kwargs.req.session || {}
	let { lang } = kwargs.req.params || kwargs.req.session || {}
	lang = checklanguage(lang)

	// THIS IS PARSING THE QUERY TO SEND IT BACK TO THE CLIENT FOR PROPER DISPLAY IN FILTER MENU
	const parsedQuery = {}
	for (let key in query) {
		if (key === 'query') {
			if (query[key].trim().length) parsedQuery[key] = query[key].trim().toLowerCase().split(' or ').map(d => d.split(' ')).flat() // TO DO: CHECK THIS
		} else {
			if (!Array.isArray(query[key])) parsedQuery[key] = [query[key]]
			else parsedQuery[key] = query[key]
		}
	}

	return conn.any(`
		SELECT mob.id, mob.title, mob.template, to_char(mob.start_date, 'DD Mon YYYY') AS start_date, c.name AS host_name FROM mobilization_contributors mc
		INNER JOIN mobilizations mob
			ON mc.mobilization = mob.id
		INNER JOIN contributors c
			ON mob.host = c.id
		WHERE mc.contributor = (SELECT id FROM contributors WHERE uuid = $1)
	;`, [uuid])
	.then(results => {
		return { path: path, uuid: uuid, username: username, rights: rights, lang: lang, query: parsedQuery, participations: results }
	}).catch(err => console.log(err))
}
/* =============================================================== */
/* =========================== BROWSE ============================ */
/* =============================================================== */
exports.dispatch.browse = async (req, res) => {
	const { path, xhr, query } = req
	const { page } = query || {}

	let { object } = req.params || {}
	if (!xhr) {
		if (object === 'pads') galleryPads(req, res)
		if (object === 'templates') galleryTemplates(req, res)
	} else { // AJAX CALL
		let data 
		if (object === 'pads') data = await lazyLoadPads({ req: req })
		if (object === 'templates') data = await lazyLoadTemplates({ req: req })
		res.status(200).json(data)
	}
}
/* ============================ PADS ============================= */
function parsePadFilters (req) {
	const { uuid, rights, restricted, restrictedTemplate } = req.session || {}
	const { space } = req.params
	let { query, sdgs, thematic_areas, mappers, templates, mobilizations, page } = req.query && Object.keys(req.query).length ? req.query : req.body && Object.keys(req.body).length ? req.body : {}
	const sudo = rights > 2

	// CONVERT EVERYTHING TO ARRAYS
	if (sdgs && !Array.isArray(sdgs)) sdgs = [sdgs]
	if (mappers && !Array.isArray(mappers)) mappers = [mappers]
	if (templates && !Array.isArray(templates)) templates = [templates]
	if (mobilizations && !Array.isArray(mobilizations)) mobilizations = [mobilizations]
	// MAKE SURE WE HAVE PAGINATION INFO
	if (!page) page = 1
	else page = +page

	const 	q_parsed 			= query 				? query.trim().toLowerCase().split(' or ').map(d => d.split(' ')) 				: null
	
	const 	q_sdgs 				= sdgs 					? sdgs.map(d => +d) 															: null
	const 	q_thematic_areas 	= thematic_areas 		? thematic_areas 																: null
	const 	q_contributors		= mappers 				? mappers.map(d => +d) 															: null
	const 	q_templates			= templates 			? templates.map(d => +d) 														: null
	const 	q_mobilizations		= mobilizations 		? mobilizations.map(d => +d)													: null
	// FILTERS
	const 	f_search 			= q_parsed 				? DB.pgp.as.format(`AND (p.full_text ~* $1)`, [format.regexQuery(q_parsed)])	: ''
	
	const 	f_sdgs 				= q_sdgs 				? DB.pgp.as.format(`AND p.sdgs @> ANY('{$1:csv}'::jsonb[])`, [q_sdgs])			: ''
	const 	f_thematic_areas 	= q_thematic_areas 		? DB.pgp.as.format(`AND p.tags ?| ARRAY[$1:csv]`, [q_thematic_areas])			: ''
	const 	f_contributors		= q_contributors		? DB.pgp.as.format(`AND p.contributor IN ($1:csv)`, [q_contributors]) 			: ''
	const 	f_template			= q_templates 			? DB.pgp.as.format(`AND p.template IN ($1:csv)`, [q_templates])					: ''
	const 	f_mobilizations		= q_mobilizations 		? DB.pgp.as.format(`AND mob.mobilization IN ($1:csv)`, [q_mobilizations])		: ''
	// PUBLIC/ PRIVATE FILTERS
	let f_space = ''
	if (space === 'private' && !sudo) 	f_space	= DB.pgp.as.format(`AND p.contributor IN (SELECT id FROM contributors WHERE uuid = $1)`, [uuid])
	if (space === 'bookmarks') 							f_space	= DB.pgp.as.format(`AND p.id IN (SELECT pad FROM engagement_pads WHERE contributor = (SELECT id FROM contributors WHERE uuid = $1) AND type = 'bookmark')`, [uuid])
	if (space === 'fortomorrow')	 					f_space = DB.pgp.as.format(`AND (p.sdgs @> ANY('{$1:csv}'::jsonb[]) OR (p.id IN (SELECT DISTINCT pad FROM engagement_pads WHERE type = 'flag'))) AND p.status = 2`, [[11]])
	if (space === 'public')	 							f_space = DB.pgp.as.format(`AND p.status = 2`)
	// ORDER
	let 	order 				= DB.pgp.as.format(`ORDER BY p.status ASC, p.date DESC`)
	// INTERCEPT FOR TOMORROW 
	if (space === 'fortomorrow') order = DB.pgp.as.format(`ORDER BY flags DESC, length(p.full_text) DESC`)

	return [f_search, f_sdgs, f_thematic_areas, f_contributors, f_template, f_mobilizations, f_space, order, page]
}
function galleryPads (req, res) { 
	const { space } = req.params || {}
	// GET FILTERS
	const [f_search, f_sdgs, f_thematic_areas, f_contributors, f_template, f_mobilizations, f_space, order, page] = parsePadFilters(req)

	DB.conn.tx(async t => {
		const data = await lazyLoadPads({ connection: t, req: req })
		const { path, uuid, username, rights, lang, query, participations } = await navigationData({ connection: t, req: req })
		
		console.log(query)

		const batch = []
		// GET PADS COUNT BY STATUS
		batch.push(t.any(`
			SELECT COUNT (DISTINCT (p.id))::INT, p.status FROM pads p
			WHERE TRUE
				$1:raw
			GROUP BY p.status
			ORDER BY p.status
		;`, [f_space]))
		// GET PADS COUNT, ACCORDING TO FILTERS
		batch.push(t.any(`
			SELECT COUNT (DISTINCT (p.id))::INT, p.status FROM pads p
			LEFT JOIN mobilization_contributions mob
				ON p.id = mob.pad
			WHERE TRUE 
				$1:raw $2:raw $3:raw $4:raw $5:raw $6:raw $7:raw
			GROUP BY p.status
			ORDER BY p.status
		;`, [f_search, f_sdgs, f_thematic_areas, f_contributors, f_template, f_mobilizations, f_space]))
		// GET LOCATIONS, ACCORDING TO FILTERS
		batch.push(t.any(`
			SELECT p.location, p.status FROM pads p
			WHERE TRUE
				$1:raw $2:raw $3:raw $4:raw $5:raw $6:raw
		;`, [f_search, f_sdgs, f_thematic_areas, f_contributors, f_template, f_space]))
		// GET THE CENTERPOINT FOR THE MAPPER, IN CASE THERE ARE NO SOLUTIONS (THE MAPS AUTO-CENTERS ON THE LOCATION OF THE CONTRIBUTOR)
		batch.push(t.one(`
			SELECT cp.lat, cp.lng FROM centerpoints cp
			INNER JOIN contributors c
				ON c.country = cp.country
			WHERE c.uuid = $1
		;`, [uuid]))
		// GET SDGs BREAKDOWN, ACCORDING TO FILTERS
		// batch.push(t.any(`
		// 	SELECT sdg AS key, s.name, COUNT (DISTINCT (p.id, sdg))::INT, p.status FROM pads p, jsonb_array_elements(CASE jsonb_typeof(sdgs) WHEN 'array' THEN sdgs ELSE '[]' END) sdg
		// 	INNER JOIN sdgs s
		// 		ON s.key = sdg::INT
		// 	WHERE s.lang = $7 
		// 		$1:raw $2:raw $3:raw $4:raw $5:raw $6:raw 
		// 	GROUP BY (sdg, s.name, p.status)
		// 	ORDER BY sdg
		// ;`, [f_search, f_sdgs, f_thematic_areas, f_contributors, f_template, f_space, lang]))
		// // GET THEMATIC AREA BREAKDOWN
		// batch.push(t.any(`
		// 	SELECT name, COUNT (DISTINCT (p.id, name))::INT, p.status FROM pads p, jsonb_array_elements(CASE jsonb_typeof(tags) WHEN 'array' THEN tags ELSE '[]' END) name 
		// 	WHERE TRUE 
		// 		$1:raw $2:raw $3:raw $4:raw $5:raw $6:raw 
		// 	GROUP BY (name, p.status)
		// 	ORDER BY name
		// ;`, [f_search, f_sdgs, f_thematic_areas, f_contributors, f_template, f_space]))
		// GET TEMPLATE BREAKDOWN
		batch.push(t.any(`
			SELECT COUNT (DISTINCT (p.id))::INT, t.id, t.title FROM pads p 
			INNER JOIN templates t 
				ON p.template = t.id
			WHERE TRUE 
				$1:raw $2:raw $3:raw $4:raw $5:raw $6:raw 
			GROUP BY t.id
		;`, [f_search, f_sdgs, f_thematic_areas, f_contributors, f_template, f_space]))
		// GET CONTRBIUTOR BREAKDOWN
		batch.push(t.any(`
			SELECT COUNT (DISTINCT (p.id))::INT, c.name, c.id, c.uuid FROM pads p 
			INNER JOIN contributors c 
				ON p.contributor = c.id 
			WHERE TRUE
				$1:raw $2:raw $3:raw $4:raw $5:raw $6:raw  
			GROUP BY c.id
			ORDER BY c.name
		;`, [f_search, f_sdgs, f_thematic_areas, f_contributors, f_template, f_space]))
		// GET MOBILIZATIONS BREAKDOWN
		// TO DO: IF USER IS NOT HOST OF THE MBILIZATION, ONLY MAKE THIS AVAILABLE IN PUBLIC VIEW
		// (CONTRIBUTORS CAN ONLY SEE WHAT OTHERS HAVE PUBLISHED)
		if (participations.length) {
			batch.push(t.any(`
				SELECT COUNT (DISTINCT (p.id))::INT, mob.id, mob.title FROM pads p 
				INNER JOIN mobilization_contributions mc 
					ON mc.pad = p.id
				INNER JOIN mobilizations mob
					ON mob.id = mc.mobilization
				WHERE mob.id IN ($1:csv)
					$2:raw $3:raw $4:raw $5:raw $6:raw $7:raw
				GROUP BY mob.id
				ORDER BY mob.title
			;`, [participations.map(d => d.id), f_search, f_sdgs, f_thematic_areas, f_contributors, f_template, f_space]))
		} else batch.push([])

		return t.batch(batch)
		.then(results => {
			// let [totalcounts, filteredcounts, locations, centerpoint, sdgs, thematic_areas, templates, contributors, mobilizations] = results
			let [totalcounts, filteredcounts, locations, centerpoint, templates, contributors, mobilizations] = results
			
			return { 
				title: 'Browse pads', 
				
				path: path,
				user: username,
				centerpoint: JSON.stringify(centerpoint),
				rights: rights,
				participations: participations,

				stats: { total: totalcounts.sum('count'), 
					filtered: filteredcounts.sum('count'), 
					displayed: data.count,
					breakdown: filteredcounts,
					contributors: contributors.unique('id').length,
					// sdgs: sdgs.unique('key').length,
					// thematic_areas: thematic_areas.unique('name').length
				},

				pads: data.pads, // STILL NEED THIS FOR THE MAP AND PIE CHARTS. ULTIMATELY REMOVE WHEN NEW EXPLORE VIEW IS CREATED
				sections: data.sections,
				
				// locations: JSON.stringify(locations), 
				// clusters: JSON.stringify(clusters),
				
				// thematic_areas: thematic_areas, 
				// sdgs: sdgs, 
				templates: templates,
				mappers: contributors,
				mobilizations: mobilizations,

				queryparams: query,
				page: page,
				lang: lang,
				space: space,
			}
		})
	}).then(data => res.render('browse-pads', data))
	.catch(err => console.log(err))
}
function lazyLoadPads (kwargs) {
	const conn = kwargs.connection ? kwargs.connection : DB.conn
	const { uuid, rights } = kwargs.req.session || {}

	// GET FILTERS
	const [f_search, f_sdgs, f_thematic_areas, f_contributors, f_template, f_mobilizations, f_space, order, page] = parsePadFilters(kwargs.req)
 
	return conn.any(`
		SELECT p.id, p.sections, p.title, p.status, to_char(p.date, 'DD Mon YYYY') AS date, c.name AS contributorname, 
			COALESCE(ce.bookmarks, 0)::INT AS bookmarks, 
			COALESCE(ce.inspirations, 0)::INT AS inspirations, 
			COALESCE(ce.approvals, 0)::INT AS approvals, 
			COALESCE(ce.flags, 0)::INT AS flags,
			CASE WHEN p.contributor = (SELECT id FROM contributors WHERE uuid = $1)
				OR $2 > 2
					THEN TRUE
					ELSE FALSE
				END AS editable,
			CASE WHEN p.status = 2 
				AND 'bookmark' = ANY(e.types)
					THEN TRUE 
					ELSE FALSE 
				END AS bookmarked,
			CASE WHEN p.status = 2 
				AND 'inspiration' = ANY(e.types)
					THEN TRUE 
					ELSE FALSE 
				END AS inspired,
			CASE WHEN p.status = 2 
				AND 'approval' = ANY(e.types)
					THEN TRUE 
					ELSE FALSE 
				END AS approved,
			CASE WHEN p.status = 2 
				AND 'flag' = ANY(e.types)
					THEN TRUE 
					ELSE FALSE 
				END AS flagged
		FROM pads p
		INNER JOIN contributors c
			ON c.id = p.contributor
		LEFT JOIN (
			SELECT pad, contributor, array_agg(DISTINCT type) AS types FROM engagement_pads
			WHERE contributor = (SELECT id FROM contributors WHERE uuid = $1)
			GROUP BY (pad, contributor)
		) e
			ON e.pad = p.id
		LEFT JOIN (
			SELECT pad, 
				SUM (CASE WHEN type = 'bookmark' THEN 1 ELSE 0 END) AS bookmarks,
				SUM (CASE WHEN type = 'inspiration' THEN 1 ELSE 0 END) AS inspirations,
				SUM (CASE WHEN type = 'approval' THEN 1 ELSE 0 END) AS approvals,
				SUM (CASE WHEN type = 'flag' THEN 1 ELSE 0 END) AS flags
			FROM engagement_pads
			GROUP BY (pad)
		) ce
			ON ce.pad = p.id
		LEFT JOIN mobilization_contributions mob
			ON mob.pad = p.id
		WHERE TRUE 
			$3:raw $4:raw $5:raw $6:raw $7:raw $8:raw $9:raw
		$10:raw
		LIMIT $11 OFFSET $12
	;`, [uuid, rights, f_search, f_sdgs, f_thematic_areas, f_contributors, f_template, f_mobilizations, f_space, order, lazyLimit, (page - 1) * lazyLimit])
	.then(results => {
		return { 
			pads: results,
			count: (page - 1) * lazyLimit, 
			sections: [
				{ status: 0, label: 'unpublished', pads: results.filter(d => d.status == 0) }, 
				{ status: 1, label: 'publishable', pads: results.filter(d => d.status == 1) }, 
				{ status: 2, label: 'published', pads: results.filter(d => d.status == 2) }
			]
		}
	}).catch(err => console.log(err))
}
/* ========================= TEMPLATES =========================== */
function parseTemplateFilters (req) {
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
function galleryTemplates (req, res) {
	const { space } = req.params || {}

	// GET FILTERS
	const [f_search, f_contributors, f_mobilizations, f_space, order, page] = parseTemplateFilters(req)

	DB.conn.tx(async t => {
		const data = await lazyLoadTemplates({ connection: t, req: req })
		const { path, uuid, username, rights, lang, query, participations } = await navigationData({ connection: t, req: req })
	
		const batch = []
		
		// GET TEMPLATES COUNT BY STATUS
		batch.push(t.any(`
			SELECT COUNT(DISTINCT (t.id))::INT, t.status FROM templates t
			WHERE TRUE
				$1:raw
			GROUP BY t.status
			ORDER BY t.status
		;`, [f_space]))
		// GET TEMPLATES COUNT, ACCORDING TO FILTERS
		// TO DO: ADD FILTER FOR MOBILIZATION
		batch.push(t.any(`
			SELECT COUNT(DISTINCT (t.id))::INT, t.status FROM templates t
			LEFT JOIN mobilizations mob
				ON t.id = mob.template
			WHERE TRUE
				$1:raw $2:raw $3:raw $4:raw
			GROUP BY t.status
			ORDER BY t.status
		;`, [f_search, f_contributors, f_mobilizations, f_space]))
		// GET CONTRBIUTOR BREAKDOWN
		batch.push(t.any(`
			SELECT COUNT(DISTINCT (t.id))::INT, c.name, c.id, c.uuid FROM templates t 
			INNER JOIN contributors c 
				ON t.contributor = c.id 
			WHERE TRUE
				$1:raw $2:raw $3:raw 
			GROUP BY c.id
			ORDER BY c.name
		;`, [f_search, f_contributors, f_space]))
		// GET MOBILIZATIONS BREAKDOWN
		if (participations.length) {
			batch.push(t.any(`
				SELECT COUNT(DISTINCT (t.id))::INT, mob.id, mob.title FROM templates t 
				INNER JOIN mobilizations mob
					ON mob.template = t.id
				WHERE mob.id IN ($1:csv)
					$2:raw $3:raw $4:raw
				GROUP BY mob.id
				ORDER BY mob.title
			;`, [participations.map(d => d.id), f_search, f_contributors, f_space]))
		} else batch.push([])

		return t.batch(batch)
		.then(results => {
			let [totalcounts, filteredcounts, contributors, mobilizations] = results

			return {
				title: 'Solutions mapping | Browse | Templates',

				path: path,
				user: username,
				rights: rights,
				participations: participations,
				
				stats: { total: totalcounts.sum('count'), 
					filtered: filteredcounts.sum('count'), 
					displayed: data.count,
					breakdown: filteredcounts
				},
				
				sections: data.sections,
				
				mappers: contributors,
				mobilizations: mobilizations,
				
				queryparams: query,
				page: page,
				lang: lang,
				space: space
			}
		})
	}).then(data => res.render('browse-templates', data))
	.catch(err => console.log(err))
}
function lazyLoadTemplates (kwargs) {
	const conn = kwargs.connection ? kwargs.connection : DB.conn
	const { uuid, rights } = kwargs.req.session || {}

	// GET FILTERS
	const [f_search, f_contributors, f_mobilizations, f_space, order, page] = parseTemplateFilters(kwargs.req)
	
	return conn.any(`
		SELECT t.id, t.title, t.description, t.sections, t.status, to_char(t.date, 'DD Mon YYYY') AS date, c.name AS contributorname, 
			COALESCE(ce.bookmarks, 0)::INT AS bookmarks, 
			COALESCE(ce.applications, 0)::INT AS applications,
			CASE WHEN t.contributor = (SELECT id FROM contributors WHERE uuid = $1)
				OR $2 > 2
					THEN TRUE
					ELSE FALSE
				END AS editable,
			CASE WHEN t.status = 2 
				AND 'bookmark' = ANY(e.types)
					THEN TRUE 
					ELSE FALSE 
				END AS bookmarked,
			CASE WHEN t.status = 2 
				AND 'application' = ANY(e.types)
					THEN TRUE 
					ELSE FALSE 
				END AS applied
		FROM templates t
		INNER JOIN contributors c
			ON c.id = t.contributor
		LEFT JOIN (
			SELECT template, contributor, array_agg(DISTINCT type) AS types FROM engagement_templates
			WHERE contributor = (SELECT id FROM contributors WHERE uuid = $1)
			GROUP BY (template, contributor)
		) e
			ON e.template = t.id
		LEFT JOIN (
			SELECT template, 
				SUM (CASE WHEN type = 'bookmark' THEN 1 ELSE 0 END) AS bookmarks,
				SUM (CASE WHEN type = 'application' THEN 1 ELSE 0 END) AS applications
			FROM engagement_templates
			GROUP BY template
		) ce
			ON ce.template = t.id
		LEFT JOIN mobilizations mob
			ON mob.template = t.id
		WHERE TRUE 
			$3:raw $4:raw $5:raw $6:raw
		$7:raw
		LIMIT $8 OFFSET $9
		;`, [uuid, rights, f_search, f_contributors, f_mobilizations, f_space, order, lazyLimit, (page - 1) * lazyLimit])
	.then(results => {
		return { 
			count: (page - 1) * lazyLimit, 
			sections: [
				{ status: 0, label: 'unpublished', templates: results.filter(d => d.status == 0) }, 
				{ status: 1, label: 'publishable', templates: results.filter(d => d.status == 1) }, 
				{ status: 2, label: 'published', templates: results.filter(d => d.status == 2) }
			]
		}
	}).catch(err => console.log(err))
}
/* =============================================================== */
/* ========================= MOBILIZE ============================ */
/* =============================================================== */
exports.dispatch.mobilize = async (req, res) => {
	const { space } = req.params || {}

	if (space === 'new') createMobilization(req, res)
	else if (space === 'existing') {
		if (req.method === 'GET') galleryMobilizations(req, res)
		else if (req.method === 'POST') {
			const data = await lazyLoadMobilizations({ req: req })
			res.status(200).json(data)
		}
	}
}
function parseMobilizationFilters (req) { // TO DO: FINSIH ACCORDING TO FILTER OPTIONS
	const { uuid, rights, restricted, restrictedTemplate } = req.session || {}
	const { space } = req.params || {}
	
	// TO DO: UPDATE BELOW BASED ON FILTERS PASSED
	let { query, mappers, mobilizations, page } = req.query && Object.keys(req.query).length ? req.query : req.body && Object.keys(req.body).length ? req.body : {}
	// const sudo = rights > 2

	// // CONVERT EVERYTHING TO ARRAYS
	// if (mappers && !Array.isArray(mappers)) mappers = [mappers]
	// if (mobilizations && !Array.isArray(mobilizations)) mobilizations = [mobilizations]
	// MAKE SURE WE HAVE PAGINATION INFO
	if (!page) page = 1
	else page = +page

	// const 	q_parsed 			= query 				? query.trim().toLowerCase().split(' or ').map(d => d.split(' ')) 				: null
	// const 	q_contributors		= mappers 				? mappers.map(d => +d) 															: null
	// const 	q_mobilizations		= mobilizations 		? mobilizations.map(d => +d)													: null
	// // FILTERS
	// const 	f_search 			= q_parsed 				? DB.pgp.as.format(`AND (p.full_text ~* $1)`, [format.regexQuery(q_parsed)])	: ''
	// const 	f_contributors		= q_contributors		? DB.pgp.as.format(`AND p.contributor IN ($1:csv)`, [q_contributors]) 			: ''
	// const 	f_mobilizations		= q_mobilizations 		? DB.pgp.as.format(`AND mob.id IN ($1:csv)`, [q_mobilizations])		: ''
	// // PUBLIC/ PRIVATE FILTERS
	// let f_space = ''
	// if (space === 'private' && !sudo) 					f_space					= DB.pgp.as.format(`AND t.contributor IN (SELECT id FROM mappers WHERE uuid = $1)`, [uuid])
	// if (space === 'bookmarks') 							f_space		 			= DB.pgp.as.format(`AND t.id IN (SELECT pad FROM engagement_templates WHERE contributor = (SELECT id FROM mappers WHERE uuid = $1) AND type = 'bookmark')`, [uuid])
	// if (space === 'public')	 							f_space 				= DB.pgp.as.format(`AND t.status = 2`)

	// ORDER
	let 	order 				= DB.pgp.as.format(`ORDER BY t.status ASC, t.date DESC`)

	// return [f_search, f_contributors, f_mobilizations, f_space, order, page]
	return [order, page]
}
function createMobilization (req, res) {
	const { id } = req.query || {}

	DB.conn.tx(async t => {
		const { path, uuid, username, rights, lang, query, participations } = await navigationData({ connection: t, req: req })

		const batch = []
		batch.push(t.any(`
			SELECT co.target AS id, c.name, c.country, c.position FROM cohorts co
			INNER JOIN contributors c
				ON c.id = co.target
			WHERE co.source IN (SELECT id FROM contributors WHERE uuid = $1)
			ORDER BY c.country
		;`, [uuid]))
		batch.push(t.any(`
			SELECT t.id, t.title, t.description, t.sections, t.status, to_char(t.date, 'DD Mon YYYY') AS date, c.name AS contributorname, 
				COALESCE(ce.applications, 0)::INT AS applications
			FROM templates t
			INNER JOIN contributors c
				ON c.id = t.contributor
			LEFT JOIN (
				SELECT template, 
					SUM (CASE WHEN type = 'application' THEN 1 ELSE 0 END) AS applications
				FROM engagement_templates
				GROUP BY (template)
			) ce
				ON ce.template = t.id
			WHERE (t.contributor IN (SELECT id FROM contributors WHERE uuid = $1) AND t.status > 0)
				OR t.status = 2
		;`, [uuid, rights])) // TO DO: UPDATE THE WHERE STATEMENT TO public + private ARRANGEMENT
		return t.batch(batch)
		.then(results => {
			const [cohort, templates] = results
			return { 
				title: 'Solutions mapping | mobilize', 
				
				path: path,
				queryparams: query,
				user: username,
				rights: rights,
				participations: participations,
				
				cohort: cohort,
				templates: templates, 

				lang: lang
			}
		})
	}).then(data => res.status(200).render('mobilize-new', data))
	.catch(err => console.log(err))
}
function galleryMobilizations (req, res) {
	const { space } = req.params || {}
	// GET FILTERS
	const [order, page] = parseMobilizationFilters(req)

	DB.conn.tx(async t => {
		const data = await lazyLoadMobilizations({ connection: t, req: req })
		const { path, uuid, username, rights, lang, query, participations } = await navigationData({ connection: t, req: req })
	
		const batch = []
		// GET MOBILIZATIONS COUNT
		batch.push(t.any(`
			SELECT COUNT (DISTINCT (id))::INT, status FROM mobilizations
			WHERE host IN (SELECT id FROM contributors WHERE uuid = $1)
			GROUP BY status
			ORDER BY status
		;`, [uuid]))
		// GET TEMPLATES COUNT, ACCORDING TO FILTERS
		batch.push(t.any(`
			SELECT COUNT (DISTINCT (id))::INT, status FROM mobilizations
			WHERE host IN (SELECT id FROM contributors WHERE uuid = $1) 
			GROUP BY status
			ORDER BY status
		;`, [uuid])) // TO DO: UPDATE FILTER
		// ;`, [f_search, f_contributors, f_space])) // TO DO: UPDATE FILTER
		// GET CONTRBIUTOR BREAKDOWN
		// batch.push(t.any(`
		// 	SELECT COUNT(t.id), c.name, c.id, c.uuid FROM templates t 
		// 	INNER JOIN contributors c 
		// 		ON t.contributor = c.id 
		// 	WHERE TRUE
		// 		$1:raw $2:raw $3:raw 
		// 	GROUP BY c.id
		// 	ORDER BY c.name
		// ;`, [f_search, f_contributors, f_space]))

		return t.batch(batch)
		.then(results => {
			let [totalcounts, filteredcounts] = results

			return {
				title: 'Solutions mapping | Mobilize',

				path: path,
				user: username,
				rights: rights,
				participations: participations,

				stats: { total: totalcounts.sum('count'), 
					filtered: filteredcounts.sum('count'), 
					displayed: data.count,
					breakdown: filteredcounts
				},
				
				sections: data.sections,
				
				// mappers: contributors,
				
				queryparams: query,
				page: page,
				lang: lang,
				space: space
			}
		})
	}).then(data => res.render('mobilize-existing', data))
	.catch(err => console.log(err))
}
function lazyLoadMobilizations (kwargs) {
	const conn = kwargs.connection ? kwargs.connection : DB.conn
	const { uuid, rights } = kwargs.req.session || {}

	// GET FILTERS
	const [order, page] = parseMobilizationFilters(kwargs.req)
	
	return conn.any(`
		SELECT mob.id,
			mob.title, 
			mob.status, 
			to_char(mob.start_date, 'DD Mon YYYY') AS start_date, 
			to_char(mob.end_date, 'DD Mon YYYY') AS end_date, 
			c.name, 
			t.id AS template_id,
			t.title AS template_title, 
			t.description AS template_description,
			COUNT (DISTINCT(p.pad))::INT AS pads,
			COUNT (DISTINCT(mc.contributor))::INT AS contributors
		FROM mobilizations mob
		INNER JOIN contributors c
			ON mob.host = c.id
		INNER JOIN templates t
			ON mob.template = t.id
		LEFT JOIN mobilization_contributions p
			ON mob.id = p.mobilization
		LEFT JOIN mobilization_contributors mc
			ON mob.id = mc.mobilization
		WHERE c.uuid = $1
			GROUP BY (mob.id, c.name, t.id)
			ORDER BY pads DESC, start_date DESC
		LIMIT $2 OFFSET $3
	;`, [uuid, lazyLimit, (page - 1) * lazyLimit])
	.then(results => {
		return { 
			count: (page - 1) * lazyLimit, 
			sections: [
				{ status: 1, label: 'active', mobilizations: results.filter(d => d.status == 1) },
				{ status: 2, label: 'finished', mobilizations: results.filter(d => d.status == 2) }
			]
		}
	}).catch(err => console.log(err))
}

exports.process.deploy = (req, res) => {
	let { title, template, cohort } = req.body || {}
	if (title.length > 99) title = `${title.slice(0, 96)}…`
	if (!Array.isArray(cohort)) cohort = [cohort]
	const { uuid } = req.session || {}
	let { lang } = req.params || req.session || {}
	lang = checklanguage(lang)

	DB.conn.tx(t => { // INSERT THE NEW MOBILIZATION
		return t.one(`
			INSERT INTO mobilizations (title, host, template)
			SELECT $1, c.id, $2 FROM contributors c
				WHERE c.uuid = $3
			RETURNING id
		;`, [title, +template, uuid])
		.then(result => { // INSERT THE COHORT FOR THE MOBILIZATION
			const { id } = result
			const batch = cohort.map(d => {
				return t.none(`
					INSERT INTO mobilization_contributors (contributor, mobilization)
					VALUES ($1, $2)
				;`, [+d, id])
			})
			// ADD THE HOST OF THE MOBIILIZATION BY DEFAULT
			batch.push(t.none(`
				INSERT INTO mobilization_contributors (contributor, mobilization)
				SELECT id, $1 FROM contributors 
					WHERE uuid = $2
			;`, [id, uuid]))
			return t.batch(batch)
		})
	}).then(_ => res.redirect(`/${lang}/mobilize/existing`))
	.catch(err => console.log(err))
}
/* =============================================================== */
/* ============================ PADS ============================= */
/* =============================================================== */
exports.dispatch.contribute = (req, res) => {
	const { uuid, rights } = req.session || {}
	const { object } = req.params || {}
	let { lang } = req.params || req.session || {}
	lang = checklanguage(lang)

	if (rights > 0)	{
		if (object === 'pad') createPad(req, res)
		else if (object === 'import') createImport(req, res)
		else if (object === 'template') createTemplate(req, res)
	} else res.redirect(`/${lang}/browse/${object}s/public`)
}
exports.dispatch.edit = (req, res) => {
	const { id } = req.query || {}
	const { uuid, rights } = req.session || {}
	const { object } = req.params || {}
	let { lang } = req.params || req.session || {}
	lang = checklanguage(lang)

	if (id) {
		DB.conn.any(`
			SELECT uuid FROM contributors
			WHERE id = (SELECT contributor FROM $1:name WHERE id = $2) 
			AND uuid = $3
		;`, [`${object}s`, +id, uuid])
		.then(results => {
			if (results.length || rights > 2) { // CONTRIBUTOR OR SUDO RIGHTS
				if (object === 'pad') editPad(req, res)
				if (object === 'template') editTemplate(req, res)
			} else res.redirect(`/${lang}/view/${object}?id=${id}`)
		})
	} else res.redirect(`/${lang}/contribute/${object}`)
}
exports.dispatch.view = (req, res) => {
	const { id } = req.query || {}
	const { uuid, rights } = req.session || {}
	const { object } = req.params || {}
	let { lang } = req.params || req.session || {}
	lang = checklanguage(lang)

	if (id) {
		DB.conn.any(`
			SELECT uuid FROM contributors
			WHERE id = (SELECT contributor FROM $1:name WHERE id = $2) 
			AND uuid = $3
		;`, [`${object}s`, +id, uuid])
		.then(results => {
			if (results.length || rights > 2) { // CONTRIBUTOR OR SUDO RIGHTS
				res.redirect(`/${lang}/edit/${object}?id=${id}`)
			} else {
				if (object === 'pad') editPad(req, res)
				if (object === 'template') editTemplate(req, res)
			}
		})
	} else res.redirect(`/${lang}/contribute/${object}`)
}
exports.dispatch.preview = (req, res) => {
	const { id } = req.body || {}
	const { object } = req.params || {}
	let { lang } = req.params || req.session || {}
	lang = checklanguage(lang)

	if (id) {
		// if (object === 'pad') previewPad(req, res)
		if (object === 'template') previewTemplate(req, res)
	} else res.json({ message: 'no id provided' })
}


function createPad (req, res) {	
	const { template } = req.query

	DB.conn.tx(async t => {
		const { path, uuid, username, rights, lang, query, participations } = await navigationData({ connection: t, req: req })
		// FILTERS
		// INTERCEPT FOR EXERCISE
		let template_filter
		if (template) {
			template_filter = DB.pgp.as.format(`
				AND contributor IN (SELECT id FROM contributors WHERE uuid = $1) 
				OR status = 2
				OR id = $2
			`, [req.session.uuid, +template])
		} else {
			template_filter = DB.pgp.as.format(`
				AND contributor IN (SELECT id FROM contributors WHERE uuid = $1) 
				OR status = 2
			`, [req.session.uuid])
		}

		const batch = []
		// THIS IS FOR THE TEMPLATE MENU
		batch.push(t.any(`
			SELECT id, title FROM templates
			WHERE TRUE
				$1:raw
			ORDER BY status DESC, title ASC
		;`, [req.session.rights < 3 ? template_filter : '']))
		if (template) {
			batch.push(t.oneOrNone(`
				SELECT id, title, description, sections FROM templates
				WHERE id = $1
			;`, [+template]))
		} else batch.push(null)

		// batch.push(t.many(`SELECT name FROM thematic_areas ORDER BY name;`)) // TO DO: API
		// batch.push(t.many(`SELECT id, key, name FROM sdgs;`)) // TO DO: API
		batch.push(t.oneOrNone(`
			SELECT cp.lat, cp.lng FROM centerpoints cp
				INNER JOIN contributors c
					ON c.country = cp.country
			WHERE c.uuid = $1
		;`, [uuid]))
		batch.push(t.one(`
			SELECT id, name FROM contributors WHERE uuid = $1
		;`, [uuid]))

		return t.batch(batch)
		.then(results => {
			// let [templates, themes, sdgs, centerpoint, people, contributor] = results
			let [templates, display_template, centerpoint, contributor] = results

			return { 
				title: 'Pad', 

				lang: lang,
				path: path,
				queryparams: query,
				user: username,
				centerpoint: centerpoint,
				rights: rights,
				participations: participations,

				// themes: themes, 
				// sdgs: sdgs, 
				centerpoint: centerpoint,
				engagement: {},
				
				contributors: [contributor],

				templates: templates,
				display_template: display_template
			}
		})
	}).then(data => res.render('pad', data))
	.catch(err => console.log(err))
}
function editPad (req, res) {
	const { id } = req.query || {}

	DB.conn.tx(async t => {
		const { path, uuid, username, rights, lang, query, participations } = await navigationData({ connection: t, req: req })

		const batch = []
		batch.push(t.oneOrNone(`
			SELECT id, title, description, sections FROM templates
			WHERE id IN (
				SELECT template FROM pads p
				WHERE p.id = $1
			)
		;`, [+id]))
		// batch.push(t.many(`SELECT name FROM thematic_areas ORDER BY name;`)) // TO DO: API
		// batch.push(t.many(`SELECT id, key, name FROM sdgs;`)) // TO DO: API
		batch.push(t.one(`
			SELECT cp.lat, cp.lng FROM centerpoints cp
			INNER JOIN contributors c
				ON c.country = cp.country
			WHERE c.uuid = $1
		;`, [uuid]))
		batch.push(t.oneOrNone(`
			SELECT COALESCE(e.bookmarks, 0)::INT AS bookmarks, 
				COALESCE(e.inspirations, 0)::INT AS inspirations, 
				COALESCE(e.approvals, 0)::INT AS approvals, 
				COALESCE(e.flags, 0)::INT AS flags
			FROM pads p
			JOIN (
				SELECT pad,
					SUM (CASE WHEN type = 'bookmark' THEN 1 ELSE 0 END) AS bookmarks,
					SUM (CASE WHEN type = 'inspiration' THEN 1 ELSE 0 END) AS inspirations,
					SUM (CASE WHEN type = 'approval' THEN 1 ELSE 0 END) AS approvals,
					SUM (CASE WHEN type = 'flag' THEN 1 ELSE 0 END) AS flags
				FROM engagement_pads
				WHERE pad = $1
				GROUP BY (pad)
			) e
				ON e.pad = p.id
			WHERE p.status = 2
		;`, [+id]))
		batch.push(t.any(`
			SELECT e.type, e.message, e.contributor AS commentator, c.name FROM engagement_pads e
			INNER JOIN contributors c
				ON e.contributor = c.id
			WHERE e.pad = $1
			AND e.message IS NOT NULL
		;`, [+id]))
		batch.push(t.oneOrNone(`
			SELECT p.title, p.sections, p.location, p.template, p.published, p.contributor, c.name AS contributorname,
				CASE WHEN p.status = 2 
					AND 'bookmark' = ANY(e.types)
						THEN TRUE 
						ELSE FALSE 
					END AS bookmarked,
				CASE WHEN p.status = 2 
					AND 'inspiration' = ANY(e.types)
						THEN TRUE 
						ELSE FALSE 
					END AS inspired,
				CASE WHEN p.status = 2 
					AND 'approval' = ANY(e.types)
						THEN TRUE 
						ELSE FALSE 
					END AS approved,
				CASE WHEN p.status = 2 
					AND 'flag' = ANY(e.types)
						THEN TRUE 
						ELSE FALSE 
					END AS flagged
			FROM pads p
			INNER JOIN contributors c
				ON p.contributor = c.id
			LEFT JOIN (
				SELECT pad, contributor, array_agg(DISTINCT type) AS types FROM engagement_pads
				WHERE contributor = (SELECT id FROM contributors WHERE uuid = $1)
				GROUP BY (pad, contributor)
			) e
				ON e.pad = p.id
			WHERE p.id = $2
		;`, [uuid, +id]))
		return t.batch(batch)
		.then(results => {
			// const [template, themes, sdgs, centerpoint, engagement, messages, data] = results
			const [display_template, centerpoint, engagement, messages, data] = results

			return { 
				title: 'Pad', 
				
				lang: lang,
				path: path,
				queryparams: query,
				user: username,
				centerpoint: centerpoint,
				rights: rights,
				participations: participations,

				data: data || {},

				// themes: themes,
				// sdgs: sdgs, 
				engagement: engagement || {},
				messages: messages,

				display_template: display_template
			}
		})
	}).then(data => res.status(200).render('pad', data))
	.catch(err => console.log(err))
}

/* =============================================================== */
/* ========================== TEMPLATES ========================== */
/* =============================================================== */
function createTemplate (req, res) {	
	DB.conn.tx(async t => {
		const { path, uuid, username, rights, lang, query, participations } = await navigationData({ connection: t, req: req })

		const batch = []
		batch.push(t.any(`
			SELECT co.target, c.name FROM cohorts co
			INNER JOIN contributors c
				ON c.id = co.target
			WHERE co.source IN (SELECT id FROM contributors WHERE uuid = $1)
		;`, [uuid]))
		// batch.push(t.many(`SELECT name FROM thematic_areas ORDER BY name;`)) // TO DO: API
		// batch.push(t.many(`SELECT id, key, name FROM sdgs WHERE lang = $1;`, [lang])) // TO DO: API
		return t.batch(batch)
		.then(results => {
			const [cohort] = results
			// const [cohort, themes, sdgs] = results
			return { 
				title: 'Template', 
				
				cohort: cohort,

				lang: lang,
				path: path,
				queryparams: query,
				user: username,
				rights: rights,
				participations: participations
				
				//themes: themes, 
				//sdgs: sdgs,
			}
		})
	}).then(data => res.render('template', data))
	.catch(err => console.log(err))
}
function editTemplate (req, res) {
	const { id } = req.query || {}
	
	DB.conn.tx(async t => {
		const { path, uuid, username, rights, lang, query, participations } = await navigationData({ connection: t, req: req })

		const batch = []
		batch.push(t.any(`
			SELECT co.target AS id, c.name FROM cohorts co
			INNER JOIN contributors c
				ON c.id = co.target
			WHERE co.source IN (SELECT id FROM contributors WHERE uuid = $1)
			ORDER BY c.name
		;`, [uuid]))
		// batch.push(t.many(`SELECT name FROM thematic_areas ORDER BY name;`)) // TO DO: API
		// batch.push(t.many(`SELECT id, key, name FROM sdgs WHERE lang = $1;`, [lang])) // TO DO: API
		batch.push(t.oneOrNone(`
			SELECT title, description, sections, status, published FROM templates
			WHERE id = $1
		;`, [+id]))
		return t.batch(batch)
		.then(results => {
			const [cohort, data] = results
			// const [cohort, themes, sdgs, data] = results
			return { 
				title: 'Template', 
				
				cohort: cohort,

				lang: lang,
				path: path,
				queryparams: query,
				user: username,
				rights: rights,
				participations: participations,
				
				data: data || {}

				// themes: themes, 
				// sdgs: sdgs, 
			}
		})
	}).then(data => res.status(200).render('template', data))
	.catch(err => console.log(err))
}
function previewTemplate (req, res) {
	const { id } = req.body || {}
	
	DB.conn.oneOrNone(`
		SELECT title, description, sections, status, published FROM templates
		WHERE id = $1
	;`, [+id])
	.then(result => {
		res.status(200).json(result)
	}).catch(err => console.log(err))
}

/* =============================================================== */
/* ========================== IMPORT ============================= */
/* =============================================================== */
function createImport (req, res) {
	DB.conn.tx(async t => {
		const { path, uuid, username, rights, lang, query, participations } = await navigationData({ connection: t, req: req })

		const batch = []
		batch.push(t.one(`
			SELECT name, country FROM contributors 
			WHERE uuid = $1
		;`, [req.session.uuid]))
		batch.push(t.one(`
			SELECT cp.lat, cp.lng FROM centerpoints cp
			INNER JOIN contributors c
				ON c.country = cp.country
			WHERE c.uuid = $1
		;`, [req.session.uuid]))
		return t.batch(batch)
		.then(results => {
			const [user, centerpoint] = results
			return { 
				title: 'Solutions mapping | Import', 
				
				path: path,
				user: username,
				rights: rights,
				participations: participations,

				centerpoint: JSON.stringify(centerpoint),

				user: user.name,
				country: user.country,
				lang: lang
			}
		})
	}).then(data => res.render('import', data))
	.catch(err => console.log(err))
}
exports.storeImport = (req, res) => {
	// 1 CREATE AND STORE THE TEMPLATE
	// 2 CREATE AND STORE THE PADS
	let pads = req.body.pads//.slice(0, 3)
	const template = req.body.template
	template.status = 1

	if (template.title.length > 99) template.title = template.title.slice(0, 99)

	// console.log(pads)
	DB.conn.tx(t => {
		const batch = []
		batch.push(t.one(`
			SELECT cp.lat, cp.lng FROM centerpoints cp
			INNER JOIN contributors c
				ON c.country = cp.country
			WHERE c.uuid = $1
		;`, [req.session.uuid]))

		batch.push(t.one(`
			SELECT country FROM contributors WHERE uuid = $1
		`, [req.session.uuid]))
		
		batch.push(t.one(`
			WITH contributor AS (
				SELECT id FROM contributors
				WHERE uuid = $1
			)
			INSERT INTO templates (medium, title, description, sections, full_text, status, contributor)
			SELECT $2, $3, $4, $5, $6, $7, contributor.id FROM contributor
			RETURNING id
		;`, [req.session.uuid, template.medium, template.title, template.description, JSON.stringify(template.sections), template.fullTxt, template.status]))

		if (template.tags) {
			template.tags.forEach(d => {
				batch.push(t.none(`
					INSERT INTO thematic_areas (name)
					VALUES ($1)
						ON CONFLICT ON CONSTRAINT thematic_areas_name_key
						DO NOTHING
				;`, [d.toLowerCase().trim()]))
			})
		}
		return t.batch(batch)
		.then(async results => {
			const [centerpoint, country, template] = results
			
			const promises = pads.map(p => {
				return new Promise(async resolve => {
					// CHECK FOR LOCATIONS
					const item = p.meta.find(d => d.type === 'location')
					if (item && item.locations && item.locations.length) {
						// WE NEED centerpoints AND caption
						const geocoding = await Promise.all(geocode(item.locations, centerpoint))
						// console.log(geocoding)
						p.meta.find(d => d.type === 'location').centerpoints = geocoding.map(d => d.centerpoint)
						p.meta.find(d => d.type === 'location').caption = `Originally input location${item.locations.length > 1 ? 's' : ''}: <strong>${item.locations.map(l => l && typeof l === 'string' ? l.trim().capitalize() : l).join('</strong>, <strong>')}</strong>.<br/>`
						if (geocoding.filter(d => d.found).length > 1) item.caption += `Multiple locations found using <a href='https://opencagedata.com/credits' target='_blank'>OpenCage Geocoder</a> | &copy; <a href='https://www.openstreetmap.org/copyright' target='_blank'>OpenStreetMap contributors</a>`
						else if ((geocoding.filter(c => c.found).length === 1)) item.caption += geocoding.find(d => d.found).caption
						if (geocoding.filter(d => !d.found).length) {
							p.meta.find(d => d.type === 'location').caption += geocoding.filter(c => !c.found).map(d => d.caption).join(' ')
							p.meta.find(d => d.type === 'location').caption += `<br/>Defaulted to UNDP ${country.country} Country Office location.`
						}
						delete item.locations	
					}
					p.fullTxt = `${p.title}\n\n${p.sections.map(d => d.items).flat().filter(d => d.type === 'txt').map(d => d.txt).join('\n\n').trim()}\n\n${p.sections.map(d => d.items).flat().filter(d => d.type === 'checklist').map(d => d.options.filter(c => c.checked).map(c => c.name)).flat().join('\n\n').trim()}`
					p.location = p.meta.find(d => d.type === 'location')
					p.sdgs = p.meta.find(d => d.type === 'sdgs') ? p.meta.find(d => d.type === 'sdgs').sdgs : null
					if (p.sdgs && !p.sdgs.length) p.sdgs = null
					p.tags = p.meta.find(d => d.type === 'tags') ? p.meta.find(d => d.type === 'tags').tags.map(d => d.name) : null
					if (p.tags && !p.tags.length) p.tags = null
					// p.published = FALSE
					resolve(p)
				})
			})
			
			const data = await Promise.all(promises)
			return t.batch(data.map(d => {
				let status = 0
				if (d.title && d.title.trim().length
					&& d.location && d.location.centerpoints && d.location.centerpoints.length 
					&& d.sdgs && d.sdgs.length && d.sdgs.length <= 5
					&& d.tags && d.tags.length && d.tags.length <= 5
				) status = 1
				// TRUNCATE TITLE IF TOO LONG (THE DB EXPECTS 99 CHARS)
				if (d.title && d.title.length > 99) d.title = d.title.slice(0, 99)

				return t.one(`
					WITH contributor AS (
						SELECT id FROM contributors
						WHERE uuid = $1
					)
					INSERT INTO pads (title, sections, full_text, location, sdgs, tags, template, status, contributor)
					SELECT $2, $3, $4, $5, $6, $7, $8, $9, contributor.id FROM contributor
					RETURNING pads.id
				;`, [req.session.uuid, d.title, JSON.stringify(d.sections), d.fullTxt, JSON.stringify(d.location), JSON.stringify(d.sdgs), JSON.stringify(d.tags), template.id, status])
			}))
		})
	}).then(results => res.json({ pads: results.map(d => d.id) }))
	.catch(err => console.log(err))
}
/* =============================================================== */
/* ====================== SAVING MECHANISMS ====================== */
/* =============================================================== */
exports.process.upload = (req, res) => {
	const fls = req.files
	const promises = fls.map(f => {
		console.log('hello')
		console.log(f)
		return new Promise(resolve => {
			if (['image/png', 'image/jpg', 'image/jpeg', 'image/jfif', 'image/gif', 'application/octet-stream'].includes(f.mimetype)) { // octet-streram IS FOR IMAGE URLs
				const basedir = path.join(__dirname, `../public/uploads/`)
				if (!fs.existsSync(basedir)) fs.mkdirSync(basedir)

				const dir = path.join(basedir, req.session.uuid)
				if (!fs.existsSync(dir)) fs.mkdirSync(dir)
				const smdir = path.join(basedir, 'sm/')
				if (!fs.existsSync(smdir)) fs.mkdirSync(smdir)
				const targetdir = path.join(smdir, req.session.uuid)
				if (!fs.existsSync(targetdir)) fs.mkdirSync(targetdir)

				const source = path.join(__dirname, `../${f.path}`)
				const target = path.join(dir, `./${f.filename}${path.extname(f.originalname).toLowerCase()}`)
				const smtarget = path.join(targetdir, `./${f.filename}${path.extname(f.originalname).toLowerCase()}`)
				
				// CREATE THE SMALL IMAGE
				Jimp.read(source, (err, image) => {
					if (err) console.log(err)
					const w = image.bitmap.width
					const h = image.bitmap.height
					// CHECK IMAGE ORIENTATION (EXIF)
					// SEE https://www.impulseadventure.com/photo/exif-orientation.html
					if (image._exif && image._exif.tags && image._exif.tags.Orientation) {
						const o = image._exif.tags.Orientation
						if (o === 8) image.rotate(270).cover(200, 300, Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_MIDDLE).normalize().brightness(-.05)
						if (o === 6) image.rotate(90).cover(200, 300, Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_MIDDLE).normalize().brightness(-.05)
						else image.cover(300, 200, Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_MIDDLE).normalize().brightness(-.05)
					} else {
						image.cover(300, 200, Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_MIDDLE).normalize().brightness(-.05)
					}

					image.quality(60)
					image.writeAsync(smtarget)
					.then(_ => {
						fs.renameSync(source, target)
						resolve({ status: 200, src: target.split('public/')[1], originalname: f.originalname, message: 'success' })
					}).catch(err => {
						fs.copyFileSync(source, smtarget)
						fs.renameSync(source, target)
						resolve({ status: 200, src: target.split('public/')[1], originalname: f.originalname, message: 'success' })
					})
				})
			} else if (f.mimetype.includes('video/')) {
				// TO DO: CHECK SIZE HERE AND IF TOO BIG DO NOTHING (IN FRONT END TELL USER TO GO THROUGH YOUTUBE OF MSSTREAM)
				const basedir = path.join(__dirname, `../public/uploads/`)
				if (!fs.existsSync(basedir)) fs.mkdirSync(basedir)

				const dir = path.join(basedir, req.session.uuid)
				if (!fs.existsSync(dir)) fs.mkdirSync(dir)

				const source = path.join(__dirname, `../${f.path}`)
				// const target = path.join(dir, `./${f.filename}${path.extname(f.originalname).toLowerCase()}`)
				const fftarget = path.join(dir, `./ff-${f.filename}${path.extname(f.originalname).toLowerCase()}`)

				execFile('ffmpeg', [
					'-i', source,
					// '-s', '640x480',
					'-b:v', '512k',
					'-c:v', 'libx264',
					'-c:a', 'copy',
					'-vf', 'scale=854:ih*854/iw', // 854 = 480p
					fftarget
				], function(err, stdout, stderr) {
					if (err) console.log(err)

					fs.unlinkSync(source)
					resolve({ status: 200, src: fftarget.split('public/')[1], originalname: f.originalname, message: 'success' })
				})
			} else {
				fs.unlinkSync(source)
				resolve({ status: 403, message: 'wrong file format' })
			}
		})
	})
	Promise.all(promises)
	.then(results => res.json(results))
	.catch(err => {
		console.log(err)
		res.json({ status: 500, message: 'Oops! Something went wrong.' })
	})
}
exports.process.screenshot = (req, res) => {
	if (process.env.NODE_ENV !== 'production') {
		const src = req.body.src
		const target = src.simplify()

		const basedir = path.join(__dirname, `../public/uploads/`)
		if (!fs.existsSync(basedir)) fs.mkdirSync(basedir)
		
		const dir = path.join(__dirname, `../public/uploads/${req.session.uuid}`)
		if (!fs.existsSync(dir)) fs.mkdirSync(dir)
		
		if (!fs.existsSync(path.join(dir, `${target}.png`))) {
			new Pageres({ delay: 2, filename: target, format: 'png' })
				.src(src, ['1280x1024'])
				.dest(dir)
				.run()
			.then(result => res.json({ status: 200, src: path.join(dir, `${target}.png`).split('public/')[1], message: 'success' }))
			.catch(err => {
				console.log(err)
				res.json({ status: 500, message: 'Oops! Something went wrong.' })
			})
		} else {
			res.json({ status: 200, src: path.join(dir, `${target}.png`).split('public/')[1], message: 'image already exists' })
		}
	}
	else res.json({ status: 200, src: null, message: 'cannot load image in production mode' })
}


// THIS IS THE NEW SAVING MECHANISM
exports.process.save = (req, res) => { // TO DO: SAVE PAD TO MOBILIZATION IF RELEVANT
	// CHECK THE PAD EXISTS
	const { uuid } = req.session || {}
	const { object } = req.params || {}
	const { tags, deletion, id, mobilization } = req.body || {}
	let saveSQL

	if (!id) { // INSERT OBJECT
		// INSPIRED BY https://stackoverflow.com/questions/38750705/filter-object-properties-by-key-in-es6
		const insert = Object.keys(req.body)
			.filter(key => !['id', 'deletion', 'mobilization'].includes(key))
			.reduce((obj, key) => {
				obj[key] = req.body[key]
				return obj
			}, {})
		saveSQL = DB.pgp.as.format(`
			INSERT INTO $1:name ($2:name, contributor) 
			SELECT $2:csv, c.id FROM contributors c
			WHERE c.uuid = $3
			RETURNING $1:name.id
		;`, [`${object}s`, insert, uuid])
	} else { // UPDATE OBJECT
		const condition = DB.pgp.as.format(` WHERE id = $1;`, [id])
		saveSQL = DB.pgp.helpers.update(req.body, Object.keys(req.body).filter(d => !['id', 'deletion', 'mobilization'].includes(d)), `${object}s`) + condition
	}	

	DB.conn.tx(t => { // TO DO: CLEAN THIS UP: NO NEED FOR THE batch
		const batch = []
		batch.push(t.oneOrNone(saveSQL))
		
		return t.batch(batch)
		.then(results => {
			const newObject = results[results.length - 1]
			if (mobilization && newObject) {
				batch.push(t.none(`
					INSERT INTO mobilization_contributions (pad, mobilization)
					VALUES ($1, $2)
				;`, [newObject.id, mobilization]))
			}
			return results
		})
	}).then(results => {
		const newObject = results[results.length - 1]
		if (deletion) {
			const promises = deletion.map(f => {
				if (fs.existsSync(path.join(__dirname, `../public/${f}`))) {
					return new Promise(resolve => {
						resolve(fs.unlinkSync(path.join(__dirname, `../public/${f}`)))
					})
				}
			})
			Promise.all(promises).then(_ => res.json({ status: 200, message: 'Successfully saved.', object: newObject ? newObject.id : null }))
		} else res.json({ status: 200, message: 'Successfully saved.', object: newObject ? newObject.id : null })
	}).catch(err => console.log(err))
}
exports.process.publish = (req, res) => {
	const { referer } = req.headers || {}
	const { id } = req.query || {}
	const { uuid, rights } = req.session || {}
	const { lang, activity, object } = req.params || {}
	
	let saveSQL
	if (id) {
		saveSQL = DB.pgp.as.format(`
			UPDATE $1:name
			SET status = 2,
				published = TRUE
			WHERE id = $2
				AND status = 1
				AND (contributor = (SELECT id FROM contributors WHERE uuid = $3)
					OR $4 > 2)
		;`, [object, +id, uuid, rights])
	} else { // PUBLISH ALL
		saveSQL = DB.pgp.as.format(`
			UPDATE $1:name
			SET status = 2,
				published = TRUE
			WHERE status = 1
				AND (contributor = (SELECT id FROM contributors WHERE uuid = $2)
					OR $3 > 2)
		;`, [object, uuid, rights])
	}
	// EXECUTE SQL
	DB.conn.none(saveSQL)
	.then(_ => res.redirect(referer))
	.catch(err => console.log(err))
}
exports.process.delete = (req, res) => {	
	const { referer } = req.headers || {}
	let { id } = req.query || {}
	const { uuid, rights } = req.session || {}
	const { object } = req.params || {}
	// CONVERT id TO ARRAY
	if (!Array.isArray(id)) id = [id]
	id = id.map(d => +d)
	
	if (!id.length) res.redirect(referer)
	else {
		if (object === 'pads') {
			DB.conn.none(`
				DELETE FROM pads
				WHERE id IN ($1:csv)
					AND (contributor = (SELECT id FROM contributors WHERE uuid = $2)
						OR $3 > 2)
			;`, [id, uuid, rights])
			.then(_ => res.redirect(referer))
			.catch(err => console.log(err))
		}
		else if (object === 'templates') {
			DB.conn.none(`
				DELETE FROM templates
				WHERE id IN ($1:csv)
					AND (contributor = (SELECT id FROM contributors WHERE uuid = $2)
						OR $3 > 2)
			;`, [id, uuid, rights])
			.then(_ => res.redirect(referer))
			.catch(err => console.log(err))
		}
	}
}
exports.process.download = (req, res) => {
	const { uuid } = req.session || {}
	const { format } = req.params || {}
	const { source } = req.body || {}

	let saveSQL
	if (source === 'bookmarks') { // DOWNLOAD MULTIPLE PADS
		saveSQL = DB.pgp.as.format(`
			SELECT p.id, p.title, p.sections, c.name AS contributor, p.date, p.full_text, p.location, p.sdgs, p.tags FROM pads p
			INNER JOIN contributors c
				ON p.contributor = c.id
			WHERE p.id IN (
				SELECT pad FROM engagement_pads 
				WHERE contributor = (SELECT id FROM contributors WHERE uuid = $1) 
					AND type = 'bookmark'
			)
		;`, [uuid])
	} else { // DOWNLOAD SINGLE PAD
		saveSQL = DB.pgp.as.format(`
			SELECT p.id, p.title, p.sections, c.name AS contributor, p.date, p.full_text, p.location, p.sdgs, p.tags FROM pads p
			INNER JOIN contributors c
				ON p.contributor = c.id
			WHERE p.id = $1
		;`, [source])
	}

	DB.conn.any(saveSQL).then(async results => {
		if (format === 'raw') {
			function getImg (d) {
				if (d && d.sections) {
					const img = d.sections.map(d => d.items).flat().filter(c => c.type === 'img' && c.src)
					const mosaic = d.sections.map(d => d.items).flat().filter(c => c.type === 'mosaic' && c.srcs)
					const embed = d.sections.map(d => d.items).flat().filter(c => c.type === 'embed' && c.src)
					if (img.length) return img.map(c => c.src)
					else if (mosaic.length) return mosaic.map(c => c.srcs).flat()
					else if (embed.length) return embed.map(c => c.src)
					else return [null]
				} else return [null]
			}

			results.forEach(d => d.imgs = getImg(d).flat())
			const imgs = results.map(d => d.imgs).flat()
			const max_imgs = results.sort((a, b) => b.imgs.length - a.imgs.length)[0].imgs.length

			const columns = [
				'id', 
				'title', 
				'contributor', 
				'contribution_date', 
				'full_text', 
				'location_JSON', 
				new Array(5).fill(null).map((d, i) => `SDG_tag_${i + 1}`),
				new Array(5).fill(null).map((d, i) => `thematic_area_tag_${i + 1}`),
				new Array(max_imgs).fill(null).map((d, i) => `image_${i + 1}`)
			].flat()

			let csv = `${columns.join('\t')}`
			results.forEach(d => {
				const imgIdx = getImg(d).map(c => `file: img-${imgs.flat().indexOf(c) + 1}`)

				csv += `\n${[
					d.id, 
					d.title, 
					d.contributor, 
					d.date, 
					`"${d.full_text.replace(/"/g, '""')}"`, 
					JSON.stringify(d.location.centerpoints || d.location.centerpoint), 
					new Array(5).fill(null).map((c, i) => d.sdgs[i] ? d.sdgs[i].toString() : ''), 
					new Array(5).fill(null).map((c, i) => d.tags[i] ? d.tags[i].toString() : ''),
					new Array(max_imgs).fill(null).map((c, i) => imgIdx[i] ? imgIdx[i].toString() : '')
				].flat().join('\t')}`
			})

			await fs.writeFileSync(path.join(__dirname, '../tmp/solutions_data.tsv'), csv, 'utf8')		
			// CODE FROM https://github.com/archiverjs/node-archiver
			const zippath = path.join(__dirname, '../tmp/grassroots_solutions.zip')
			const output = fs.createWriteStream(zippath)
			const archive = archiver('zip', {
				zlib: { level: 9 } // Sets the compression level. 6 is default, 9 is high compression
			})
			output.on('close', function() {
				res.download(path.join(__dirname, '../tmp/grassroots_solutions.zip'), 'grassroots_solutions.zip', err => {
					if (err) console.log(err)
					fs.unlinkSync(path.join(__dirname, '../tmp/solutions_data.tsv'))
					fs.unlinkSync(path.join(__dirname, '../tmp/grassroots_solutions.zip'))
				})
			})
			archive.on('warning', function(err) {
				if (err.code === 'ENOENT') {
					console.log('archive warning')
					console.log(err)
				} else {
					console.log('archive error')
					console.log(err)
				}
			})
			archive.on('error', err => console.log(err))
			
			archive.pipe(output)
			archive.file(path.join(__dirname, '../tmp/solutions_data.tsv'), { name: 'solutions_data.tsv' })
			
			imgs.forEach((d, i) => {
				const file = path.join(__dirname, `../public/${d}`)
				archive.file(file, { name: `img-${i + 1}${path.extname(file)}` })
			})
			archive.finalize()
		}
	})
}

exports.process.engage = (req, res) => {
	const { uuid } = req.session || {}
	const { pad, active, type, message } = req.body || {}

	let saveSQL
	if (active) { // INSERT
		saveSQL = DB.pgp.as.format(`
			INSERT INTO engagement_pads (contributor, pad, type, message) 
			SELECT id, $1, $2, $3 FROM contributors WHERE uuid = $4
			RETURNING TRUE
		;`, [+pad, type, message, uuid])
	} else { // DELETE
		saveSQL = DB.pgp.as.format(`
			DELETE FROM engagement_pads
			WHERE pad = $1
				AND type = $2
				AND contributor = (SELECT id FROM contributors WHERE uuid = $3)
			RETURNING FALSE
		;`, [+pad, type, uuid])
	}

	DB.conn.one(t => saveSQL)
	.then(result => {
		res.json(result)
	}).catch(err => console.log(err))
}
exports.process.validate = (req, res) => {
	const { uuid } = req.session || {}
	const { pad, active, type, message, path } = req.body || {}

	DB.conn.none(`
		INSERT INTO engagement_pads (contributor, pad, type, message) 
		SELECT id, $1, $2, $3 FROM contributors WHERE uuid = $4
	;`, [+pad, type, message, uuid])
	.then(result => {
		res.redirect(path)
	}).catch(err => console.log(err))
}

// THIS WILL BE DEPRECATED
// exports.unpublish = (req, res) => {
// 	const ids = req.body.ids
// 	const type = req.body.type

// 	DB.conn.none(`
// 		UPDATE $1:raw
// 		SET status = 1,
// 			published = FALSE
// 		WHERE id IN ($2:csv)
// 	;`, [type, ids])
// 	.then(_ => res.json({ status: 200, message: `all ${type} were unpublished` }))
// 	.catch(err => console.log(err))
// }


exports.notfound = (req, res) => {
	res.send('This is not the route that you are looking for')
}


Array.prototype.min = function (key) {
	if (key) return this.sort((a, b) => a[key] - b[key])[0]
	return this.sort((a, b) => a - b)[0]
}
Array.prototype.chunk = function(size) {
	const groups = []
	for (let i = 0; i < this.length; i += size) {
		groups.push(this.slice(i, i + size))
	}
	return groups
}
Array.prototype.unique = function (key, onkey) {
	const arr = []
	this.forEach(d => {
		if (!key) {
			if (arr.indexOf(d) === -1) arr.push(d)
		}
		else {
			if (onkey) { if (arr.map(c => c).indexOf(d[key]) === -1) arr.push(d[key]) }
			else { if (arr.map(c => c[key]).indexOf(d[key]) === -1) arr.push(d) }
		}
	})
	return arr
}
Array.prototype.nest = function (key) {
	const arr = []
	this.forEach(d => {
		const groupby = typeof key === 'function' ? key(d) : d[key]
		if (!arr.find(c => c.key === groupby)) arr.push({ key: groupby, values: [d] })
		else arr.find(c => c.key === groupby).values.push(d)
	})
	return arr
}
Array.prototype.intersection = function (V2) {
	const intersection = []
	this.sort()
	V2.sort()
	for (let i = 0; i < this.length; i += 1) {
		if(V2.indexOf(this[i]) !== -1){
			intersection.push(this[i])
		}
	}
	return intersection
}
Array.prototype.sum = function (key) {
	if (this.length === 0) return 0
	if (!key) return this.reduce((accumulator, value) => +accumulator + +value)
	else {
		return this.reduce((accumulator, value) => {
			const obj = {}
			obj[key] = +accumulator[key] + +value[key]
			return obj
		})[key]
	}
}
String.prototype.simplify = function () {
	return this.valueOf().replace(/[^\w\s]/gi, '').replace(/\s/g, '').toLowerCase()
}
String.prototype.capitalize = function () {
	return this.valueOf().charAt(0).toUpperCase() + this.valueOf().slice(1)
}
String.prototype.removeAccents = function () {
	// CREDIT TO https://stackoverflow.com/questions/990904/remove-accents-diacritics-in-a-string-in-javascript
	return this.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}
String.prototype.replacePunctuation = function (replacement) {
	return this.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, replacement).replace(/\s{2,}/g, ' ') // THIS KEEPS COMMAS
}
Date.prototype.displayDMY = function () {
	const M = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
	const Ms = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
	const d = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
	const h = this.getHours() < 10 ? `0${this.getHours()}` : this.getHours()
	const m = this.getMinutes() < 10 ? `0${this.getMinutes()}` : this.getMinutes()
	return `${this.getDate()} ${Ms[this.getMonth()]}, ${this.getFullYear()}`
}


// Promise.all(geocode(['Livno, Bosnia and Herzegovina', 'Sarajevo, Bosnia and Herzegovina'], 'centerpoint'))
// .then(data => console.log(data))
// .catch(err => console.log(err))