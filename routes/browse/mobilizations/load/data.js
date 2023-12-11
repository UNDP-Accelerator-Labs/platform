const { page_content_limit, modules, engagementtypes, DB } = include('config/')
const { array, checklanguage, engagementsummary, join, safeArr, DEFAULT_UUID } = include('routes/helpers/')

const filter = require('../filter')

module.exports = async kwargs => {
	const conn = kwargs.connection ? kwargs.connection : DB.conn
	let { req, filters } = kwargs || {}
	const { object } = req.params || {}
	const { uuid, rights, collaborators } = req.session || {}
	const language = checklanguage(req.params?.language || req.session.language)

	// GET FILTERS
	if (!filters?.length) filters = await filter(req)
	const [ f_space, order, page, full_filters ] = await filters

	const collaborators_ids = safeArr(collaborators.map(d => d.uuid), uuid ?? DEFAULT_UUID)

	const engagement = engagementsummary({ doctype: 'mobilization', engagementtypes, uuid })

	// RESTRUCTURING HERE
	return conn.task(t => {
		return t.any(`
			SELECT id FROM mobilizations m
			WHERE (m.owner = $1
				OR $1 IN (SELECT participant FROM mobilization_contributors WHERE mobilization = m.id)
				OR $2 > 2)
				$3:raw
			$4:raw
			LIMIT $5 OFFSET $6
		;`, [ uuid, rights, full_filters, order, page_content_limit, (page - 1) * page_content_limit ])
		.then(mobilizations => {
			mobilizations = mobilizations.map(d => d.id)
			mobilizationlist = DB.pgp.as.format(mobilizations.length === 0 ? '(NULL)' : '($1:csv)', [ mobilizations ])

			const batch = []

			// GET BASIC MOBILIZATION INFORMATION
			batch.push(t.any(`
				SELECT m.id, m.owner, m.title, m.status, m.public, m.source, nlevel(m.version) AS version_depth, m.language,
					CASE
						WHEN AGE(now(), m.start_date) < '0 second'::interval
							THEN jsonb_build_object('type', 'start', 'interval', 'positive', 'date', to_char(m.start_date, 'DD Mon YYYY'), 'minutes', EXTRACT(minute FROM AGE(m.start_date, now())), 'hours', EXTRACT(hour FROM AGE(m.start_date, now())), 'days', EXTRACT(day FROM AGE(m.start_date, now())), 'months', EXTRACT(month FROM AGE(m.start_date, now())))
						ELSE jsonb_build_object('type', 'start', 'interval', 'negative', 'date', to_char(m.start_date, 'DD Mon YYYY'), 'minutes', EXTRACT(minute FROM AGE(now(), m.start_date)), 'hours', EXTRACT(hour FROM AGE(now(), m.start_date)), 'days', EXTRACT(day FROM AGE(now(), m.start_date)), 'months', EXTRACT(month FROM AGE(now(), m.start_date)))
					END AS start_date,

					CASE WHEN m.end_date IS NULL
							THEN 'null'
						WHEN AGE(now(), m.end_date) < '0 second'::interval
							THEN jsonb_build_object('type', 'end', 'interval', 'positive', 'date', to_char(m.end_date, 'DD Mon YYYY'), 'minutes', EXTRACT(minute FROM AGE(m.end_date, now())), 'hours', EXTRACT(hour FROM AGE(m.end_date, now())), 'days', EXTRACT(day FROM AGE(m.end_date, now())), 'months', EXTRACT(month FROM AGE(m.end_date, now())))
						ELSE jsonb_build_object('type', 'end','interval', 'negative', 'date', to_char(m.end_date, 'DD Mon YYYY'), 'minutes', EXTRACT(minute FROM AGE(now(), m.end_date)), 'hours', EXTRACT(hour FROM AGE(now(), m.end_date)), 'days', EXTRACT(day FROM AGE(now(), m.end_date)), 'months', EXTRACT(month FROM AGE(now(), m.end_date)))
					END AS end_date,

					CASE WHEN m.source IS NOT NULL
						AND m.copy = FALSE
						AND m.child = FALSE
							THEN TRUE
							ELSE FALSE
						END AS is_followup,

					CASE WHEN m.source IS NOT NULL
						AND m.copy = TRUE
						AND m.child = FALSE
							THEN TRUE
							ELSE FALSE
						END AS is_copy,

					CASE WHEN m.source IS NOT NULL
						AND m.copy = FALSE
						AND m.child = TRUE
							THEN TRUE
							ELSE FALSE
						END AS is_child,

					CASE WHEN m.owner IN ($2:csv)
						OR $3 > 2
							THEN TRUE
							ELSE FALSE
						END AS editable

					FROM mobilizations m
					WHERE m.id IN $1:raw

			;`, [ mobilizationlist, collaborators_ids, rights ])
			.catch(err => console.log(err)))
			// SOURCE INFORMATION
			batch.push(t.any(`
				SELECT m.id, mm.title AS source_title
				FROM mobilizations m
				INNER JOIN mobilizations mm
					ON m.source = mm.id
				WHERE m.id IN $1:raw
			;`, [ mobilizationlist ]).catch(err => console.log(err)))

			// TARGET INFORMATION (NEEDED IN FRONT END TO LIMIT THE NUMBER OF MOBILZIATIONS THAT CAN BE FOLLOWED UP)
			batch.push(t.any(`
				SELECT m.id, mm.id AS follow
				FROM mobilizations m
				INNER JOIN mobilizations mm
					ON mm.source = m.id
				WHERE m.id IN $1:raw
					AND mm.status < 2
			;`, [ mobilizationlist ])
			.then(results => {
				const data = array.nest.call(results, { key: 'id', keyname: 'id' })
				data.forEach(d => {
					d.following_up = d.count > 0
					delete d.values
				})
				return data
			}).catch(err => console.log(err)))

			// ASSOCIATED TEMPLATE INFORMATION
			batch.push(t.any(`
				SELECT m.id, t.id AS template, t.title AS template_title, t.description AS template_description
				FROM mobilizations m
				INNER JOIN templates t
					ON m.template = t.id
				WHERE m.id IN $1:raw
			;`, [ mobilizationlist ]).catch(err => console.log(err)))
			// ASSOCIATED PADS INFORMATION
			batch.push(t.task(t1 => {
				// TO NOTE: THERE USED TO BE AN ADDITIONAL FILTER FOR VIEWING ONLY THE COUNTS OF THE CURRENT USER
				// THIS NOW SHOWS COUNTS FOR ALL USERS
				// (p.owner = $1 OR $4 > 2)
				const batch1 = new Array(4).fill(0).map((d, i) => {
					return t1.any(`
						SELECT m.id, jsonb_build_object('count', COUNT(p.id)::INT, 'status', $2::INT) AS associated_pads
						FROM mobilizations m
						INNER JOIN mobilization_contributions mc
							ON mc.mobilization = m.id
						INNER JOIN pads p
							ON p.id = mc.pad
						WHERE m.id IN $1:raw
							AND p.status = $2::INT
						GROUP BY m.id
					;`, [ mobilizationlist, i ])
					.catch(err => console.log(err))
				})

				return t1.batch(batch1)
				.then(results => {
					const data =  array.nest.call(results.flat(), { key: 'id', keyname: 'id' })
					data.forEach(d => {
						d.associated_pads = d.values.map(c => c.associated_pads) 
						delete d.values
					})
					return data
				}).catch(err => console.log(err))
			}).catch(err => console.log(err)))
			// CONTRIBUTOR INFORMATION
			batch.push(t.task(t1 => {
				const batch1 = []

				batch1.push(t1.any(`
					SELECT m.id, COUNT (DISTINCT(p.owner))::INT AS contributors
					FROM mobilizations m
					INNER JOIN mobilization_contributions mc
						ON mc.mobilization = m.id
					INNER JOIN pads p
						ON p.id = mc.pad
					WHERE m.id IN $1:raw
						-- AND p.status >= 2
						AND m.public = FALSE
					GROUP BY m.id
				;`, [ mobilizationlist ])
				.catch(err => console.log(err)))

				batch1.push(t1.any(`
					SELECT m.id, COUNT (DISTINCT(mc.participant))::INT AS total
					FROM mobilizations m
					INNER JOIN mobilization_contributors mc
						ON mc.mobilization = m.id
					WHERE m.id IN $1:raw
						AND m.public = FALSE
					GROUP BY m.id
				;`, [ mobilizationlist ])
				.catch(err => console.log(err)))

				return t1.batch(batch1)
				.then(results => {
					const data =  array.nest.call(results.flat(), { key: 'id', keyname: 'id' })
					data.forEach(d => {
						d.participants = {}
						d.values.forEach(c => {
							const { id, ...value } = c
							d.participants = Object.assign(d.participants, value)
						})
						delete d.values
						delete d.count
					})
					return data
				}).catch(err => console.log(err))

			}).catch(err => console.log(err)))

			// CURRENT USER ENGAGMENT WITH MOBILIZATIONS
			if (engagementtypes?.length > 0) {
				batch.push(t.any(`
					SELECT m.id, $2:raw
					FROM mobilizations m
					WHERE m.id IN $1:raw
				;`, [ mobilizationlist, engagement.cases ]).catch(err => console.log(err)))
			}
			// ENGAGEMENT STATS
			if (engagementtypes?.length > 0) {
				batch.push(t.any(`
					SELECT m.id, $2:raw
					FROM mobilizations m
					LEFT JOIN ($3:raw) ce ON ce.docid = m.id
					WHERE m.id IN $1:raw
				;`, [ mobilizationlist, engagement.coalesce, engagement.query ]).catch(err => console.log(err)))
			}

			return t.batch(batch)
			.then(results => {
				let data = mobilizations.map(d => { return { id: d } })
				results.forEach(d => {
					data = join.multijoin.call(data, [ d, 'id' ])
				})
				return data
			}).catch(err => console.log(err))

		}).catch(err => console.log(err))
	}).then(async results => {
		const data = await join.users(results, [ language, 'owner' ])

		return {
			data,
			count: page * page_content_limit,
			sections: [{ data }]
		}
	}).catch(err => console.log(err))



	// THE tm PART ENSURES ONLY ONE FOLLOW UP AT A TIME:
	// IF THE MOBILIZATION HAS AN ACTIVE FOLLOW UP (status = 1) THEN THE USER CANNOT ADD ANOTHER FOLLOW UP
	// TO DO: THE SAME FOR COPIES
	return conn.any(`
		-- SELECT m.id,
		-- 	m.owner,
		-- 	m.title,
		-- 	m.status,
		-- 	m.public,
		-- 	m.source,
		-- 	nlevel(m.version) AS version_depth,
		-- 	m.language,
		-- 	t.id AS template,
		-- 	t.title AS template_title,
		-- 	t.description AS template_description,

			-- CASE
			-- 	WHEN AGE(now(), m.start_date) < '0 second'::interval
			-- 		THEN jsonb_build_object('type', 'start', 'interval', 'positive', 'date', to_char(m.start_date, 'DD Mon YYYY'), 'minutes', EXTRACT(minute FROM AGE(m.start_date, now())), 'hours', EXTRACT(hour FROM AGE(m.start_date, now())), 'days', EXTRACT(day FROM AGE(m.start_date, now())), 'months', EXTRACT(month FROM AGE(m.start_date, now())))
			-- 	ELSE jsonb_build_object('type', 'start', 'interval', 'negative', 'date', to_char(m.start_date, 'DD Mon YYYY'), 'minutes', EXTRACT(minute FROM AGE(now(), m.start_date)), 'hours', EXTRACT(hour FROM AGE(now(), m.start_date)), 'days', EXTRACT(day FROM AGE(now(), m.start_date)), 'months', EXTRACT(month FROM AGE(now(), m.start_date)))
			-- END AS start_date,

			-- CASE WHEN m.end_date IS NULL
			-- 		THEN 'null'
			-- 	WHEN AGE(now(), m.end_date) < '0 second'::interval
			-- 		THEN jsonb_build_object('type', 'end', 'interval', 'positive', 'date', to_char(m.end_date, 'DD Mon YYYY'), 'minutes', EXTRACT(minute FROM AGE(m.end_date, now())), 'hours', EXTRACT(hour FROM AGE(m.end_date, now())), 'days', EXTRACT(day FROM AGE(m.end_date, now())), 'months', EXTRACT(month FROM AGE(m.end_date, now())))
			-- 	ELSE jsonb_build_object('type', 'end','interval', 'negative', 'date', to_char(m.end_date, 'DD Mon YYYY'), 'minutes', EXTRACT(minute FROM AGE(now(), m.end_date)), 'hours', EXTRACT(hour FROM AGE(now(), m.end_date)), 'days', EXTRACT(day FROM AGE(now(), m.end_date)), 'months', EXTRACT(month FROM AGE(now(), m.end_date)))
			-- END AS end_date,

			-- CASE WHEN m.source IS NOT NULL
			-- 	THEN (SELECT m2.title FROM mobilizations m2 WHERE m2.id = m.source)
			-- 	ELSE NULL
			-- END AS source_title,

			-- CASE WHEN m.source IS NOT NULL
			-- 	AND m.copy = FALSE
			-- 	AND m.child = FALSE
			-- 		THEN TRUE
			-- 		ELSE FALSE
			-- 	END AS is_followup,

			-- CASE WHEN m.source IS NOT NULL
			-- 	AND m.copy = TRUE
			-- 	AND m.child = FALSE
			-- 		THEN TRUE
			-- 		ELSE FALSE
			-- 	END AS is_copy,

			-- CASE WHEN m.source IS NOT NULL
			-- 	AND m.copy = FALSE
			-- 	AND m.child = TRUE
			-- 		THEN TRUE
			-- 		ELSE FALSE
			-- 	END AS is_child,

			COALESCE((SELECT sm.title FROM mobilizations sm WHERE sm.id = m.source LIMIT 1), NULL) AS source,
			COALESCE((SELECT sm.id FROM mobilizations sm WHERE sm.id = m.source LIMIT 1), NULL) AS source_id, -- THIS IS NOT USED IN THE FRONT END: IT IS THE SETUP FOR LIMITING THE NUMBER OF COPIED MOBILIZATIONS

			COALESCE((SELECT tm.title FROM mobilizations tm WHERE tm.source = m.id LIMIT 1), NULL) AS target, -- NOT SURE THIS IS NEEDED
			-- COALESCE((SELECT tm.id FROM mobilizations tm WHERE tm.source = m.id LIMIT 1), NULL) AS target_id,

			-- COALESCE((SELECT COUNT (DISTINCT(p.id)) FROM mobilization_contributions mc INNER JOIN pads p ON mc.pad = p.id WHERE p.status >= 2 AND mc.mobilization = m.id), 0)::INT AS associated_pads,
			-- COALESCE((SELECT COUNT (DISTINCT(p.id)) FROM mobilization_contributions mc INNER JOIN pads p ON mc.pad = p.id WHERE p.status < 2 AND mc.mobilization = m.id AND (p.owner = $1 OR $4 > 2)), 0)::INT AS private_associated_pads,

			-- CASE WHEN m.public = FALSE
			-- 	THEN COALESCE((SELECT COUNT (DISTINCT(p.owner)) FROM mobilization_contributions mc INNER JOIN pads p ON mc.pad = p.id WHERE p.status >= 2 AND mc.mobilization = m.id), 0)::INT
			-- 	ELSE NULL
			-- END AS contributors,

			-- CASE WHEN m.public = FALSE
			-- 	THEN COALESCE((SELECT COUNT (DISTINCT(mc.participant)) FROM mobilization_contributors mc WHERE mc.mobilization = m.id), 0)::INT
			-- 	ELSE NULL
			-- END AS participants,

			-- THESE ARE THE ENGAGEMENT COALESCE STATEMENTS
			$3:raw,

			-- CASE WHEN m.owner IN ($2:csv)
			-- 	OR $4 > 2
			-- 		THEN TRUE
			-- 		ELSE FALSE
			-- 	END AS editable,

			-- THESE ARE THE ENGAGEMENT CASE STATEMENTS
			$5:raw

		FROM mobilizations m

		INNER JOIN templates t
			ON m.template = t.id

		LEFT JOIN (
			SELECT docid, contributor, array_agg(DISTINCT type) AS types FROM engagement
			WHERE contributor = $1
				AND doctype = 'mobilization'
			GROUP BY (docid, contributor)
		) e ON e.docid = m.id

		LEFT JOIN ($6:raw) ce ON ce.docid = m.id

		WHERE (m.owner = $1
			OR $1 IN (SELECT mc.participant FROM mobilization_contributors mc WHERE mc.mobilization = m.id)
			OR $4 > 2)
			$7:raw

		GROUP BY (
			m.id,
			t.id,
			associated_pads,
			e.types,
			$8:raw
		)
		$9:raw
		LIMIT $10 OFFSET $11
	;`, [
		/* $1 */ uuid,
		/* $2 */ collaborators_ids,
		/* $3 */ engagement.coalesce,
		/* $4 */ rights,
		/* $5 */ engagement.cases,
		/* $6 */ engagement.query,
		/* $7 */ full_filters,
		/* $8 */ engagement.list,
		/* $9 */ order,
		/* $10 */ page_content_limit,
		/* $11 */ (page - 1) * page_content_limit
	]).then(async results => {
		const data = await join.users(results, [ language, 'owner' ])

		return {
			data,
			count: page_content_limit,
			sections: [{ data }]
		}
	}).catch(err => console.log(err))
}
