const { followup_count, modules, engagementtypes, metafields, DB, ownDB } = include('config/')
const { checklanguage, engagementsummary, join, flatObj, datastructures, safeArr, DEFAULT_UUID, parsers, pagestats, fuzzNumber, convertNum } = include('routes/helpers/')

module.exports = (req, res) => {
	const { referer } = req.headers || {}
	const { object } = req.params || {}
	const { id, template, source, mobilization, display } = req.query || {}
	const { uuid, rights, collaborators, public } = req.session || {}
	const language = checklanguage(req.params?.language || req.session.language)
	const path = req.path.substring(1).split('/')
	const activity = path[1]

	const collaborators_ids = safeArr(collaborators.map(d => d.uuid), uuid ?? DEFAULT_UUID)

	DB.conn.tx(t => {
		// CHECK IF THE USER IS ALLOWED TO CONTRIBUTE A PAD (IN THE EVENT OF A MOBILIZATION)
		return check_authorization({ connection: t, id, template, mobilization, source, uuid, rights, collaborators, public })
		.then(async result => {
			const { authorized, redirect } = result

			if (!authorized) {
				if (referer) return res.redirect(referer)
				else res.redirect('/login')
			} else if (authorized && redirect && redirect !== activity) {
				const query = []
				for (key in req.query) {
					query.push(`${key}=${req.query[key]}`)
				}
				return res.redirect(`/${language}/${redirect}/pad${query.length > 0 ? `?${query.join('&')}` : ''}`)
			} else {
				const batch = []

				// GET POTENTIAL TEMPLATE INFORMATION
				let template_clause = ''
				if (template) template_clause = DB.pgp.as.format(`id = $1::INT`, [ template ])
				else if (id) template_clause = DB.pgp.as.format(`id IN (SELECT template FROM pads WHERE id = $1::INT)`, [ id ])
				else template_clause = DB.pgp.as.format('FALSE')
				batch.push(t.oneOrNone(`
					SELECT id, title, description, sections, medium, slideshow FROM templates
					WHERE $1:raw
				;`, [ template_clause ]))

				// GET POTENTIAL MOBILIZATION INFORMATION
				let mobilization_clause = ''
				if (mobilization) mobilization_clause = DB.pgp.as.format(`id = $1::INT`, [ mobilization ])
				else if (id) mobilization_clause = DB.pgp.as.format(`id IN (SELECT MAX(mobilization) FROM mobilization_contributions WHERE pad = $1::INT)`, [ id ])
				else mobilization_clause = DB.pgp.as.format('FALSE')
				batch.push(t.oneOrNone(`
					SELECT id, title, description, language FROM mobilizations
					WHERE $1:raw
				;`, [ mobilization_clause ]))

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
							if (results?.length) return flatObj.call(results)
						}).catch(err => console.log(err))
					})
				)

				if (!id) { // THIS IS A NEW PAD
					batch.push(null)
				} else {
					const engagement = engagementsummary({ doctype: 'pad', engagementtypes, docid: id, uuid })
					// GET THE PAD DATA
					batch.push(t.oneOrNone(`
						SELECT p.id, p.title, p.owner, p.sections, p.template, p.status,

							CASE
								WHEN AGE(now(), p.date) < '0 second'::interval
									THEN jsonb_build_object('interval', 'positive', 'date', to_char(p.date, 'DD Mon YYYY'), 'minutes', EXTRACT(minute FROM AGE(p.date, now())), 'hours', EXTRACT(hour FROM AGE(p.date, now())), 'days', EXTRACT(day FROM AGE(p.date, now())), 'months', EXTRACT(month FROM AGE(p.date, now())))
								ELSE jsonb_build_object('interval', 'negative', 'date', to_char(p.date, 'DD Mon YYYY'), 'minutes', EXTRACT(minute FROM AGE(now(), p.date)), 'hours', EXTRACT(hour FROM AGE(now(), p.date)), 'days', EXTRACT(day FROM AGE(now(), p.date)), 'months', EXTRACT(month FROM AGE(now(), p.date)))
							END AS date,

							CASE WHEN p.id IN (SELECT pad FROM review_requests)
								THEN 1
								ELSE 0
							END AS review_status,

							CASE WHEN p.id IN (SELECT review FROM reviews)
								THEN TRUE
								ELSE FALSE
							END AS is_review,

							-- EXAMPLE FROM https://stackoverflow.com/questions/43053262/return-row-position-postgres
							COALESCE(
								(SELECT idx FROM (SELECT review, row_number() over(ORDER BY id) AS idx FROM reviews
									WHERE pad = p.source) res
									WHERE review = p.id
								)::INT,
							NULL) AS review_idx,

							COALESCE (
								(SELECT jsonb_agg(json_build_object('id', id, 'owner', owner)) FROM pads
								WHERE id IN (SELECT review FROM reviews WHERE status >= 2)
									AND source = p.id
								GROUP BY source
							)::TEXT, '[]')::JSONB AS reviews,

							-- THESE ARE THE ENGAGEMENT CASE STATEMENTS
							$1:raw

						FROM pads p

						LEFT JOIN (
							SELECT docid, user, array_agg(DISTINCT type) AS types FROM engagement
							WHERE user = $2
								AND doctype = 'pad'
							GROUP BY (docid, user)
						) e ON e.docid = p.id

						WHERE p.id = $3::INT
					;`, [ engagement.cases, uuid, id ])
					.then(async result => {
						if (result.reviews?.length > 0) {
							// TO DO: INVESTIGATE THIS
							if (result.reviews.length % modules.find(d => d.type === 'reviews')?.reviewers !== 0) {
								result.reviews = result.reviews.filter(d => d.owner === uuid)
							}
							result.reviews.sort((a, b) => a.id - b.id)
						}
						const ownId = await ownDB();
						const readCount = await DB.general.any(`
							SELECT read_count AS rc
							FROM page_stats
							WHERE pad = $1::INT AND db = $2 AND page_url = '' AND country = ''
						`, [id, ownId]);
						result.readCount = convertNum(fuzzNumber(readCount.length ? readCount[0].rc : 0));
						const data = await join.users(result, [ language, 'owner' ])
						return data
					}).catch(err => console.log(err)))
				}

				if (id && !uuid) {
					const user_country = await pagestats.ipCountry(req);
					const page_url = req.originalUrl;
					await pagestats.recordView(id, page_url, user_country, true);
					await pagestats.storeReadpage(req, id, page_url);
				}

				if (id && engagementtypes?.length > 0) { // EDIT THE PAD
					const engagement = engagementsummary({ doctype: 'pad', engagementtypes, docid: id, uuid })
					// GET THE ENGAGEMENT METRICS
					batch.push(t.oneOrNone(`
						SELECT
							-- THESE ARE THE ENGAGEMENT COALESCE STATEMENTS
							$1:raw
						FROM pads p
						JOIN ($2:raw) ce ON p.id = ce.docid
						WHERE p.status >= 2
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
										WHEN AGE(now(), r.date) < '0 second'::interval -- TECHNICALLY THIS SHOULD NOT BE NEEDED, AS MESSAGES CANNOT BE PROGRAMMED FOR LATER SEND
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
								AND c.doctype = 'pad'
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
					let [ display_template, display_mobilization, tags, data, ...engagementdata ] = results
					const [ engagement, comments ] = engagementdata || []

					if (id) data = await datastructures.legacy.publishablepad({ connection: t, data });

					const excerpt = data?.status > 2 ? { title: data.title, txt: parsers.getTxt(data)[0], img: { src: parsers.getImg(data)[0], width: 300, height: 200 }, p: true } : null
					// const item_attachments = parsers.getPadImgs(data)

					// const metadata = await datastructures.pagemetadata({ connection: t, req, display: display_template?.slideshow ? 'slideshow' : display })
					const metadata = await datastructures.pagemetadata({ connection: t, req, display: display || (display_template?.slideshow ? 'slideshow' : null), excerpt })
					return Object.assign(metadata, { data, tags, display_template, display_mobilization, source, engagement, comments })
				}).then(data => {
					// IF DISPLAY FOR PRINT, RENDER PRINT
					if (display === 'print') res.render('print/pads/', data)
					// OTHERWISE RENDER CONTRIBUTE
					else res.render('contribute/pad/', data)
				})
				.catch(err => console.log(err))
			}
		}).catch(err => console.log(err))
	}).catch(err => console.log(err))
}

async function check_authorization (_kwargs) {
	const conn = _kwargs.connection || DB.conn
	const { id, template, mobilization, source, uuid, rights, collaborators, public } = _kwargs

	let { read, write } = modules.find(d => d.type === 'pads')?.rights || {}
	if (typeof write === 'object') {
		if (!id && template) write = write.templated
		else if (id) {
			const used_template = await conn.one(`SELECT template FROM pads WHERE id = $1::INT;`, [ id ], d => d.template ?? false)
			if (used_template) write = write.templated
		} else write = write.blank
	}

	const collaborators_ids = safeArr(collaborators.map(d => d.uuid), uuid ?? DEFAULT_UUID)

	if (public || rights < write) {
		// if public and status < 3 then not authorized
		if (mobilization) {
			return conn.one(`SELECT public FROM mobilizations WHERE id = $1::INT;`, [ mobilization ], d => d.public)
			// TO DO: EDIT HERE FOR mobilization LANGUAGE
			.then(result => {
				if (result === true) return { authorized: true }
				else return { authorized: rights >= read, redirect: 'view' } // THIS IMPLIES A USER NOT LOGGED IN (PUBLIC VIEW) CAN SEE AN UNUBLISHED PAD SIMPLY BECAUSE IT WAS CONTRIBUTED TO AN OPEN MOBILIZATION
			}).catch(err => console.log(err))
		}
		else {
			if (id) return conn.one(`SELECT status FROM pads WHERE id = $1::INT;`, [ id ], d => public ? d.status > 2 : d.status >= read)
				.then(result => {
					if (result === true) return { authorized: (public || rights >= read), redirect: 'view' }
					else return { authorized: false }
				}).catch(err => console.log(err))
			else return new Promise(resolve => resolve({ authorized: false })) // THIS IS A NEW PAD, BUT THE USER IS IN PUBLIC VIEW OR DOES NOT HAVE THE RIGHTS TO WRITE
		}
	} else {
		if (id) return conn.oneOrNone(`
				SELECT TRUE AS bool FROM pads
				WHERE id = $1::INT
					AND (
						owner IN ($2:csv)
						OR owner IN (
							-- THIS IS FOR CURATING PADS CONTRIBUTED TO MOBILIZATIONS
							SELECT m.owner FROM mobilizations m
							INNER JOIN mobilization_contributions mc
								ON mc.mobilization = m.id
							WHERE mc.pad = $1::INT
						)
						OR $3 > 2
					) AND NOT (
						id IN (SELECT review FROM reviews)
						AND status >= 2
					)
			;`, [ id, collaborators_ids, rights ])
			.then(result => {
				if (result) return { authorized: true, redirect: 'edit' }
				else return { authorized: rights >= read, redirect: 'view' }
			}).catch(err => console.log(err))
		else return conn.task(t => {
			const batch = []
			if (mobilization) {
				// CHECK IF THE USER IS ALLOWED TO CONTRIBUTE TO THE MOBILIZATION
				// OTHREWISE REDIRECT
				batch.push(t.oneOrNone(`
					SELECT CASE WHEN
						(SELECT DISTINCT (participant) FROM mobilization_contributors WHERE mobilization = $1::INT AND participant = $2) IS NOT NULL
						THEN TRUE
						ELSE (SELECT public FROM mobilizations WHERE id = $1::INT)
					END AS bool
				;`, [ mobilization, uuid ], d => d.bool))

				if (source) {
					// INTERCEPT IF THERE ARE ALREADY FOLLOW UPS IN THIS MOBILIZATION
					// FIRST, CHECK IF THERE IS A SOURCE AND THIS IS IN A MOBILIZATION
					// AND WHETHER THE PAD HAS ALREADY BEEN FOLLOWED UP IN THIS MOBILIZATION
					batch.push(t.one(`
						SELECT COUNT (mc.pad) FROM mobilization_contributions mc
						INNER JOIN pads p
							ON p.id = mc.pad
						WHERE mc.mobilization = $1::INT
						AND p.source = $2::INT
					`, [ mobilization, source ], d => d.count))
				} else batch.push(0)
			} else {
				batch.push(true)
				batch.push(0)
			}
			return t.batch(batch)
			.catch(err => console.log(err))
		}).then(results => {
			const [ authorization, count ] = results
			if (authorization !== true || count >= followup_count) return { authorized: false }
			else return { authorized: true, redirect: 'contribute' }
		}).catch(err => console.log(err))
	}
}
