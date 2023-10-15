const { modules, map, DB } = include('config/')
const { checklanguage, array, geo } = include('routes/helpers/')

module.exports = (req, res) => {
	const { id, ...data } = req.body || {}
	let { pinboard, section_type, countries, templates, mobilizations } = data

	const language = checklanguage(req.params?.language || req.session.language)

	// const sql = DB.pgp.helpers.sets(data)

	console.log(id)
	console.log(data)

	if (id) {
		// UPDATE
	} else {
		// INSERT
		if (section_type === 'single') {
			DB.conn.one(`
				INSERT INTO pinboard_sections (pinboard, title, description)
				VALUES ()
			;`)
		} else {
			// BASED ON PLATFORM FILTERS
			// 1) GET LIST OF PAD ids ACCORDING TO EACH FILTER FOR THOSE IN pinboard_contributions
			// 2) GET FILTER NAME
			// 3) CREATE pinboard_sections RETURNIN id
			// 4) UPDATE pinboard_contributions SET section

			DB.general.tx(gt => {
				return DB.conn.tx(t => {
					const gbtach = []
					
					// let sections = []
					// if (modules.some(d => d.type === 'countries') && countries) {

					// } else if (modules.some(d => d.type === 'templates') && templates) {
					// 	sections = templates
					// } else if (modules.some(d => d.type === 'mobilizations') && mobilizations) {
					// 	sections = mobilizations
					// }

					// const insert_sections = DB.pgp.helpers.insert(sections, [ '' ], 'pinboard_sections')



					// gbtach.push(gt.any(`
					// 	INSERT INTO pinboard_sections (pinboard, title, description)
					// 	VALUES ($1::INT, $2, $3)
					// ;`, [ pinboard,  ]))

					return gt.any(`
						SELECT pad FROM pinboard_contributions
						WHERE pinboard = $1
					;`, [ pinboard ])
					.then(async pads => {
						pads = pads.map(d => d.pad)
						const batch = []

						if (map && countries) {
							if (!Array.isArray(countries)) countries = [countries]
							const name_column = await geo.adm0.name_column({ connection: gt, language })

							batch.push('countries')

							batch.push(t.any(`
								SELECT p.id, l.iso3 FROM pads p
								INNER JOIN locations l
									ON l.pad = p.id
								WHERE p.id IN ($1:csv)
									AND l.iso3 IN ($2:csv)
							;`, [ pads, countries ]))

							// GET COLUMN NAME FOR COUNTRY NAME IN CURRENT LANGUAGE
							batch.push(gt.any(`
								SELECT $1:name AS title, su_a3 AS iso3, ''::TEXT AS description, $2::INT AS pinboard
								FROM adm0_subunits
								WHERE su_a3 IN ($3:csv)
									AND su_a3 <> adm0_a3
							;`, [ name_column, pinboard, countries ]) // TO DO: GET COLUMN NAME WHEN MERGED WITH LOCATIONS BRANCH
							.then(su => {
								return gt.any(`
									SELECT $1:name AS title, adm0 AS iso3, ''::TEXT AS description, $2::INT AS pinboard
									FROM adm0
									WHERE adm0_a3 IN ($3:csv)
								;`, [ name_column, pinboard, countries ])
								.then(adm => {
									return array.nest.call(su.concat(adm), { key: 'title', keyname: 'title', keep: [ 'description', 'pinboard' ] })
								}).catch(err => console.log(err))
							}).catch(err => console.log(err)))

						} else if (modules.some(d => d.type === 'templates') && templates) {
							if (!Array.isArray(templates)) templates = [templates]

							batch.push('templates')

							batch.push(t.any(`
								SELECT p.id FROM pads p
								WHERE p.id IN ($1:csv)
									AND p.template IN ($2:csv)
								}
							;`, [ pads, templates ])) // TO DO: MAKE SURE TO ACCOUNT FOR PADS THAT HAVE NO TEMPLATE

							batch.push(t.any(`
								SELECT title, description, $1::INT AS pinboard FROM templates
								WHERE id IN ($2:csv)
							;`, [ pinboard, templates ]))

						} else if (modules.some(d => d.type === 'mobilizations') && mobilizations) {
							if (!Array.isArray(mobilizations)) mobilizations = [mobilizations]

							batch.push('mobilizations')

							batch.push(t.any(`
								SELECT p.id FROM pads p
								INNER JOIN mobilization_contributions mc
									ON mc.pad = p.id
								WHERE p.id IN ($1:csv)
									AND mc.mobilization IN ($2:csv)
							;`, [ pads, mobilizations ]))

							batch.push(t.any(`
								SELECT title, description, $1::INT AS pinboard FROM mobilizations
								WHERE id IN ($2:csv)
							;`, [ pinboard, mobilizations ]))
						} else res.redirect('/module-error')

						return t.batch(batch)
						.then(results => {
							const [ type, section_pads, sections ] = results
							
							if (type === 'countries') insert_sections = `${DB.pgp.helpers.insert(sections, [ 'title', 'description', 'pinboard' ], 'pinboard_sections')} RETURNING id, title`
							else insert_sections = `${DB.pgp.helpers.insert(sections, [ 'title', 'description', 'pinboard' ], 'pinboard_sections')} RETURNING id`

							return gt.any(insert_sections)
							.then(ids => {
								console.log(ids)
								// RETURN THE INSERT FIRST TO GET THE id, AND INSERT IT INTO pinboard_contribution.section FOR EACH pad.id
								let update_pinboard_contributions = ''

								if (map && countries) {
									
									// UPDATE section IN pinboard_contribution

								} else {

								}
							})
							
						}).catch(err => console.log(err))

					}).catch(err => console.log(err))
				
				}).catch(err => console.log(err)) // END gt
			}).catch(err => console.log(err)) // END t
		}

	}

	// DB.general.one(`
	// 	UPDATE pinboards
	// 	SET $1:raw
	// 	WHERE id = $2::INT
	// 	RETURNING id, title, description
	// ;`, [ sql, id ])
	// .then(datum => {
	// 	res.json({ status: 200, message: 'Successfully saved.', datum })
	// }).catch(err => console.log(err))
}