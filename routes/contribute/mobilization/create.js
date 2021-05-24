const DB = require('../../../db-config.js')
const header_data = require('../../header/').data

exports.main = (req, res) => {
	const { id } = req.query || {}

	DB.conn.tx(async t => {
		const { pagetitle, path, uuid, username, country, rights, lang, query, participations } = await header_data({ connection: t, req: req })

		const batch = []
		batch.push(t.any(`
			SELECT co.target AS id, c.name, c.country, c.position FROM cohorts co
			INNER JOIN contributors c
				ON c.id = co.target
			WHERE co.source IN (SELECT id FROM contributors WHERE uuid = $1)
			ORDER BY c.country
		;`, [uuid]))
		batch.push(t.any(`
			SELECT t.id, t.title, t.description, t.sections, t.status, to_char(t.date, 'DD Mon YYYY') AS date, c.name AS contributorname, c.country,
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
				title: pagetitle, 
				
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