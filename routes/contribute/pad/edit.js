const DB = require('../../../db-config.js')
const header_data = require('../../header/').data

exports.main = (req, res) => {
	const { object } = req.params || {}
	const { id, source } = req.query || {}

	DB.conn.tx(async t => {
		const { pagetitle, path, uuid, originalUrl, username, country, rights, lang, query, templates, participations } = await header_data({ connection: t, req: req })

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
						centerpoint: centerpoint,
						rights: rights
					}
				},

				data: data || {},

				// themes: themes,
				// sdgs: sdgs, 
				engagement: engagement || {},
				messages: messages,

				display_template: display_template,
				source: source
			}
		})
	}).then(data => res.status(200).render('pad', data))
	.catch(err => console.log(err))
}