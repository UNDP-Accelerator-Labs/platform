const DB = require('../../../db-config.js')
const { page_content_limit } = require('../../../config.js')
const filter = require('./filter').main

exports.main = kwargs => {
	const conn = kwargs.connection ? kwargs.connection : DB.conn
	const { uuid, rights } = kwargs.req.session || {}

	// GET FILTERS
	const [f_search, f_contributors, f_mobilizations, f_space, order, page] = filter(kwargs.req)
	
	return conn.any(`
		SELECT t.id, t.title, t.description, t.sections, t.status, to_char(t.date, 'DD Mon YYYY') AS date, c.name AS contributorname, 
			COUNT(p.id)::INT AS associated_pads,
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
		LEFT JOIN pads p
			ON t.id = p.template
		LEFT JOIN (
			SELECT template, contributor, array_agg(DISTINCT type) AS types FROM engagement_templates
			WHERE contributor = (SELECT id FROM contributors WHERE uuid = $1)
			GROUP BY (template, contributor)
		) e
			ON t.id = e.template
		LEFT JOIN (
			SELECT template, 
				SUM (CASE WHEN type = 'bookmark' THEN 1 ELSE 0 END) AS bookmarks,
				SUM (CASE WHEN type = 'application' THEN 1 ELSE 0 END) AS applications
			FROM engagement_templates
			GROUP BY template
		) ce
			ON t.id = ce.template
		LEFT JOIN mobilizations mob
			ON t.id = mob.template
		WHERE TRUE 
			$3:raw $4:raw $5:raw $6:raw
		GROUP BY (t.id, c.name, ce.bookmarks, ce.applications, e.types)
		$7:raw
		LIMIT $8 OFFSET $9
		;`, [uuid, rights, f_search, f_contributors, f_mobilizations, f_space, order, page_content_limit, (page - 1) * page_content_limit])
	.then(results => {
		return { 
			// templates: results,
			count: (page - 1) * page_content_limit, 
			// sections: [
			// 	{ status: 0, label: 'unpublished', templates: results.filter(d => d.status == 0) }, 
			// 	{ status: 1, label: 'publishable', templates: results.filter(d => d.status == 1) }, 
			// 	{ status: 2, label: 'published', templates: results.filter(d => d.status == 2) }
			// ]
			sections: [{ templates: results }]
		}
	}).catch(err => console.log(err))
}