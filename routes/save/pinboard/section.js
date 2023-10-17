const { modules, metafields, map, DB } = include('config/')
const { checklanguage, array, join, geo } = include('routes/helpers/')

module.exports = async (req, res) => {
	const { xhr } = req
	const { referer } = req.headers || {}
	const { id, pinboard, title, description, ...insert_data } = req.body || {}
	let { section_type, countries, templates, mobilizations } = insert_data

	const language = checklanguage(req.params?.language || req.session.language)

	// const sql = DB.pgp.helpers.sets(insert_data)

	if (id) {
		// UPDATE
		if (title) {
			await DB.general.none(`
				UPDATE pinboard_sections
					SET title = $1
				WHERE id = $2 
			;`, [ title, id ]).catch(err => console.log(err))
		} else if (description) {
			await DB.general.none(`
				UPDATE pinboard_sections
					SET description = $1
				WHERE id = $2 
			;`, [ description, id ]).catch(err => console.log(err))
		}
	} else {
		// INSERT
		if (section_type === 'single') {
			// TO DO

			// await DB.conn.one(`
			// 	INSERT INTO pinboard_sections (pinboard, title, description)
			// 	VALUES ()
			// ;`)

		} else {
			await DB.general.tx(gt => {
				return DB.conn.tx(t => {
					return gt.any(`
						SELECT pad FROM pinboard_contributions
						WHERE pinboard = $1::INT
					;`, [ pinboard ])
					.then(async pads => {
						pads = pads.map(d => d.pad)
						const batch = []

						console.log(pads.length)

						if (map && countries) {
							if (!Array.isArray(countries)) countries = [countries]
							const name_column = await geo.adm0.name_column({ connection: gt, language })

							batch.push('countries')

							if (metafields.some((d) => d.type === 'location')) {
								batch.push(t.any(`
									SELECT p.id AS pad, l.iso3 FROM pads p
									INNER JOIN locations l
										ON l.pad = p.id
									WHERE p.id IN ($1:csv)
								;`, [ pads ]))
							} else {
								batch.push(t.any(`
									SELECT id AS pad, owner FROM pads
									WHERE id IN ($1:csv)
								;`, [ pads ]).then(async results => {
									const data = await join.users(results, [ language, 'owner' ])
									return data
								}).catch(err => console.log(err)))
							}
							// GET COLUMN NAME FOR COUNTRY NAME IN CURRENT LANGUAGE, LOOKING FOR EQUIVALENTS
							batch.push(gt.any(`
								WITH equivalents AS (
								SELECT COALESCE(jsonb_agg(DISTINCT(s.su_a3)) FILTER (WHERE s.su_a3 IS NOT NULL), '[]')
									|| COALESCE(jsonb_agg(DISTINCT(a.adm0_a3)) FILTER (WHERE a.adm0_a3 IS NOT NULL AND a.adm0_a3 <> s.su_a3), '[]')
									AS iso3
								FROM adm0_subunits s
								FULL OUTER JOIN adm0 a
									ON a.name = s.name
								WHERE s.name IN (
									SELECT name FROM adm0_subunits 
									WHERE su_a3 IN ($1:csv) OR adm0_a3 IN ($1:csv)
								) 
								GROUP BY s.adm0_a3
								)
								SELECT DISTINCT e.iso3 AS equivalents, COALESCE(a.$2:name, s.$2:name) AS title, '' AS description, $3::INT AS pinboard
								FROM equivalents e
								LEFT JOIN adm0 a
									ON e.iso3 ? a.adm0_a3
								LEFT JOIN adm0_subunits s
									ON e.iso3 ? s.su_a3
							;`, [ countries, name_column, pinboard ])
							.catch(err => console.log(err)))

						} else if (modules.some(d => d.type === 'templates') && templates) {
							if (!Array.isArray(templates)) templates = [templates]

							batch.push('templates')

							batch.push(t.any(`
								SELECT p.id AS pad, t.title AS ref 
								FROM pads p
								LEFT JOIN templates t
									ON t.id = p.template
								WHERE p.id IN ($1:csv)
							;`, [ pads ]))

							batch.push(t.any(`
								SELECT title, description, $1::INT AS pinboard FROM templates
								WHERE id IN ($2:csv)
							;`, [ pinboard, templates ]))

						} else if (modules.some(d => d.type === 'mobilizations') && mobilizations) {
							if (!Array.isArray(mobilizations)) mobilizations = [mobilizations]

							batch.push('mobilizations')

							batch.push(t.any(`
								SELECT p.id AS pad, m.title AS ref FROM pads p
								LEFT JOIN mobilization_contributions mc
									ON mc.pad = p.id
								LEFT JOIN mobilizations m
									ON mc.mobilization = m.id
								WHERE p.id IN ($1:csv)
							;`, [ pads ]))

							batch.push(t.any(`
								SELECT title, description, $1::INT AS pinboard FROM mobilizations
								WHERE id IN ($2:csv)
							;`, [ pinboard, mobilizations ]))
						} else res.redirect('/module-error')

						return t.batch(batch)
						.then(results => {
							const [ type, section_pads, sections ] = results
							
							// THIS IS TO HANDLE PADS THAT DO NOT HAVE A TEMPLATE OR A MOBILIZATION
							
							if (['templates', 'mobilizations'].includes(type)) {
								const unlabeled_sections = array.unique.call(section_pads, { key: 'ref', onkey: true }).filter(d => !sections.some(c => c.title === d))
								if (unlabeled_sections.length) {
									unlabeled_sections.forEach(d => {
										sections.push({ title: d || 'Untitled section', description: '', pinboard: +pinboard })
										// TO DO: TRANSLATE
									})
								}
							}

							const insert_sections = `${DB.pgp.helpers.insert(sections, [ 'title', 'description', 'pinboard' ], 'pinboard_sections')} RETURNING id, title`

							return gt.any(insert_sections)
							.then(ids => {

								sections.forEach(d => {
									d.id = ids.find(c => c.title === d.title)?.id
								})

								// RETURN THE INSERT FIRST TO GET THE id, AND INSERT IT INTO pinboard_contribution.section FOR EACH pad.id
								if (type === 'countries') {
									section_pads.forEach(d => {
										d.section = +sections.find(c => c.equivalents.includes(d.iso3))?.id || null
										d.pinboard = +pinboard
									})
								} else {
									section_pads.forEach(d => {
										if (d.ref) d.section = +sections.find(c => c.title === d.ref)?.id || null
										else d.section = +sections.find(c => c.title === 'Untitled section')?.id || null // TO DO: UPDATE AFTER TRANSLATION
										d.pinboard = +pinboard
									})
								}

								const update_pinboard_contributions = `${DB.pgp.helpers.update(section_pads, [ '?pad', '?pinboard', 'section' ], 'pinboard_contributions')} WHERE v.pad = t.pad AND v.pinboard = t.pinboard`
								return gt.none(update_pinboard_contributions)
								.catch(err => console.log(err))
							})
							
						}).catch(err => console.log(err))
					}).catch(err => console.log(err))
				}).catch(err => console.log(err)) // END gt
			}).catch(err => console.log(err)) // END t
		}
	}
	if (!xhr) res.redirect(referer)
	else res.status(200).json({ status: 200, message: 'Successfully saved.' })
}