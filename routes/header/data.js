const config = require('../../config.js')
const DB = require('../../db-config.js')
const language = require('./language').main

exports.main = (kwargs) => {
	const conn = kwargs.connection ? kwargs.connection : DB.conn
	let { path, query, headers } = kwargs.req || {}
	path = path.substring(1).split('/')
	const { uuid, username, country, rights } = kwargs.req.session || {}
	let { lang } = kwargs.req.params || kwargs.req.session || {}
	lang = language(lang)

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
		SELECT mob.id, mob.title, mob.template, 
			to_char(mob.start_date, 'DD Mon YYYY') AS start_date, 
			c.name AS host_name 
		FROM mobilization_contributors mc
		INNER JOIN mobilizations mob
			ON mc.mobilization = mob.id
		INNER JOIN contributors c
			ON mob.host = c.id
		WHERE mc.contributor = (SELECT id FROM contributors WHERE uuid = $1)
			AND mob.status = 1
	;`, [uuid])
	.then(results => {
		return { pagetitle: config.title, path: path, originalUrl: headers.referer, uuid: uuid, username: username, country: country, rights: rights, lang: lang, query: parsedQuery, participations: results }
	}).catch(err => console.log(err))
}