const { page_content_limit, modules, engagementtypes, DB } = include('config/')
const { array, checklanguage, engagementsummary, join, safeArr, DEFAULT_UUID, pagestats } = include('routes/helpers/')

const filter = require('../filter')

module.exports = async kwargs => {
	const conn = kwargs.connection ? kwargs.connection : DB.conn
	const { req } = kwargs || {}
	const { object } = req.params || {}
	const { uuid, rights, collaborators } = req.session || {}
	const language = checklanguage(req.params?.language || req.session.language)

	// GET FILTERS
	const [ f_space, order, page, full_filters ] = await filter(req)

	const collaborators_ids = safeArr(collaborators.map(d => d.uuid), uuid ?? DEFAULT_UUID)

	const engagement = engagementsummary({ doctype: 'template', engagementtypes, uuid })

	return conn.task(t => {
		return t.any(`
			SELECT t.id FROM templates t
			WHERE TRUE
				$1:raw
			$2:raw
			LIMIT $3 OFFSET $4
		;`, [ full_filters, order, page_content_limit, (page - 1) * page_content_limit ])
		.then(templates => {
			templates = templates.map(d => d.id)
			templatelist = DB.pgp.as.format(templates.length === 0 ? '(NULL)' : '($1:csv)', [ templates ])

			const batch = []

			// GET BASIC TEMPLATE INFORMATION
			batch.push(t.any(`
				SELECT t.id, t.owner, t.title, t.source, t.description AS txt, t.sections, t.status, nlevel(t.version) AS version_depth,
					CASE
						WHEN AGE(now(), t.date) < '0 second'::interval
							THEN jsonb_build_object('interval', 'positive', 'date', to_char(t.date, 'DD Mon YYYY'), 'minutes', EXTRACT(minute FROM AGE(t.date, now())), 'hours', EXTRACT(hour FROM AGE(t.date, now())), 'days', EXTRACT(day FROM AGE(t.date, now())), 'months', EXTRACT(month FROM AGE(t.date, now())))
						ELSE jsonb_build_object('interval', 'negative', 'date', to_char(t.date, 'DD Mon YYYY'), 'minutes', EXTRACT(minute FROM AGE(now(), t.date)), 'hours', EXTRACT(hour FROM AGE(now(), t.date)), 'days', EXTRACT(day FROM AGE(now(), t.date)), 'months', EXTRACT(month FROM AGE(now(), t.date)))
					END AS date,

					CASE WHEN t.source IS NOT NULL
						THEN TRUE
						ELSE FALSE
					END AS is_copy,

					CASE WHEN t.owner IN ($2:csv)
						OR $3 > 2
							THEN TRUE
							ELSE FALSE
						END AS editable,

					CASE WHEN (SELECT COUNT (id) FROM pads WHERE template = t.id) > 0
						OR (SELECT COUNT (id) FROM mobilizations WHERE template = t.id) > 0
							THEN FALSE
						ELSE TRUE
					END AS retractable

				FROM templates t
				WHERE t.id IN $1:raw
			;`, [ templatelist, collaborators_ids, rights ])
			.then(async results => {
				await pagestats.putReadCount('template', results, d => d.id);
				results.forEach(d => {
					d.items = d.sections?.map(d => d.structure)?.flat().length || 0
					delete d.sections
				})
				return results
			}).catch(err => console.log(err)))
			// SOURCE INFORMATION
			batch.push(t.any(`
				SELECT t.id, tt.title AS source_title
				FROM templates t
				INNER JOIN templates tt
					ON t.source = tt.id
				WHERE t.id IN $1:raw
			;`, [ templatelist ]).catch(err => console.log(err)))
			// ASSOCIATED PADS INFORMATION
			batch.push(t.task(t1 => {
				// TO NOTE: THERE USED TO BE AN ADDITIONAL FILTER FOR VIEWING ONLY THE COUNTS OF THE CURRENT USER
				// THIS NOW SHOWS COUNTS FOR ALL USERS
				// (p.owner = $1 OR $4 > 2)
				const batch1 = new Array(4).fill(0).map((d, i) => {
					return t1.any(`
						SELECT t.id, jsonb_build_object('count', COUNT(p.id)::INT, 'status', $2::INT) AS associated_pads
						FROM templates t
						INNER JOIN pads p
							ON p.template = t.id
						WHERE t.id IN $1:raw
							AND p.status = $2::INT
						GROUP BY t.id
					;`, [ templatelist, i ])
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
			// ASSOCIATED MOBILIZATION INFORMATION
			batch.push(t.task(t1 => {
				const batch1 = new Array(2).fill(0).map((d, i) => {
					return t1.any(`
						SELECT t.id, jsonb_build_object('count', COUNT(m.id)::INT, 'status', $2::INT) AS associated_mobilizations
						FROM templates t
						INNER JOIN mobilizations m
							ON m.template = t.id
						WHERE t.id IN $1:raw
							AND m.status = $2::INT
						GROUP BY t.id
					;`, [ templatelist, i ])
					.catch(err => console.log(err))
				})

				return t1.batch(batch1)
				.then(results => {
					const data =  array.nest.call(results.flat(), { key: 'id', keyname: 'id' })
					data.forEach(d => {
						d.associated_mobilizations = d.values.map(c => c.associated_mobilizations) 
						delete d.values
					})
					return data
				}).catch(err => console.log(err))
			}))

			// CURRENT USER ENGAGMENT WITH TEMPLATES
			if (engagementtypes?.length > 0) {
				batch.push(t.any(`
					SELECT t.id, $2:raw
					FROM templates t
					WHERE t.id IN $1:raw
				;`, [ padlist, engagement.cases ]).catch(err => console.log(err)))
			} else batch.push([])
			// ENGAGEMENT STATS
			if (engagementtypes?.length > 0) {
				batch.push(t.any(`
					SELECT t.id, $2:raw
					FROM templates t
					LEFT JOIN ($3:raw) ce ON ce.docid = t.id
					WHERE t.id IN $1:raw
				;`, [ padlist, engagement.coalesce, engagement.query ]).catch(err => console.log(err)))
			} else batch.push([])

			return t.batch(batch)
			.then(results => {
				let data = templates.map(d => { return { id: d } })
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
}