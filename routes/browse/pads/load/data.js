const { page_content_limit, followup_count, metafields, modules, engagementtypes, map, ownDB, DB } = include('config/')
const { checklanguage, datastructures, engagementsummary, parsers, array, join, safeArr, DEFAULT_UUID, pagestats } = include('routes/helpers/')

const filter = require('../filter')
const ids = require('./ids.js')

module.exports = async kwargs => {
	const conn = kwargs.connection ? kwargs.connection : DB.conn
	let { req, res, filters } = kwargs || {}
	const { object } = req.params || {}

	const { uuid, rights, collaborators } = req.session || {}
	const language = checklanguage(req.params?.language || req.session.language)

	// GET FILTERS
	if (!filters?.length) filters = await filter(req, res)
	const [ f_space, order, page, full_filters ] = filters

	const collaborators_ids = safeArr(collaborators.map(d => d.uuid), uuid ?? DEFAULT_UUID)

	const engagement = engagementsummary({ doctype: 'pad', engagementtypes, uuid })
 	const current_user = DB.pgp.as.format(uuid === null ? 'NULL' : '$1', [ uuid ])

	// CONSTRUCT FOLLOW-UPS GRAPH
	return conn.task(t => {
		// THE ORDER HERE IS IMPORTANT, THIS IS WHAT ENSURE THE TREE CONSTRUCTION LOOP WORKS
		// THIS IS WHY WE SET THE SEED
		return t.one(`SELECT setseed(1);`)
		.then(_ => {
			return ids({ connection: conn, req, res, filters })
			.then(async pads => {
				// pads = pads.map(d => d.id)
				padlist = DB.pgp.as.format(pads.length === 0 ? '(NULL)' : '($1:csv)', [ pads ])

				const ownId = await ownDB();
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
				.then(async results => {
					await pagestats.putReadCount('pad', results, d => d.id);
					results.forEach(d => {
						d.img = parsers.getImg(d)
						d.sdgs = parsers.getSDGs(d)
						d.tags = parsers.getTags(d)
						d.txt = parsers.getTxt(d)
						delete d.sections // WE DO NOT NEED TO SEND ALL THE DATA (JSON PAD STRUCTURE) AS WE HAVE EXTRACTED THE NECESSARY INFO ABOVE
					})
					return results
				}).catch(err => console.log(err)))
				// LOCATION INFORMATION
				if (metafields.some(d => d.type === 'location')) {
					batch.push(t.any(`
						SELECT DISTINCT pad AS id, iso3 FROM locations
						WHERE pad IN $1:raw
					;`, [ padlist ])
					.then(async results => {
						let location_names = await join.locations(results, { language, key: 'iso3' })
						location_names = array.nest.call(location_names, { key: 'id', keyname: 'id' })
						location_names.forEach(d => {
							d.locations = d.values
							delete d.values
							delete d.count
						})
						return location_names
					}).catch(err => console.log(err)))
				}
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
				if (modules.some((d) => d.type === 'mobilizations' && d.rights.read <= rights)) {
					batch.push(t.task(t1 => {
						return t1.any(`
							SELECT mc.pad AS id, MAX(m.id) AS mobilization, m.title AS mobilization_title, m.pad_limit
							FROM mobilizations m
							INNER JOIN mobilization_contributions mc
								ON mc.mobilization = m.id
							WHERE mc.pad IN $1:raw
							GROUP BY (mc.pad, m.title, m.pad_limit)
						;`, [ padlist ])
						.then(results => {
							// DETECT PUBLICATION LIMIT TO DETERMINE WHETHER OR NOT THE PAD CAN BE PUBLISHED
							return t1.batch(results.map(d => {
								if (!d.mobilization) return d
								else return t1.oneOrNone(`
										SELECT COUNT(1)::INT AS count --, p.status 
										FROM pads p
										INNER JOIN mobilization_contributions mc
											ON mc.pad = p.id
										WHERE mc.mobilization = $2::INT
											AND p.owner IN (SELECT owner FROM pads WHERE id = $1::INT)
											AND p.status >= 2
										-- GROUP BY p.status
								;`, [ d.id, d.mobilization ]) // FOR NOW WE DO NOT GROUP BY status
								.then(limit => {
									if (d.pad_limit === 0) d.available_publications = undefined
									else d.available_publications = Math.max(d.pad_limit - (limit?.count ?? 0), 0)
									return d
								}).catch(err => console.log(err))
							})).catch(err => console.log(err))
							// BELOW IS OLD LOGIC
							// batch.push(t.any(`
							// 	SELECT p.id,

							// 		CASE WHEN m.pad_limit = 0
							// 			THEN 'infinity'::FLOAT4
							// 			ELSE GREATEST(COALESCE(m.pad_limit - COUNT(contributed.id), 0)::INT, 0)
							// 		END AS available_publications
								
							// 	FROM pads p
							// 	INNER JOIN mobilization_contributions mc
							// 		ON mc.pad = p.id
							// 	INNER JOIN mobilizations m
							// 		ON m.id = mc.mobilization
							// 	LEFT JOIN (
							// 		SELECT pp.id, pp.owner, mm_cc.mobilization 
							// 		FROM pads pp
							// 		INNER JOIN mobilization_contributions mm_cc
							// 			ON mm_cc.pad = pp.id
							// 		WHERE pp.status >= 2
							// 			AND pp.owner IN ($2:csv)
							// 	) AS contributed
							// 		ON contributed.mobilization = m.id
							// 		AND contributed.owner = p.owner
							// 	WHERE p.id IN $1:raw
							// 	GROUP BY (p.id, m.pad_limit)
							// ;`, [ padlist, collaborators_ids ]) // THIS USED TO BE SPECIFICALLY FOR ACTION PLANS, WHERE TEAM CONTRIBUTIONS WERE LIMITED. BUT FOR THE SAKE OF GENERALIZATION, WE ARE CHANGING THIS TO THE UNIQUE USER.
							
						}).catch(err => console.log(err))
					}))
				}
				// PINBOARD INFORMATION
				const padToPinboards = new Map();
				(await DB.general.any(`
					SELECT
						pc.pad, pb.id, pb.title,
						CASE WHEN EXISTS (
							SELECT 1 FROM exploration WHERE linked_pinboard = pb.id
						) THEN TRUE 
							ELSE FALSE 
						END AS is_exploration
					FROM pinboard_contributions pc
					INNER JOIN pinboards pb 
						ON pb.id = pc.pinboard
					WHERE
						pc.pad IN $1:raw
						AND $2:raw IN (SELECT participant FROM pinboard_contributors WHERE pinboard = pb.id)
						AND pc.db = $3
						AND pc.is_included = true
				`, [ padlist, current_user, ownId ])).forEach(row => {
					const pinboards = padToPinboards.get(row.pad) ?? [];
					pinboards.push({
						id: row.id,
						title: row.title,
						is_exploration: row.is_exploration,
						editable: true // THIS SHOULD BE HANDLED BY THE sql QUERY: ONLY AUTHORIZED USERS SHOULD SEE THE PINS
					});
					padToPinboards.set(row.pad, pinboards);
				});
				batch.push([...pads].map((padId) => ({
					id: padId,
					pinboards: padToPinboards.get(padId) ?? [],
				})));
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
				
				// TO DO: THERE IS AN ISSUE HERE: VALID MOBS PREVENTS PBMOBS FROM WORKING, SINCE PBMOBS IS NOT BASED ON A PREVIOUS MOBILIZATION
				// const validMobs = (await t.any(`
				// 	SELECT DISTINCT mc.mobilization AS id
				// 	FROM pads p
				// 	INNER JOIN mobilization_contributions mc
				// 		ON mc.pad = p.id
				// 	WHERE p.status >= 2
				// 		AND p.id IN $1:raw
				// ;`, [ padlist ])).map(row => row.id);
				// const pbMobs = (await DB.general.any(`
				// 	SELECT pb.mobilization as mob
				// 	FROM pinboards pb
				// 	WHERE pb.mobilization_db = $2
				// 		AND pb.mobilization IN ($1:csv)
				// ;`, [ safeArr(validMobs, -1), ownId ])).map(row => row.mob);

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
					
					// THIS CODE WAS NOT WORKING
					// batch1.push(t1.any(`
					// 	SELECT p.id AS id,
					// 		json_agg(json_build_object(
					// 			'id', m.id,
					// 			'title', m.title,
					// 			'source', p.id, -- THE SOURCE AND THE TEMPLATE ARE FOR PASSING TO ANY NEW FOLLOWUP PAD SUBMISSION
					// 			'template', m.template,
					// 			'count', (
					// 				SELECT COUNT (pp.id) FROM pads pp
					// 				INNER JOIN mobilization_contributions mm_cc
					// 					ON mm_cc.pad = pp.id
					// 				WHERE p.version @> pp.version
					// 				AND mm_cc.mobilization = m.id
					// 			),
					// 			'max', $2::INT
					// 		)) AS followups
					// 	FROM pads p
					// 	INNER JOIN mobilization_contributions mc
					// 		ON mc.pad = p.id
					// 	INNER JOIN mobilizations m
					// 		ON m.id = mc.mobilization
					// 	WHERE m.status = 1
					// 		AND m.version IS NULL
					// 		AND p.status >= 2
					// 		AND m.id IN ($1:csv)
					// 	GROUP BY p.id
					// ;`, [ safeArr(pbMobs, -1), followup_count ]))
					
					// FIRST WE CONSTRUCT THE followups OBJECT
					// THEN WE ATTACH TO RELEVANT PADS
					// THIS IS FOR DEEP DIVE CAMPAIGNS THAT USE collection
					batch1.push(t1.any(`
						SELECT m.collection, json_build_object(
							'id', m.id,
							'title', m.title,
							'template', m.template,
							'count', 0,
							'max', $1::INT
						) AS followups

						FROM mobilizations m
						WHERE m.status = 1
							AND m.version IS NULL
							AND m.collection IS NOT NULL
					;`, [ followup_count ])
					.then(results => {
						// WE NEED THE COUNT OF PADS SUBMITTED TO THE FOLLOWUP,
						// JOINED TO THE PADS RENDERED ACCORDING TO THEIR SOURCE
						return DB.general.any(`
							SELECT pad AS id, pinboard AS collection FROM pinboard_contributions
							WHERE pinboard IN ($1:csv)
							AND db = $2
							AND pad IN $3:raw
						;`, [ safeArr(results.map(d => d.collection), -1), ownId, padlist ])
						.then(async pinnedpads => {
							pinnedpads = pinnedpads.map(d => {
								const { collection, ...datum } = d
								datum.followups = Object.assign({}, results.find(c => c.collection === d.collection)?.followups)
								if (datum.followups) {
									datum.followups.source = d.id
								}
								return datum
							})
							// GET THE count OF FOLLOWUPS
							for (let p = 0; p < pinnedpads.length; p ++) {
								const pad = pinnedpads[p]
								if (pad.followups) {
									pad.followups.count = await t1.one(`
										SELECT COUNT(p.id)::INT
										FROM pads p
										INNER JOIN mobilization_contributions mc
											ON mc.pad = p.id
										WHERE mc.mobilization = $1::INT
											AND '$2'::ltree @> p.version
									;`, [ pad.followups.id, pad.id ], d => d.count)
								}
							}
							return pinnedpads
						}).catch(err => console.log(err))
					}).catch(err => console.log(err)))
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
				// CURRENT USER ENGAGMENT WITH PADS
				if (engagementtypes?.length > 0) {
					batch.push(t.any(`
						SELECT p.id, $2:raw
						FROM pads p
						WHERE p.id IN $1:raw
					;`, [ padlist, engagement.cases ]).catch(err => console.log(err)))
				} else batch.push([])
				// ENGAGEMENT STATS
				if (engagementtypes?.length > 0) {
					batch.push(t.any(`
						SELECT p.id, $2:raw
						FROM pads p
						LEFT JOIN ($3:raw) ce ON ce.docid = p.id
						WHERE p.id IN $1:raw
					;`, [ padlist, engagement.coalesce, engagement.query ]).catch(err => console.log(err)))
				} else batch.push([])

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
