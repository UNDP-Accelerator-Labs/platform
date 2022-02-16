const DB = require('../../../db-config.js')
const { modules } = require('../../../config.js')
const header_data = require('../../header/').data

exports.main = (req, res) => {
	const { object } = req.params || {}
	const { source } = req.query || {}

	DB.conn.tx(async t => {
		const { pagetitle, path, uuid, originalUrl, username, country, rights, lang, query, templates, participations } = await header_data({ connection: t, req: req })

		const batch = []
		batch.push(t.any(`
			SELECT co.target, c.name FROM cohorts co
			INNER JOIN contributors c
				ON c.id = co.target
			WHERE co.source IN (SELECT id FROM contributors WHERE uuid = $1)
		;`, [uuid]))
		// batch.push(t.many(`SELECT name FROM thematic_areas ORDER BY name;`)) // TO DO: API
		// batch.push(t.many(`SELECT id, key, name FROM sdgs WHERE lang = $1;`, [lang])) // TO DO: API // THIS IS IN THE FRONT END
		if (source) batch.push(t.oneOrNone(`
			SELECT title, description, sections, status, published FROM templates
			WHERE id = $1
		;`, [+source]))
		return t.batch(batch)
		.then(results => {
			const [cohort, data] = results
			if (data) { // RESET VALUES IF THE TEMPLATE IS A COPY
				data.published = false // THIS SHOULD BE DEPRECATED, BUT IS STILL USED IN THE FRONT END IN THE SAVING MECHANISM
				data.status = 0
			}

			return { 
				metadata : {
					site: {
						modules: modules
					},
					page: {
						title: pagetitle, 
						path: path,
						referrer: originalUrl,
						// id: page,
						lang: lang,
						activity: path[1],
						object: object,
						// space: space,
						query: query
					},
					menu: {
						templates: templates,
						participations: participations
					},
					user: {
						name: username,
						country: country,
						// centerpoint: centerpoint,
						rights: rights
					}
				},
				
				cohort: cohort,
				data: data
				//themes: themes, 
				//sdgs: sdgs,
			}
		})
	}).then(data => res.render('template', data))
	.catch(err => console.log(err))
}