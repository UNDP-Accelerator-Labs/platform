const { page_content_limit, followup_count, metafields, modules, engagementtypes, map, DB } = include('config/')
const { checklanguage, datastructures, engagementsummary, parsers, array, join } = include('routes/helpers/')

const filter = require('../filter')

module.exports = async kwargs => {
	const conn = kwargs.connection ? kwargs.connection : DB.conn
	const { req, res } = kwargs || {}
	const { object } = req.params || {}
	
	const { uuid, rights, collaborators } = req.session || {}
	const language = checklanguage(req.params?.language || req.session.language)

	// GET FILTERS
	const [ f_space, order, page, full_filters ] = await filter(req, res)
	
	let collaborators_ids = collaborators.map(d => d.uuid)
	if (!collaborators_ids.length) collaborators_ids = [ uuid ]

	const engagement = engagementsummary({ doctype: 'pad', engagementtypes, uuid })
 	const current_user = DB.pgp.as.format(uuid === null ? 'NULL' : '$1', [ uuid ])

	// CONSTRUCT FOLLOW-UPS GRAPH
	return conn.task(t => {
		// THE ORDER HERE IS IMPORTANT, THIS IS WHAT ENSURE THE TREE CONSTRUCTION LOOP WORKS
		return t.any(`
			SELECT id FROM pads p
			WHERE TRUE 
				$1:raw 
				AND p.id NOT IN (SELECT review FROM reviews)
			$2:raw
			LIMIT $3 OFFSET $4
		;`, [ full_filters, order, page_content_limit, (page - 1) * page_content_limit ])
		.then(async pads => {
			pads = pads.map(d => d.id)
			padlist = DB.pgp.as.format(pads.length === 0 ? '(NULL)' : '($1:csv)', [ pads ])
			
			const batch = []

			// TO DO: ADD IF STATEMENTS FOR DIFFERENT MODULES BELOW

			// GET BASIC PAD INFO
			batch.push(t.any(`
				SELECT p.id, p.owner, p.title, p.sections, p.template, p.status, p.source, nlevel(p.version) AS version_depth,
					CASE
						WHEN AGE(now(), p.date) < '0 second'::interval
							THEN jsonb_build_object('interval', 'positive', 'date', to_char(p.date, 'DD Mon YYYY'), 'minutes', EXTRACT(minute FROM AGE(p.date, now())), 'hours', EXTRACT(hour FROM AGE(p.date, now())), 'days', EXTRACT(day FROM AGE(p.date, now())), 'months', EXTRACT(month FROM AGE(p.date, now())))
						ELSE jsonb_build_object('interval', 'negative', 'date', to_char(p.date, 'DD Mon YYYY'), 'minutes', EXTRACT(minute FROM AGE(now(), p.date)), 'hours', EXTRACT(hour FROM AGE(now(), p.date)), 'days', EXTRACT(day FROM AGE(now(), p.date)), 'months', EXTRACT(month FROM AGE(now(), p.date)))
					END AS date,

					CASE WHEN p.owner IN ($2:csv)
					OR $3 > 2
						THEN TRUE
						ELSE FALSE
					END AS editable

				FROM pads p
				WHERE p.id IN $1:raw
			;`, [ padlist, collaborators_ids, rights ])
			.then(results => {
				results.forEach(d => {
					d.img = parsers.getImg(d)
					d.sdgs = parsers.getSDGs(d)
					d.tags = parsers.getTags(d)
					d.txt = parsers.getTxt(d)
					delete d.sections // WE DO NOT NEED TO SEND ALL THE DATA (JSON PAD STRUCTURE) AS WE HAVE EXTRACTED THE NECESSARY INFO ABOVE
				})
				return results
			}).catch(err => console.log(err)))
			// SOURCE INFORMATION
			batch.push(t.any(`
				SELECT p.id, pp.title AS source_title
				FROM pads p
				INNER JOIN pads pp
					ON p.source = pp.id
				WHERE p.id IN $1:raw
			;`, [ padlist ]).catch(err => console.log(err)))
			// REVIEW STATUS
			batch.push(t.any(`
				SELECT p.id, 
					CASE WHEN rr.pad IS NOT NULL
						THEN 1
						ELSE 0
					END AS review_status
				FROM pads p
				LEFT JOIN review_requests rr
					ON p.id = rr.pad
				WHERE p.id IN $1:raw
			;`, [ padlist ]).catch(err => console.log(err)))
			// TEMPLATE INFORMATION
			batch.push(t.any(`
				SELECT p.id, t.title AS template_title 
				FROM templates t
				INNER JOIN pads p
					ON p.template = t.id
				WHERE p.id IN $1:raw
			;`, [ padlist ]).catch(err => console.log(err)))
			// MOBILIZATION INFORMATION
			batch.push(t.any(`
				SELECT mc.pad AS id, MAX(m.id) AS mobilization, m.title AS mobilization_title, m.pad_limit 
				FROM mobilizations m
				INNER JOIN mobilization_contributions mc
					ON mc.mobilization = m.id
				WHERE mc.pad IN $1:raw
				GROUP BY (mc.pad, m.title, m.pad_limit)
			;`, [ padlist ]).catch(err => console.log(err)))
			// PINBOARD INFORMATION
			batch.push(t.any(`
				SELECT p.id, json_agg(json_build_object('id', pb.id, 'title', pb.title)) AS pinboards
				FROM pads p
				INNER JOIN pinboard_contributions pc
					ON pc.pad = p.id
				INNER JOIN pinboards pb
					ON pb.id = pc.pinboard
				WHERE p.id IN $1:raw
					AND $2:raw IN (SELECT participant FROM pinboard_contributors WHERE pinboard = pb.id)
				GROUP BY (p.id)
			;`, [ padlist, current_user ]).catch(err => console.log(err)))
			// FOLLOW UP STATUS: THIS IS NOW DONE WITH THE ltree STRUCTURE
			batch.push(t.any(`
				SELECT p.id, 
					COALESCE((nlevel(p.version) > 1 
						AND index(p.version, text2ltree(p.id::text)) > 0
						AND m.copy = FALSE
					), FALSE) AS is_followup
				FROM pads p
				INNER JOIN mobilization_contributions mc
					ON mc.pad = p.id
				INNER JOIN mobilizations m
					ON m.id = mc.mobilization
				WHERE p.id IN $1:raw
					-- AND p.source IS NOT NULL
			;`, [ padlist ]).catch(err => console.log(err)))
			// FOLLOW UP OPTIONS: THIS IS NOW DONE WITH THE ltree STRUCTURE
			// THE SOURCE OF THE FOLLOW UP MOBILIZATION IS THE MOBILIZATION THAT THE PAD WAS CONTRIBUTED TO
			batch.push(t.task(t1 => {
				const batch1 = []

				batch1.push(t1.any(`
					SELECT p.id AS id, 
						json_agg(json_build_object(
							'id', m.id, 
							'title', m.title, 
							'source', p.id, -- THE SOURCE AND THE TEMPLATE ARE FOR PASSING TO ANY NEW FOLLOWUP PAD SUBMISSION
							'template', m.template,
							'count', (
								SELECT COUNT (pp.id) FROM pads pp
								INNER JOIN mobilization_contributions mm_cc
									ON mm_cc.pad = pp.id
								WHERE p.version @> pp.version
								AND mm_cc.mobilization = m.id
							),
							'max', $2::INT
						)) AS followups
					FROM pads p
					INNER JOIN mobilization_contributions mc
						ON mc.pad = p.id
					INNER JOIN mobilizations m
						ON subpath(m.version, -2, -1)::TEXT = mc.mobilization::TEXT
					WHERE m.status = 1
						AND m.copy = FALSE
						AND p.status >= 2
						AND p.id IN $1:raw
					GROUP BY p.id
				;`, [ padlist, followup_count ]))
				batch1.push(t1.any(`
					SELECT p.id AS id, 
						json_agg(json_build_object(
							'id', m.id, 
							'title', m.title, 
							'source', p.id, -- THE SOURCE AND THE TEMPLATE ARE FOR PASSING TO ANY NEW FOLLOWUP PAD SUBMISSION
							'template', m.template,
							'count', (
								SELECT COUNT (pp.id) FROM pads pp
								INNER JOIN mobilization_contributions mm_cc
									ON mm_cc.pad = pp.id
								WHERE p.version @> pp.version
								AND mm_cc.mobilization = m.id
							),
							'max', $2::INT
						)) AS followups
					FROM pads p
					INNER JOIN pinboard_contributions pc
						ON pc.pad = p.id
					INNER JOIN pinboards pb
						ON pb.id = pc.pinboard
					INNER JOIN mobilizations m
						ON m.collection = pb.id
					WHERE m.status = 1
						AND m.version IS NULL
						AND p.status >= 2
						AND p.id IN $1:raw
					GROUP BY p.id
				;`, [ padlist, followup_count ]))
				return t1.batch(batch1)
				.then(results => {
					const [ followups, depths ] = results
					return pads.map(d => {
						const followup = followups.find(c => c.id === d)?.followups || []
						const depth = depths.find(c => c.id === d)?.followups || []
						const obj = {}
						obj.id = d
						obj.followups = followup.concat(depth).filter(c => c.count < followup_count)
						return obj
					}).filter(d => d.followups.length > 0)
				}).catch(err => console.log(err))
			}).catch(err => console.log(err)))
			// FORWARD STATUS: THIS IS NOW DONE WITH THE ltree STRUCTURE
			batch.push(t.any(`
				SELECT p.id, 
					COALESCE((nlevel(p.version) > 1 
						AND index(p.version, text2ltree(p.id::text)) > 0
						AND m.copy = TRUE
					), FALSE) AS is_forward
				FROM pads p
				INNER JOIN mobilization_contributions mc
					ON mc.pad = p.id
				INNER JOIN mobilizations m
					ON m.id = mc.mobilization
				WHERE p.id IN $1:raw
					-- AND p.source IS NOT NULL
			;`, [ padlist ]).catch(err => console.log(err)))
			// FORWARD OPTIONS: THIS IS NOW DONE WITH THE ltree STRUCTURE
			batch.push(t.any(`
				SELECT p.id AS id, 
					json_agg(json_build_object(
						'id', m.id, 
						'title', m.title, 
						'source', p.id, -- THE SOURCE AND THE TEMPLATE ARE FOR PASSING TO ANY NEW FOLLOWUP PAD SUBMISSION
						'template', m.template,
						'count', (
							SELECT COUNT (pp.id) FROM pads pp
							INNER JOIN mobilization_contributions mm_cc
								ON mm_cc.pad = pp.id
							WHERE p.version @> pp.version
							AND mm_cc.mobilization = m.id
						),
						'max', $2::INT
					)) AS forwards
				FROM pads p
				INNER JOIN mobilization_contributions mc
					ON mc.pad = p.id
				INNER JOIN mobilizations m
					ON subpath(m.version, -2, -1)::TEXT = mc.mobilization::TEXT
				WHERE m.status = 1
					AND m.copy = TRUE
					AND p.status >= 2
					AND p.id IN $1:raw
				GROUP BY p.id
			;`, [ padlist, followup_count ])
			.then(results => {
				results.forEach(d => {
					d.forwards = d.forwards.filter(c => c.count < followup_count)
				})
				return results
			}).catch(err => console.log(err)))
			// DETECT PUBLICATION LIMIT TO DETERMINE WHETHER OR NOT THE PAD CAN BE PUBLISHED
			batch.push(t.any(`
				SELECT p.id, COALESCE(m.pad_limit - COUNT(contributed.id), 1)::INT AS available_publications 
				FROM pads p
				INNER JOIN mobilization_contributions mc
					ON mc.pad = p.id
				INNER JOIN mobilizations m
					ON m.id = mc.mobilization
				LEFT JOIN (
					SELECT pp.id, mm_cc.mobilization FROM pads pp
					INNER JOIN mobilization_contributions mm_cc
						ON mm_cc.pad = pp.id
					WHERE pp.status >= 2
						AND pp.owner IN ($2:csv)
				) AS contributed
					ON contributed.mobilization = m.id
				WHERE p.id IN $1:raw
				GROUP BY (p.id, m.pad_limit)
			;`, [ padlist, collaborators_ids ]).catch(err => console.log(err)))
			// CURRENT USER ENGAGMENT WITH PADS
			batch.push(t.any(`
				SELECT p.id, $2:raw
				FROM pads p
				WHERE p.id IN $1:raw
			;`, [ padlist, engagement.cases ]).catch(err => console.log(err)))
			// ENGAGEMENT STATS
			batch.push(t.any(`
				SELECT p.id, $2:raw
				FROM pads p
				LEFT JOIN ($3:raw) ce ON ce.docid = p.id
				WHERE p.id IN $1:raw
			;`, [ padlist, engagement.coalesce, engagement.query ]).catch(err => console.log(err)))
			
			return t.batch(batch)
			.then(results => {
				let data = pads.map(d => { return { id: d } })
				results.forEach(d => {
					data = join.multijoin.call(data, [ d, 'id' ])
				})
				return data
			}).catch(err => console.log(err))
			
		}).then(results => {
			// THIS IS A LEGACY FIX FOR THE SOLUTIONS MAPPING PLATFORM
			// NEED TO CHECK WHETHER THERE IS A CONSENT FORM ATTACHED FOR SOLUTIONS THAT ARE NOT PUBLIC (status = 2)
			// ONLY THESE CAN BE PUBLISED IN THE FRONT-END
			if (results.length) return datastructures.legacy.publishablepad({ connection: t, data: results })
			else return results
		}).catch(err => console.log(err))
	}).then(async results => {
		const data = await join.users(results, [ language, 'owner' ])

		return { 
			data,
			// count: (page - 1) * page_content_limit, 
			// count: page * page_content_limit, 
			count: page_content_limit, 
			sections: [{ data }]
		}
	}).catch(err => console.log(err))
}