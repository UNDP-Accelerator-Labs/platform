const { modules, DB } = include('config/')

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
					.then(pads => {
						pads = pads.map(d => d.id)
						const batch = []

						let sql = ''
						if (modules.some(d => d.type === 'countries') && countries) {
							if (!Array.isArray(countries)) countries = [countries]

							batch.push(t.any(`
								SELECT p.id, l.iso3 FROM pads p
								INNER JOIN locations l
									ON l.pad = p.id
								WHERE p.id IN ($1:csv)
									AND l.iso3 IN ($2:csv)
							;`, [ pads, countries ]))

							// GET COLUMN NAME FOR COUNTRY NAME IN CURRENT LANGUAGE
							batch.push(gt.any(`
								SELECT $1:name AS title, su_a3 AS iso3
								FROM adm0_subunits
								WHERE su_a3 IN ($2:csv)
									AND su_a3 <> adm0_a3
							;`, [ column_name, countries ]) // TO DO: GET COLUMN NAME WHEN MERGED WITH LOCATIONS BRANCH
							.then(su => {
								return gt.any(`
									SELECT $1:name AS title, adm0 AS iso3
									FROM adm0
									WHERE adm0_a3 IN ($2:csv)
								;`, [ column_name, countries ])
								.then(adm => {
									return array.nest.call(su.concat(adm), { key: 'title' })
								}).catch(err => console.log(err))
							}).catch(err => console.log(err)))

						} else if (modules.some(d => d.type === 'templates') && templates) {
							if (!Array.isArray(templates)) templates = [templates]

							batch.push(t.any(`
								SELECT p.id FROM pads p
								WHERE p.id IN ($1:csv)
									AND p.template IN ($2:csv)
								}
							;`, [ pads, templates ])) // TO DO: MAKE SURE TO ACCOUNT FOR PADS THAT HAVE NO TEMPLATE

							batch.push(t.any(`
								SELECT title, description FROM templates
								WHERE id IN ($1:csv)
							;`, [ templates ]))

						} else if (modules.some(d => d.type === 'mobilizations') && mobilizations) {
							if (!Array.isArray(mobilizations)) mobilizations = [mobilizations]

							batch.push(t.any(`
								SELECT p.id FROM pads p
								INNER JOIN mobilization_contributions mc
									ON mc.pad = p.id
								WHERE p.id IN ($1:csv)
									AND mc.mobilization IN ($2:csv)
							;`, [ pads, mobilizations ]))

							batch.push(t.any(`
								SELECT title, description FROM mobilizations
								WHERE id IN ($1:csv)
							;`, [ mobilizations ]))
						}

						return t.batch(batch)
						.then(results => {
							const [ section_pads, sections ] = results
							


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