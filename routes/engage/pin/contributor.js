const { safeArr, DEFAULT_UUID } = include('routes/helpers/')
const { modules, DB } = include('config/')

exports.pin = (req, res) => {
	const { uuid, collaborators } = req.session || {}
	const { board_id, board_title, object_id } = req.body || {}

	const module_rights = modules.find(d => d.type === 'contributors')?.rights
	const collaborators_ids = safeArr(collaborators.map(d => d.uuid), uuid ?? DEFAULT_UUID) //.filter(d => d.rights >= (module_rights?.write ?? Infinity)).map(d => d.uuid)

	if (!board_id) { // CREATE NEW TEAM
		if (board_title?.trim().length > 0) {
			return DB.general.tx(t => {
				return t.oneOrNone(`
					INSERT INTO teams (name, host)
					VALUES ($1, $2)
					RETURNING id
				;`, [ board_title, uuid ])
				.then(result => {
					if (result) return result
					else return t.one(`
						SELECT id FROM teams
						WHERE name = $1
							AND host = $2
					;`, [ board_title, uuid ])
				}).then(result => {
					const { id } = result
					const batch = []

					// BY DEFAULT, ADD THE TEAM CREATOR TO THE TEAM
					batch.push(t.none(`
						INSERT INTO team_members (team, member)
						VALUES ($1::INT, $2)
					;`, [ id, uuid ]))

					batch.push(
						t.none(insertmember(id, object_id))
						.catch(err => console.log(err))
					)

					return t.batch(batch)
					.then(_ => {
						const batch = []
						batch.push(t.any(retrievepins(object_id)))
						batch.push(t.any(retrievepinboards(collaborators_ids)))
						return t.batch(batch)
					}).catch(err => console.log(err))
				}).catch(err => {
					// IF THE TEAM NAME ALREADY EXISTS, SEND FEEDBACK
					console.log(err)
				})
			}).then(results => {
				const [ pins, pinboards_list ] = results
				res.json({ status: 200, message: 'Successfully created pinboard and added pad.', pins, pinboards_list })
			}).catch(err => console.log(err))
		} else res.json({ status: 400, message: 'You need to create a title for a new pinboard.' })
	} else { // SIMPLY ADD PAD TO BOARD
		if (object_id) {
			return DB.general.tx(t => {
				return t.none(insertmember(board_id, object_id))
				.then(_ => {
					const batch = []
					batch.push(t.any(retrievepins(object_id)))
					batch.push(t.any(retrievepinboards(collaborators_ids)))
					return t.batch(batch)
				})
				.catch(err => console.log(err))
			}).then(results => {
				const [ pins, pinboards_list ] = results
				console.log(results)
				res.json({ status: 200, message: 'Successfully created pinboard and added pad.', pins, pinboards_list })
			}).catch(err => console.log(err))
		} else res.json({ status: 400, message: 'You are not adding a pad.' })
	}
}

exports.unpin = (req, res) => {
	const { uuid, collaborators } = req.session || {}
	const { board_id, object_id } = req.body || {}

	const module_rights = modules.find(d => d.type === 'contributors')?.rights
	const collaborators_ids = safeArr(collaborators.map(d => d.uuid), uuid ?? DEFAULT_UUID) //.filter(d => d.rights >= (module_rights?.write ?? Infinity)).map(d => d.uuid)

	if (object_id) {
		return DB.general.tx(t => {
			return t.none(removemember(board_id, object_id))
			.then(_ => {
				return t.none(`
					DELETE FROM teams
					WHERE id = $1::INT
						AND (SELECT COUNT (member) FROM team_members WHERE team = $1::INT) = 1
						AND (SELECT member FROM team_members WHERE team = $1::INT) = $2
						AND host = $2
				;`, [ board_id, uuid ])
			}).then(_ => {
				const batch = []
				batch.push(t.any(retrievepins(object_id)))
				batch.push(t.any(retrievepinboards(collaborators_ids)))
				return t.batch(batch)
			})
		}).then(results => {
			const [ pins, pinboards_list ] = results
			res.json({ status: 200, message: 'Successfully created pinboard and added pad.', pins, pinboards_list })
		}).catch(err => console.log(err))
	} else res.json({ status: 400, message: 'You are not removing a pad.' })
}


function insertmember (_id, _object_id) {
	if (_object_id) {
		return DB.pgp.as.format(`
			INSERT INTO team_members (team, member)
			VALUES ($1::INT, $2)
		;`, [ _id, _object_id ]) // _object_id SHOULD BE uuid
	}
}
function removemember (_id, _object_id) {
	if (_object_id) {
		return DB.pgp.as.format(`
			DELETE FROM team_members
			WHERE team = $1::INT
				AND member = $2
		;`, [ _id, _object_id ])
	}
}
function retrievepins (_object_id) {
	return DB.pgp.as.format(`
		SELECT t.id, t.name AS title, FALSE AS is_exploration FROM teams t
		INNER JOIN team_members tm
			ON tm.team = t.id
		WHERE tm.member = $1
	;`, [ _object_id ])
}
function retrievepinboards (_hosts) {
	return DB.pgp.as.format(`
		SELECT t.id, t.name AS title, COALESCE(COUNT (DISTINCT (tm.member)), 0)::INT AS count, FALSE AS is_exploration FROM teams t
		INNER JOIN team_members tm
			ON tm.team = t.id
		WHERE t.host IN ($1:csv)
		GROUP BY t.id
	;`, [ safeArr(_hosts, DEFAULT_UUID) ])
}
