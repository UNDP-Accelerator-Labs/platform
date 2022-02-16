const DB = require('../../../db-config.js')
const { modules } = require('../../../config.js')
const header_data = require('../../header/').data

exports.main = (req, res) => {
	const { object } = req.params || {}
	const { id, copy } = req.query || {}

	// TO DO: IF THIS IS A FOLLOW-UP, GET ALL THE PARTICIPANTS IN THE PREVIOUS COHORT AND DISPLAY THEM ALL SELECTED BY DEFAULT IN THE FRONT END

	DB.conn.tx(async t => {
		const { pagetitle, path, uuid, originalUrl, username, country, rights, lang, query, templates, participations } = await header_data({ connection: t, req: req })
		const batch = []
		batch.push(t.any(`
			SELECT co.target AS id, c.name, c.country, c.position FROM cohorts co
			INNER JOIN contributors c
				ON c.id = co.target
			WHERE co.source IN (SELECT id FROM contributors WHERE uuid = $1)
			ORDER BY c.country
		;`, [uuid]))		
		// GET FROM THE query WHETHER THIS IS A COPY: IF IT IS A COPY, THEN GET ONLY THE TEMPLATE FOR THE source (id IN THE QUERY)
		if (copy === 'true') {
			batch.push(t.one(`
				SELECT id FROM templates
				WHERE id IN (SELECT template FROM mobilizations WHERE id = $1)
			;`, [id]))
		} else {
			// THIS CAN BE ULTRA SIMPLIFIED BY SIMPLY LINKING THE TEMPLATE TO A BLANK TARGET IN THE FRONT END
			// BECAUSE ALL THE DATA PULLED HERE IS TO BE ABLE TO CREATE A PREVIEW WITHIN THE PAGE
			batch.push(t.any(`
				SELECT t.id, t.title, t.description, t.sections, t.status, to_char(t.date, 'DD Mon YYYY') AS date, 
					c.name AS contributorname, c.country,
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
		}
		return t.batch(batch)
		.then(results => {
			const [cohort, templates] = results
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
				templates: templates
			}
		})
	}).then(data => res.status(200).render('mobilization-new', data)) // CHANGE THE NAME TO MOBILIZATION
	.catch(err => console.log(err))
}