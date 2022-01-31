// BROWSE > PADS > LOAD
const DB = require('../../../db-config.js')
const { page_content_limit } = require('../../../config.js')
const filter = require('./filter').main

exports.main = kwargs => {
	const conn = kwargs.connection ? kwargs.connection : DB.conn
	// THIS NEEDS TO BE A TASK
	const { req } = kwargs
	const { uuid, rights } = req.session || {}

	// GET FILTERS
	const [f_space, order, page, full_filters] = filter(req)
 
	// CONSTRUCT FOLLOW-UPS GRAPH
	return conn.task(t => {
		// THE ORDER HERE IS IMPORTANT, THIS IS WHAT ENSURE THE TREE CONSTRUCTION LOOP WORKS
		return t.any(`
			SELECT id, source FROM pads 
			WHERE id IN (SELECT source FROM pads) 
				OR source IS NOT NULL
			ORDER BY date ASC
		;`).then(results => {
			const groups = results.filter(d => !d.source).map(d => { return [d.id] })
			results.filter(d => d.source).forEach(d => {
				groups.find(c => c.includes(d.source)).push(d.id)
			})
			console.log('check here')
			console.log(results.length)
			console.log(results)
			console.log(groups.length)
			console.log(groups)


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
			

			// FOLLOW UP json_agg INSPIRED BY:
			// https://stackoverflow.com/questions/54637699/how-to-group-multiple-columns-into-a-single-array-or-similar/54638050
			// https://stackoverflow.com/questions/24155190/postgresql-left-join-json-agg-ignore-remove-null
			
			// TO DO: MAKE SURE THE FOLLOW UP IS ASSIGNED TO THIS USER
			// MAKE SURE THE FOLLOW UP IS NOT ACCESSIBLE THROUGH THE MAIN MENU: A FOLLOW UP MUST BE ASSOCIATED WITH AN EXISTING, PUBLISHED PAD
			return t.any(`
				SELECT p.id, p.sections, p.title, p.status, to_char(p.date, 'DD Mon YYYY') AS date, p.source,
					c.name AS contributorname, c.country, cp.id AS country_id, mob.mobilization, m.pad_limit,

					CASE WHEN p.source IS NOT NULL
						AND mob.mobilization IS NOT NULL
						AND (SELECT copy FROM mobilizations WHERE id = mob.mobilization) = FALSE
							THEN TRUE
							ELSE FALSE
						END AS is_followup,

					CASE WHEN (
							SELECT p2.id FROM pads p2 
							INNER JOIN mobilization_contributions mc2 
								ON p2.id = mc2.pad 
							INNER JOIN mobilizations m2 
								ON mc2.mobilization = m2.id 
							WHERE p2.source = p.id 
							AND m2.status = 1
							LIMIT 1
						) IS NOT NULL
						THEN TRUE 
						ELSE FALSE 
					END AS followed_up,

					CASE WHEN p.source IS NOT NULL
						AND mob.mobilization IS NOT NULL
						AND (SELECT copy FROM mobilizations WHERE id = mob.mobilization) = TRUE
							THEN TRUE
							ELSE FALSE
						END AS is_forward,

					COALESCE(json_agg(json_build_object('id', fmob.id, 'title', fmob.title, 'source', p.id, 'template', fmob.template)) 
						FILTER (WHERE fmob.id IS NOT NULL AND fmob.copy = FALSE AND p.status = 2), NULL) AS followups,

					COALESCE(json_agg(json_build_object('id', fmob.id, 'title', fmob.title, 'source', p.id, 'template', fmob.template)) 
						FILTER (WHERE fmob.id IS NOT NULL AND fmob.copy = TRUE AND p.status = 2), NULL) AS forwards,

					COALESCE(
						(SELECT m.pad_limit - COUNT (id) FROM pads pp 
							WHERE pp.contributor IN (SELECT id FROM contributors WHERE country = c.country)
							AND pp.id IN (SELECT pad FROM mobilization_contributions WHERE mobilization = mob.mobilization)
							AND pp.status = 2  
						), 1)::INT AS available_publications,

					COALESCE(p.source, p.id) AS group_id,

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
					AND mob.mobilization = (SELECT MAX(mc2.mobilization) FROM mobilization_contributions mc2 WHERE mc2.pad = p.id)
				GROUP BY (p.id, c.name, c.country, cp.id, mob.mobilization, ce.bookmarks, ce.inspirations, ce.approvals, ce.flags, e.types, m.pad_limit)
				$5:raw
				LIMIT $6 OFFSET $7
			;`, [uuid, rights, full_filters, f_space, order, page_content_limit, (page - 1) * page_content_limit])
			.then(results => {
				// IF ALL PADS ARE ALREADY RETRIEVED, THEN GROUP THEM
				// IF A FOLLOW UP IS RETRIEVED BUT NOT THE SOURCE, LOOK FOR THE SOURCES AND RETRIEVE THEM
				console.log(results.map(d => d.id))
				results.forEach(d => {
					if (d.source) {
						const group = groups.find(c => c.includes(d.id))
						console.log(`${d.id} is associated with ${group.filter(c => c !== d.id)}`)
						console.log(`missing ${group.filter(c => !results.map(b => b.id).includes(c))}`)
					}
				})
				return results
			})
		})
	}).then(results => {
		return { 
			pads: results,
			count: (page - 1) * page_content_limit, 
			sections: [{ pads: results }]

			// sections: [
			// 	{ status: 0, label: 'unpublished', pads: results.filter(d => d.status == 0) }, 
			// 	{ status: 1, label: 'publishable', pads: results.filter(d => d.status == 1) }, 
			// 	{ status: 2, label: 'published', pads: results.filter(d => d.status == 2) }
			// ]
		}
	}).catch(err => console.log(err))
}