const { modules, ownDB, DB } = include('config/')
const { checklanguage, join, datastructures, safeArr, DEFAULT_UUID } = include('routes/helpers/')

module.exports = (req, res) => {
	const { object } = req.params || {}
	const { id, public, source, copy, child, pinboard } = req.query || {}
	const { uuid, rights, collaborators } = req.session || {}
	const language = checklanguage(req.params?.language || req.session.language)

	const module_rights = modules.find(d => d.type === 'mobilizations')?.rights
	const collaborators_ids = safeArr(collaborators.map(d => d.uuid), uuid ?? DEFAULT_UUID) //.filter(d => d.rights >= (module_rights?.write ?? Infinity)).map(d => d.uuid)

	DB.conn.tx(async t => {
		const batch = []

		// COHORT
		if (public) { // NO NEED FOR A COHORT
			batch.push(null)
		} else { // DETERMINE WHAT TYPE OF COHORT IS NEEDED
			// child IS FOR CHAINING MOBILIZATIONS (IF A GLOBAL CALL IS MADE, MAPPERS CAN MAKE THEIR OWN CALLS AND TIE IT TO THE MAIN CALL)
			if (source && copy !== 'true' && child !== 'true') { // THIS IS A FOLLOW UP OF A PERVIOUS MOBILIZATION
				// SO WE WANT TO KEEP AT MOST THE SAME participants
				batch.push(t.task(t1 => {
					return t1.one(`SELECT public FROM mobilizations WHERE id = $1::INT;`, [ source ], d => d.public)
					.then(result => {
						if (result === true) { // THE SOURCE IS A PUBLIC MOBILIZATION
							// SO THERE IS NO NEED FOR A COHORT
							return null
						} else {
							return t1.any(`
								SELECT participant AS id FROM mobilization_contributors
								WHERE mobilization = $1::INT
									AND participant <> $2
							;`, [ source, uuid ])
							.then(async results => {
								const data = await join.users(results, [ language, 'id' ])
								data.sort((a, b) => a.country?.localeCompare(b.country))
								return data
							}).catch(err => console.log(err))
						}
					})
				}).catch(err => console.log(err)))
			} else if (pinboard) {
				batch.push(ownDB().then(async ownId => {
					const padlist = (await DB.general.any(`
						SELECT pc.pad FROM pinboard_contributions pc
						WHERE pc.pinboard = $1 AND pc.db = $2 AND pc.is_included = true
					;`, [ pinboard, ownId ])).map((row) => row.pad);
					const results = await t.any(`
						SELECT DISTINCT (p.owner) AS id FROM pads p WHERE p.id IN ($1:csv)
					`, [ safeArr(padlist, -1) ]);
					const data = await join.users(results, [ language, 'id' ])
					data.sort((a, b) => a.country?.localeCompare(b.country))

					let { write } = modules.find(d => d.type === 'pads')?.rights
					if (typeof write === 'object') write = Math.min(write.blank ?? Infinity, write.templated ?? Infinity)
					console.log('check write', write)

					return data.filter(d => d.rights >= write)
					// TO DO: NEW write STRUCTURE
					// THIS IS IN THE CASE OF A DEEP DIVE CAMPAIGN, IDENTIFY USERS WHO STILL HAVE AUTHORING RIGHTS
				}).catch(err => console.log(err)))
			} else {
				if (rights < 3) { // IF THE USER/ HOST IS NOT A sudo ADMIN
					batch.push(DB.general.any(`
						SELECT u.uuid AS id FROM users u
						INNER JOIN cohorts c
							ON c.contributor = u.uuid
						WHERE c.host = $1
					;`, [ uuid ])
					.then(async results => {
						const data = await join.users(results, [ language, 'id' ])
						data.sort((a, b) => a.country?.localeCompare(b.country))
						return data
					}).catch(err => console.log(err)))
				} else { // THE USER IS A sudo ADMIN
					batch.push(DB.general.any(`
						SELECT uuid AS id FROM users
					;`).then(async results => {
						const data = await join.users(results, [ language, 'id' ])
						data.sort((a, b) => a.country?.localeCompare(b.country))
						return data
					}).catch(err => console.log(err)))
				}
			}
		}

		// TEMPLATE
		// GET FROM THE query WHETHER THIS IS A COPY:
		// IF IT IS A COPY, THEN GET ONLY THE TEMPLATE USED IN THE source
		if (copy === 'true') {
			batch.push(t.one(`
				SELECT id FROM templates
				WHERE id IN (SELECT template FROM mobilizations WHERE id = $1::INT)
			;`, [ source ]))
		} else {
			batch.push(t.any(`
				SELECT t.id, t.title, t.status, t.owner,
					COALESCE(ce.count, 0)::INT AS applications
				FROM templates t

				LEFT JOIN (
					SELECT COUNT (id), template FROM mobilizations
					GROUP BY template
				) ce ON ce.template = t.id

				WHERE ((t.owner IN ($1:csv) OR $2 > 2) AND t.status >= 1)
					OR t.status = 2
			;`, [ collaborators_ids, rights ])
			.then(async results => {
				const data = await join.users(results, [ language, 'owner' ])
				return data
			}))
		}

		// SOURCE INFO
		if (source) { // THIS IS EITHER A FOLLOW UP OR A COPY
			// SO WE COLLECT SOME BASIC INFO ABOUT THE SOURCE
			batch.push(t.one(`
				SELECT title, language, description, public FROM mobilizations
				WHERE id = $1::INT
			;`, [ source ]))
		} else batch.push(null)

		// MOBILIZATION INFO
		if (!id) {
			batch.push(null) // THIS IS A NEW MOBILIZATION
		} else {
			batch.push(t.one(`
				SELECT m.id, m.title, m.language, m.description, m.public,
					jsonb_agg(mc.participant) AS active_participants
				FROM mobilizations m
				INNER JOIN mobilization_contributors mc
					ON mc.mobilization = m.id
				WHERE m.id = $1::INT
				GROUP BY m.id
			;`, [ id ]))
		}

		return t.batch(batch)
		.then(async results => {
			const [ cohort, templates, sourceinfo, data ] = results

			const metadata = await datastructures.pagemetadata({ connection: t, req })
			return Object.assign(metadata, { cohort, templates, sourceinfo, data })
		})
	}).then(data => res.status(200).render('mobilization-new', data)) // CHANGE THE NAME TO MOBILIZATION
	.catch(err => console.log(err))
}
