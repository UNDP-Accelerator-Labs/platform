const DB = require('../../../db-config.js')
const header_data = require('../../header/').data

exports.main = (req, res) => {	
	const { object } = req.params || {}
	const { template } = req.query || {}

	DB.conn.tx(async t => {
		const { pagetitle, path, uuid, originalUrl, username, country, rights, lang, query, participations } = await header_data({ connection: t, req: req })
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
						centerpoint: centerpoint,
						rights: rights,
						participations: participations
					}
				},

				// themes: themes, 
				// sdgs: sdgs, 
				engagement: {},
				
				contributors: [contributor],

				templates: templates,
				display_template: display_template
			}
		})
	}).then(data => res.render('pad', data))
	.catch(err => console.log(err))
}