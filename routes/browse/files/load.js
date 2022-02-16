// BROWSE > PADS > LOAD
const DB = require('../../../db-config.js')
const { page_content_limit, followup_count } = require('../../../config.js')
const filter = require('./filter').main

exports.main = kwargs => {
	const conn = kwargs.connection ? kwargs.connection : DB.conn
	// THIS NEEDS TO BE A TASK
	const { req } = kwargs
	const { uuid, rights } = req.session || {}

	// GET FILTERS
	const [ f_space, order, page, full_filters ] = filter(req)
 
	return conn.any(`
		SELECT f.id, f.name, f.path, f.status, to_char(f.date, 'DD Mon YYYY') AS date, f.source,
			c.name AS contributorname, c.country, cp.id AS country_id, mob.mobilization, 
			m.title AS mobilization_title, m.pad_limit, p.template, p.title AS pad_title, t.title AS template_title,

			CASE WHEN f.source IS NOT NULL
				AND mob.mobilization IS NOT NULL
				AND (SELECT copy FROM mobilizations WHERE id = mob.mobilization) = TRUE
					THEN TRUE
					ELSE FALSE
				END AS is_forward,

			COALESCE(json_agg(json_build_object(
				'id', fmob.id, 
				'title', fmob.title, 
				'source', f.id, 
				'template', fmob.template,
				'count', (SELECT COUNT(p2.id) FROM pads p2 
					INNER JOIN mobilization_contributions mc2 
						ON p2.id = mc2.pad 
					WHERE p2.source = f.id 
					AND mc2.mobilization = fmob.id),
				'max', $8::INT
			)) FILTER (WHERE fmob.id IS NOT NULL AND fmob.copy = TRUE AND f.status = 2), '[]') 
			AS forwards,

			COALESCE(
				(SELECT m.pad_limit - COUNT (id) FROM pads pp 
					WHERE pp.contributor IN (SELECT id FROM contributors WHERE country = c.country)
					AND pp.id IN (SELECT pad FROM mobilization_contributions WHERE mobilization = mob.mobilization)
					AND pp.status = 2  
				), 1)::INT AS available_publications,

			COALESCE(ce.bookmarks, 0)::INT AS bookmarks, 
			COALESCE(ce.inspirations, 0)::INT AS inspirations, 
			
			CASE WHEN f.contributor = (SELECT id FROM contributors WHERE uuid = $1)
				OR $2 > 2
					THEN TRUE
					ELSE FALSE
				END AS editable,
			
			CASE WHEN f.status = 2 
				AND 'bookmark' = ANY(e.types)
					THEN TRUE 
					ELSE FALSE 
				END AS bookmarked,
			
			CASE WHEN f.status = 2 
				AND 'inspiration' = ANY(e.types)
					THEN TRUE 
					ELSE FALSE 
				END AS inspired

		FROM files f
		INNER JOIN contributors c
			ON c.id = f.contributor
		INNER JOIN centerpoints cp
			ON c.country = cp.country
		LEFT JOIN pads p
			ON f.source = p.id
		LEFT JOIN templates t
			ON t.id = p.template
		LEFT JOIN (
			SELECT pad, contributor, array_agg(DISTINCT type) AS types FROM engagement_pads
			WHERE contributor = (SELECT id FROM contributors WHERE uuid = $1)
			GROUP BY (pad, contributor)
		) e
			ON e.pad = f.id
		LEFT JOIN (
			SELECT pad, 
				SUM (CASE WHEN type = 'bookmark' THEN 1 ELSE 0 END) AS bookmarks,
				SUM (CASE WHEN type = 'inspiration' THEN 1 ELSE 0 END) AS inspirations
			FROM engagement_pads
			GROUP BY (pad)
		) ce
			ON ce.pad = f.id
		LEFT JOIN mobilization_contributions mob
			ON mob.pad = f.id
		LEFT JOIN mobilizations m
			ON m.id = mob.mobilization
		LEFT JOIN (
			SELECT id, title, source, template, copy FROM mobilizations
			WHERE status = 1
		) fmob
			ON fmob.source = mob.mobilization
		WHERE TRUE 
			$3:raw 
			$4:raw
			AND (mob.mobilization = (SELECT MAX(mc2.mobilization) FROM mobilization_contributions mc2 WHERE mc2.pad = f.id)
				OR mob.mobilization IS NULL)
		GROUP BY (
			f.id, 
			p.template,
			p.title,
			c.name, 
			c.country, 
			cp.id, 
			mob.mobilization, 
			ce.bookmarks, 
			ce.inspirations, 
			e.types, 
			m.title, 
			m.pad_limit,
			t.title
		)
		$5:raw
		LIMIT $6 OFFSET $7
	;`, [uuid, rights, full_filters, f_space, order, page_content_limit, (page - 1) * page_content_limit, followup_count])
	.then(results => {
		// REMOVE THE follow_ups AND forwards FOR PADS THAT HAVE ALREADY BEEN FOLLOWED UP FOR A GIVEN MOBILIZATION
		results.forEach(d => {
			d.forwards = d.forwards?.filter(c => c.count < followup_count)
		})

		return { 
			files: results,
			count: (page - 1) * page_content_limit, 
			sections: [{ files: results }] // THIS IS A BIT USELESS BUT THE FRONT END STILL DEPENDS ON IT
		}
	}).catch(err => console.log(err))
}