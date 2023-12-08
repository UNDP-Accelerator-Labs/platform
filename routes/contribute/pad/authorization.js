const { followup_count, modules, DB } = include('config/')
const { safeArr, DEFAULT_UUID } = include('routes/helpers/')

module.exports = async _kwargs => {
	const conn = _kwargs.connection || DB.conn
	const { id, template, mobilization, source, uuid, rights, collaborators, public } = _kwargs

	const { rights: modulerights, publish } = modules.find(d => d.type === 'pads') || {}
	let { read, write } = modulerights || {}
	
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
				SELECT TRUE AS bool, status FROM pads
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
				if (result?.bool) {
					if (!(publish === 'def' && result.status >= 2)) return { authorized: true, redirect: 'edit' }
					else return { authorized: true, redirect: 'view' }
				} else return { authorized: rights >= read, redirect: 'view' }
			}).catch(err => console.log(err))
		else return conn.task(t => {
			const batch = []
			if (mobilization) {
				// CHECK IF THE USER IS ALLOWED TO CONTRIBUTE TO THE MOBILIZATION
				// OTHREWISE REDIRECT
				batch.push(t.oneOrNone(`
					SELECT CASE WHEN
						(SELECT DISTINCT (participant) 
							FROM mobilization_contributors 
							WHERE mobilization = $1::INT 
								AND participant = $2
						) IS NOT NULL
							OR $3 > 2
						THEN TRUE
						ELSE (SELECT public FROM mobilizations WHERE id = $1::INT)
					END AS bool
				;`, [ mobilization, uuid, rights ], d => d.bool))

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
					;`, [ mobilization, source ], d => d.count))
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