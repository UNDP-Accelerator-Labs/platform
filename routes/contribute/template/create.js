const DB = require('../../../db-config.js')
const header_data = require('../../header/').data

exports.main = (req, res) => {
	const { object } = req.params || {}

	DB.conn.tx(async t => {
		const { pagetitle, path, uuid, originalUrl, username, country, rights, lang, query, participations } = await header_data({ connection: t, req: req })

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
					user: {
						name: username,
						country: country,
						// centerpoint: centerpoint,
						rights: rights,
						participations: participations
					}
				},
				
				cohort: cohort,
				
				//themes: themes, 
				//sdgs: sdgs,
			}
		})
	}).then(data => res.render('template', data))
	.catch(err => console.log(err))
}