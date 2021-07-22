const DB = require('../../../db-config.js')
const header_data = require('../../header/').data

exports.main = (req, res) => {
	const { object } = req.params || {}
	const { id } = req.query || {}
	
	DB.conn.tx(async t => {
		const { pagetitle, path, uuid, originalUrl, username, country, rights, lang, query, templates, participations } = await header_data({ connection: t, req: req })

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
				metadata : {
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

				data: data || {}

				// themes: themes, 
				// sdgs: sdgs, 
			}
		})
	}).then(data => res.status(200).render('template', data))
	.catch(err => console.log(err))
}