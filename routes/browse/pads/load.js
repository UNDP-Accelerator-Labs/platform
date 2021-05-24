const DB = require('../../../db-config.js')
const { page_content_limit } = require('../../../config.js')
const filter = require('./filter').main

exports.main = kwargs => {
	const conn = kwargs.connection ? kwargs.connection : DB.conn
	const { uuid, rights } = kwargs.req.session || {}

	// GET FILTERS
	const [f_space, order, page, full_filters] = filter(kwargs.req)
 
	// return conn.any(`
	// 	SELECT p.id, p.sections, p.title, p.status, to_char(p.date, 'DD Mon YYYY') AS date, c.name AS contributorname, c.country AS lab, 
	// 		COALESCE(ce.bookmarks, 0)::INT AS bookmarks, 
	// 		COALESCE(ce.inspirations, 0)::INT AS inspirations, 
	// 		COALESCE(ce.approvals, 0)::INT AS approvals, 
	// 		COALESCE(ce.flags, 0)::INT AS flags,
	// 		CASE WHEN p.contributor = (SELECT id FROM contributors WHERE uuid = $1)
	// 			OR $2 > 2
	// 				THEN TRUE
	// 				ELSE FALSE
	// 			END AS editable,
	// 		CASE WHEN p.status = 2 
	// 			AND 'bookmark' = ANY(e.types)
	// 				THEN TRUE 
	// 				ELSE FALSE 
	// 			END AS bookmarked,
	// 		CASE WHEN p.status = 2 
	// 			AND 'inspiration' = ANY(e.types)
	// 				THEN TRUE 
	// 				ELSE FALSE 
	// 			END AS inspired,
	// 		CASE WHEN p.status = 2 
	// 			AND 'approval' = ANY(e.types)
	// 				THEN TRUE 
	// 				ELSE FALSE 
	// 			END AS approved,
	// 		CASE WHEN p.status = 2 
	// 			AND 'flag' = ANY(e.types)
	// 				THEN TRUE 
	// 				ELSE FALSE 
	// 			END AS flagged
	// 	FROM pads p
	// 	INNER JOIN contributors c
	// 		ON c.id = p.contributor
	// 	LEFT JOIN (
	// 		SELECT pad, contributor, array_agg(DISTINCT type) AS types FROM engagement_pads
	// 		WHERE contributor = (SELECT id FROM contributors WHERE uuid = $1)
	// 		GROUP BY (pad, contributor)
	// 	) e
	// 		ON e.pad = p.id
	// 	LEFT JOIN (
	// 		SELECT pad, 
	// 			SUM (CASE WHEN type = 'bookmark' THEN 1 ELSE 0 END) AS bookmarks,
	// 			SUM (CASE WHEN type = 'inspiration' THEN 1 ELSE 0 END) AS inspirations,
	// 			SUM (CASE WHEN type = 'approval' THEN 1 ELSE 0 END) AS approvals,
	// 			SUM (CASE WHEN type = 'flag' THEN 1 ELSE 0 END) AS flags
	// 		FROM engagement_pads
	// 		GROUP BY (pad)
	// 	) ce
	// 		ON ce.pad = p.id
	// 	LEFT JOIN mobilization_contributions mob
	// 		ON mob.pad = p.id
	// 	WHERE TRUE 
	// 		$3:raw $4:raw $5:raw $6:raw $7:raw $8:raw $9:raw $10:raw $11:raw
	// 	$12:raw
	// 	LIMIT $13 OFFSET $14
	// ;`, [uuid, rights, f_search, f_sdgs, f_thematic_areas, f_methods, f_datasources, f_contributors, f_template, f_mobilizations, f_space, order, page_content_limit, (page - 1) * page_content_limit])
	return conn.any(`
		SELECT p.id, p.sections, p.title, p.status, to_char(p.date, 'DD Mon YYYY') AS date, c.name AS contributorname, c.country, cp.id AS country_id,
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
		INNER JOIN centerpoints cp
			ON c.country = cp.country
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
			$3:raw $4:raw
		$5:raw
		LIMIT $6 OFFSET $7
	;`, [uuid, rights, full_filters, f_space, order, page_content_limit, (page - 1) * page_content_limit])
	.then(results => {
		return { 
			pads: results,
			count: (page - 1) * page_content_limit, 
			// sections: [
			// 	{ status: 0, label: 'unpublished', pads: results.filter(d => d.status == 0) }, 
			// 	{ status: 1, label: 'publishable', pads: results.filter(d => d.status == 1) }, 
			// 	{ status: 2, label: 'published', pads: results.filter(d => d.status == 2) }
			// ]
			sections: [{ pads: results }]
		}
	}).catch(err => console.log(err))
}