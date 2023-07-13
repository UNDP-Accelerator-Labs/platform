const { modules, DB, ownDB } = include('config/')
const { safeArr, DEFAULT_UUID } = include('routes/helpers')

exports.pin = (req, res) => {
	const { uuid, collaborators } = req.session || {}
	const { board_id, board_title, object_id, mobilization } = req.body || {}

	const collaborators_ids = safeArr(collaborators.map(d => d.uuid), uuid ?? DEFAULT_UUID)

	if (!board_id) { // CREATE NEW BOARD
		if (board_title?.trim().length > 0) {
			return DB.general.tx(gt => {
				return gt.oneOrNone(`
					INSERT INTO pinboards (title, owner)
					VALUES ($1, $2)
					ON CONFLICT ON CONSTRAINT unique_pinboard_owner
						DO NOTHING
					RETURNING id
				;`, [ board_title, uuid ])
				.then(result => {
					if (result) return result
					else return gt.one(`
						SELECT id FROM pinboards
						WHERE title = $1
							AND owner = $2
					;`, [ board_title, uuid ])
				}).then(async result => {
					const { id } = result
					const ownId = await ownDB();
					const batch = []

					batch.push(gt.none(`
						INSERT INTO pinboard_contributors (pinboard, participant)
						VALUES ($1::INT, $2)
						ON CONFLICT ON CONSTRAINT pinboard_contributors_pkey
							DO NOTHING
					;`, [ id, uuid ]))

					batch.push(
						gt.none(insertpads(id, object_id, mobilization, ownId))
						.then(async _ => gt.none(await updatestatus(id, object_id, mobilization, ownId)))
						.catch(err => console.log(err))
					)

					await gt.batch(batch);
					const rbatch = [];
					rbatch.push(id)
					rbatch.push(gt.any(retrievepins(object_id, ownId)))
					// rbatch.push(gt.any(retrievepinboards(collaborators_ids, ownId)))
					rbatch.push(gt.any(retrievepinboards([ uuid ], ownId)))
					return gt.batch(rbatch);
				}).catch(err => console.log(err))
			}).then(results => {
				const [ id, pins, pinboards_list ] = results
				res.json({ status: 200, message: 'Successfully created pinboard and added pad.', board_id: id, pins, pinboards_list })
			}).catch(err => console.log(err))
		} else res.json({ status: 400, message: 'You need to create a title for a new pinboard.' })
	} else { // SIMPLY ADD PAD TO BOARD
		if (object_id) {
			return DB.general.tx(gt => {
				return ownDB().then(async ownId => {
					await gt.none(insertpads(board_id, object_id, mobilization, ownId));
					await gt.none(await updatestatus(board_id, object_id, mobilization, ownId));
					const batch = [];
					batch.push(gt.any(retrievepins(object_id, ownId)))
					// batch.push(gt.any(retrievepinboards(collaborators_ids, ownId)))
					batch.push(gt.any(retrievepinboards([ uuid ], ownId)))
					return gt.batch(batch)
				}).then(results => {
					const [ pins, pinboards_list ] = results
					res.json({ status: 200, message: 'Successfully added pad.', board_id, pins, pinboards_list })
				}).catch(err => console.log(err));
			}).catch(err => console.log(err));
		} else res.json({ status: 400, message: 'You are not adding a pad.' })
	}
}

exports.unpin = (req, res) => {
	const { uuid, collaborators } = req.session || {}
	const { board_id, object_id, mobilization } = req.body || {}

	const collaborators_ids = safeArr(collaborators.map(d => d.uuid), uuid ?? DEFAULT_UUID)

	if (object_id) {
		return DB.general.tx(gt => {
			ownDB().then(async ownId => {
				await gt.none(removepads(board_id, object_id, mobilization, uuid, ownId));
				await gt.none(await updatestatus(board_id, object_id, mobilization, ownId));
				await gt.none(`
					DELETE FROM pinboards
					WHERE id = $1::INT
						AND (SELECT COUNT (pad) FROM pinboard_contributions WHERE pinboard = $1::INT AND db = $3) = 0
						-- AND owner IN ($2:csv)
						AND owner = $2
				;`, [ board_id, uuid /* collaborators_ids */, ownId ])
				const batch = []
				batch.push(gt.any(retrievepins(object_id, ownId)));
				// batch.push(gt.any(retrievepinboards(collaborators_ids, ownId)))
				batch.push(gt.any(retrievepinboards([ uuid ], ownId)));
				return gt.batch(batch);
			})
		}).then(results => {
			const [ pins, pinboards_list ] = results
			res.json({ status: 200, message: 'Successfully created pinboard and added pad.', pins, pinboards_list })
		}).catch(err => console.log(err))
	} else res.json({ status: 400, message: 'You are not removing a pad.' })
}


function insertpads (_id, _object_id, _mobilization, ownId) {
	if (_object_id) {
		if (!Array.isArray(_object_id)) _object_id = [_object_id]
		const data = _object_id.map(d => {
			const obj = {}
			obj.pinboard = _id
			obj.pad = d
			obj.db = ownId
			return obj
		})
		const insert = DB.pgp.helpers.insert(data, ['pinboard', 'pad', 'db'], 'pinboard_contributions')
		const constraint = DB.pgp.as.format(`ON CONFLICT ON CONSTRAINT pinboard_contributions_pkey DO NOTHING`)
		return `${insert} ${constraint}`

	} else if (_mobilization) {
		return DB.pgp.as.format(`
			UPDATE pinboards
			SET mobilization = $1::INT, mobilization_db = $3
			WHERE id = $2::INT
		;`, [ _mobilization, _id, ownId ])
	}
}
function removepads (_id, _object_id, _mobilization, _uuid, ownId) {
	if (_object_id) {
		return DB.pgp.as.format(`
			DELETE FROM pinboard_contributions
			WHERE pinboard = $1::INT
				AND pad IN ($2:csv)
				AND pinboard IN (
					SELECT id FROM pinboards
					WHERE owner = $3
				)
				AND db = $4
		;`, [ _id, safeArr(_object_id, -1), _uuid, ownId ])
	} else if (_mobilization) {
		return DB.pgp.as.format(`
			UPDATE pinboards
			SET mobilization = NULL
			WHERE id = $1::INT
				AND owner = $2
		;`, [ _id, _uuid ])
	}
}
async function updatestatus(_id, _object_id, _mobilization, ownId) {
	if (_object_id) {
		const pads = (await DB.general.any(`
			SELECT pc.pad AS pad
			FROM pinboard_contributions pc
			WHERE pc.db = $2 AND pc.pinboard = $1
		`, [ _id, ownId ])).map((row) => row.pad);
		const status = await DB.conn.one(`
			SELECT
				LEAST ((SELECT COALESCE(MAX (p.status), 0) FROM pads p
				WHERE p.id IN ($1:csv)), 1) AS status
		`, [ safeArr(pads, -1) ]).status;
		return DB.pgp.as.format(`
			UPDATE pinboards
			SET status = (SELECT GREATEST ($2, status))
			WHERE id = $1::INT
		;`, [ _id, status ])
	} else if (_mobilization) { // TO DO: CHECK WHETHER THIS WORKS
		const mobs = (await DB.general.any(`
			SELECT pin.mobilization
			FROM pinboards pin
			WHERE pin.id = $1 AND pin.mobilization_db = $2
		`, [ _id, ownId ])).map((row) => row.mobilization);
		const status = await DB.conn.one(`
			SELECT MAX (p.status) AS status FROM pads p
			INNER JOIN mobilization_contributions mc
				ON mc.pad = p.id
			WHERE mc.mobilization IN (mobs)
		`, [ mobs ]).status;
		return DB.pgp.as.format(`
			UPDATE pinboards
			SET status = $2
			WHERE id = $1::INT
		;`, [ _id, status ]);
	}
}
function retrievepins (_object_id, ownId) {
	return DB.pgp.as.format(`
		SELECT pb.id, pb.title FROM pinboards pb
		INNER JOIN pinboard_contributions pbc
			ON pbc.pinboard = pb.id
		WHERE pbc.pad IN ($1:csv) AND pbc.db = $2
	;`, [ safeArr(_object_id, -1), ownId ])
}
function retrievepinboards (_owners, ownId) {
	return DB.pgp.as.format(`
		SELECT p.id, p.title, COALESCE(COUNT (DISTINCT (pc.pad)), 0)::INT AS count FROM pinboards p
		INNER JOIN pinboard_contributions pc
			ON pc.pinboard = p.id
		WHERE p.owner IN ($1:csv) AND pc.db = $2
		GROUP BY p.id
	;`, [ safeArr(_owners, DEFAULT_UUID), ownId ])
}
