const { modules, engagementtypes, metafields, DB } = include('config/')
const { checklanguage, engagementsummary, join, flatObj, datastructures, safeArr, DEFAULT_UUID, pagestats } = include('routes/helpers/')

module.exports = async (req, res) => {
	const { uuid, rights, collaborators, public } = req.session || {}

	if (public) res.redirect('/login')
	else {
		const { referer } = req.headers || {}
		const { object } = req.params || {}
		const { id, source } = req.query || {}
		const language = checklanguage(req.params?.language || req.session.language)
		const path = req.path.substring(1).split('/')
		const activity = path[1]

		const module_rights = modules.find(d => d.type === 'templates')?.rights
		const collaborators_ids = safeArr(collaborators.map(d => d.uuid), uuid ?? DEFAULT_UUID) //.filter(d => d.rights >= (module_rights?.write ?? Infinity)).map(d => d.uuid)

		DB.conn.tx(t => {
			// CHECK IF THE USER IS ALLOWED TO CONTRIBUTE A TEMPLATE
			return check_authorization({ connection: t, uuid, id, rights, collaborators })
			.then(async result => {
				const { authorized, redirect } = result
				if (!authorized) {
					if (referer) return res.redirect(referer)
					else return res.redirect('/login')
				} else if (authorized && redirect && redirect !== activity) {
					const query = []
					for (key in req.query) {
						query.push(`${key}=${req.query[key]}`)
					}
					return res.redirect(`/${language}/${redirect}/template${query.length > 0 ? `?${query.join('&')}` : ''}`)
				} else {
					const batch = []
					// GET ALL TAG LISTS
					batch.push(
						DB.general.task(t1 => {
							const batch1 = metafields.filter(d => ['tag', 'index'].includes(d.type))
							.map(d => {
								return t1.any(`
									SELECT id, key, name, type FROM tags
									WHERE type = $1
										AND language = (COALESCE((SELECT language FROM tags WHERE type = $1 AND language = $2 LIMIT 1), 'en'))
								;`, [ d.label, language ])
								.then(results => {
									const obj = {}
									obj[d.label] = results
									return obj
								}).catch(err => console.log(err))
							})
							return t1.batch(batch1)
							.then(results => {
								return flatObj.call(results)
							}).catch(err => console.log(err))
						})
					)

					if (!id) { // THIS IS A NEW TEMPLATE
					 	if (source) { // CREATE A TEMPLATE BASED ON EXISTING ONE
							batch.push(t.oneOrNone(`
								SELECT title, description, sections, 0 AS status, slideshow FROM templates
								WHERE id = $1
							;`, [ +source ]))
						} else batch.push(null)
					} else { // EDIT THE TEMPLATE
						const engagement = engagementsummary({ doctype: 'template', engagementtypes, docid: +id, uuid })
						// GET THE TEMPLATE DATA
						batch.push(t.oneOrNone(`
							SELECT t.id, t.title, t.owner, t.description, t.sections, t.status, t.slideshow,

								CASE WHEN t.id IN (SELECT template FROM review_templates)
									THEN TRUE
									ELSE FALSE
								END AS review_template,

								CASE WHEN t.id IN (SELECT template FROM review_templates)
									THEN (SELECT DISTINCT(language) FROM review_templates WHERE template = t.id)
									ELSE NULL
								END AS review_language,

								-- THESE ARE THE ENGAGEMENT CASE STATEMENTS
								$1:raw

							FROM templates t

							LEFT JOIN (
								SELECT docid, user, array_agg(DISTINCT type) AS types FROM engagement
								WHERE user = $2
									AND doctype = 'template'
								GROUP BY (docid, user)
							) e ON e.docid = t.id

							WHERE t.id = $3
						;`, [ engagement.cases, uuid, +id ]).then(async results => {
							results.readCount = await pagestats.getReadCount(id, 'template');
							const data = await join.users(results, [ language, 'owner' ])
							return data
						}))
					}

					if (id) {
						// NOTE: for now we record views/reads even for unpublished templates
						// can be changed by moving this block up where readCount is set
						// and checking the status instead of id
						await pagestats.recordRender(req, id, 'template');
					}

					if (id && engagementtypes?.length > 0) { // GET THE ENGAGEMENT METRICS
						const engagement = engagementsummary({ doctype: 'template', engagementtypes, docid: +id, uuid })
						batch.push(t.oneOrNone(`
							SELECT
								-- THESE ARE THE ENGAGEMENT COALESCE STATEMENTS
								$1:raw
							FROM templates t
							JOIN ($2:raw) ce ON t.id = ce.docid
							WHERE t.status >= 2
						;`, [ engagement.coalesce, engagement.query ]))
						// GET THE COMMENTS
						if (engagementtypes.includes('comment')) {
							batch.push(t.any(`
								SELECT c.id, c.message, c.contributor,

									CASE
										WHEN AGE(now(), c.date) < '0 second'::interval
											THEN jsonb_build_object('interval', 'positive', 'date', to_char(c.date, 'DD Mon YYYY'), 'minutes', EXTRACT(minute FROM AGE(c.date, now())), 'hours', EXTRACT(hour FROM AGE(c.date, now())), 'days', EXTRACT(day FROM AGE(c.date, now())), 'months', EXTRACT(month FROM AGE(c.date, now())))
										ELSE jsonb_build_object('interval', 'negative', 'date', to_char(c.date, 'DD Mon YYYY'), 'minutes', EXTRACT(minute FROM AGE(now(), c.date)), 'hours', EXTRACT(hour FROM AGE(now(), c.date)), 'days', EXTRACT(day FROM AGE(now(), c.date)), 'months', EXTRACT(month FROM AGE(now(), c.date)))
									END AS date,

									COALESCE(jsonb_agg(jsonb_build_object(
										'id', r.id,
										'message', r.message,
										'contributor', r.contributor,
										'date', CASE
											WHEN AGE(now(), r.date) < '0 second'::interval
												THEN jsonb_build_object('interval', 'positive', 'date', to_char(r.date, 'DD Mon YYYY'), 'minutes', EXTRACT(minute FROM AGE(r.date, now())), 'hours', EXTRACT(hour FROM AGE(r.date, now())), 'days', EXTRACT(day FROM AGE(r.date, now())), 'months', EXTRACT(month FROM AGE(r.date, now())))
											ELSE jsonb_build_object('interval', 'negative', 'date', to_char(r.date, 'DD Mon YYYY'), 'minutes', EXTRACT(minute FROM AGE(now(), r.date)), 'hours', EXTRACT(hour FROM AGE(now(), r.date)), 'days', EXTRACT(day FROM AGE(now(), r.date)), 'months', EXTRACT(month FROM AGE(now(), r.date)))
											END
									)) FILTER (WHERE r.id IS NOT NULL), '[]') AS replies

									-- CASE WHEN AGE(now(), c.date) < '1 hour'::interval
									-- 		THEN to_char(AGE(now(), c.date), 'MI') || ' minutes ago'
									-- 	WHEN AGE(now(), c.date) < '1 day'::interval
									-- 		THEN to_char(AGE(now(), c.date), 'HH24') || ' hours ago'
									-- 	WHEN AGE(now(), c.date) < '10 days'::interval
									-- 		THEN to_char(AGE(now(), c.date), 'DD') || ' days ago'
									-- 	ELSE to_char(c.date, 'DD Mon YYYY')
									-- END AS date,

									-- COALESCE(jsonb_agg(jsonb_build_object(
									-- 	'id', r.id,
									-- 	'message', r.message,
									-- 	'contributor', r.contributor,
									-- 	'date', CASE WHEN AGE(now(), r.date) < '1 hour'::interval
									-- 			THEN to_char(AGE(now(), r.date), 'MI') || ' minutes ago'
									-- 		WHEN AGE(now(), r.date) < '1 day'::interval
									-- 			THEN to_char(AGE(now(), r.date), 'HH24') || ' hours ago'
									-- 		WHEN AGE(now(), r.date) < '10 days'::interval
									-- 			THEN to_char(AGE(now(), r.date), 'DD') || ' days ago'
									-- 		ELSE to_char(r.date, 'DD Mon YYYY')
									-- 		END
									-- )) FILTER (WHERE r.id IS NOT NULL), '[]') AS replies

								FROM comments c

								LEFT JOIN comments r
									ON r.source = c.id

								WHERE c.docid = $1::INT
									AND c.doctype = 'template'
									AND c.source IS NULL
									AND c.message IS NOT NULL
								GROUP BY c.id
								ORDER BY c.date DESC
							;`, [ id ]).then(async results => {
								const data = await join.users(results, [ language, 'contributor' ])
								return Promise.all(data.map(async d => {
									d.replies = await join.users(d.replies, [ language, 'contributor' ])
									return d
								}))
							}))
						} else batch.push(null)
					}

					return t.batch(batch)
					.then(async results => {
						const [ tags, data, ...engagementdata ] = results
						const [ engagement, comments ] = engagementdata || []

						const metadata = await datastructures.pagemetadata({ connection: t, req })
						return Object.assign(metadata, { data, tags, source, engagement, comments })
					}).then(data => res.render('contribute/template/', data))
					.catch(err => console.log(err))
				}
			}).catch(err => console.log(err))
		}).catch(err => console.log(err))
	}
}

function check_authorization (_kwargs) {
	const conn = _kwargs.connection || DB.conn
	const { uuid, rights, id, collaborators } = _kwargs
	const { read, write } = modules.find(d => d.type === 'templates')?.rights
	const collaborators_ids = safeArr(collaborators.map(d => d.uuid), uuid ?? DEFAULT_UUID) //.filter(d => d.rights >= (write ?? Infinity)).map(d => d.uuid)

	if (rights < write) {
		if (id) return conn.one(`SELECT status FROM templates WHERE id = $1::INT;`, [ id ], d => d.status > 2)
			.then(result => {
				if (result === true) return { authorized: rights >= read, redirect: 'view' }
				else return { authorized: false }
			}).catch(err => console.log(err))
		else return new Promise(resolve => resolve({ authorized: false }))
		// return new Promise(resolve => resolve({ authorized: rights >= read, redirect: 'view' }))
	} else {
		if (id) return conn.oneOrNone(`
			SELECT TRUE AS bool FROM templates
			WHERE id = $1::INT
				AND (owner IN ($2:csv) OR $3 > 2)
		;`, [ id, collaborators_ids, rights ])
		.then(result => {
			if (result) return { authorized: true, redirect: 'edit' }
			else return { authorized: rights >= read, redirect: 'view' }
		}).catch(err => console.log(err))
		else return new Promise(resolve => resolve({ authorized: true, redirect: 'contribute' }))
	}
}
