const { DB } = include('config/')

module.exports = (req, res) => {
	const { id, source, completion } = req.body || {}
	if (req.body?.sections) req.body.sections = JSON.stringify(req.body.sections)

	const { uuid } = req.session || {}

	if (!id) { // INSERT OBJECT
		// INSPIRED BY https://stackoverflow.com/questions/38750705/filter-object-properties-by-key-in-es6
		const insert = Object.keys(req.body)
			.filter(key => !['id', 'completion', 'deletion', 'mobilization', 'tagging', 'locations', 'metadata'].includes(key))
			.reduce((obj, key) => {
				obj[key] = req.body[key]
				return obj
			}, {})

		var saveSQL = DB.pgp.as.format(`
			INSERT INTO pads ($1:name, owner)
			VALUES ($1:csv, $2)
			RETURNING id
		;`, [ insert, uuid ])
	} else { // UPDATE OBJECT
		const condition = DB.pgp.as.format(` WHERE id = $1::INT;`, [ id ])
		var saveSQL = DB.pgp.helpers.update(req.body, Object.keys(req.body).filter(d => !['id', 'completion', 'deletion', 'mobilization', 'tagging', 'locations', 'metadata'].includes(d)), 'pads') + condition
	}

	DB.conn.tx(t => {
		console.log('update start ')
		return t.oneOrNone(saveSQL)
		.then(result => {
			const newID = result ? result.id : undefined
			const batch = []

			// UPDATE THE REVIEW REQUEST
			batch.push(t.none(`
				UPDATE pads SET update_at = NOW() WHERE id = $1::INT
			;`, [ newID || id]))


			// UPDATE STATUS
			batch.push(t.one(`
				SELECT status FROM pads
				WHERE id = $1::INT
			;`, [ newID || id ], d => d.status)
			.then(status => {
				if (completion) status = Math.max(Math.max(1, status), 2) // REVIEWS ARE ALWAYS INTERNAL
				else status = 0

				return t.task(t1 => {
					const batch1 = []

					// SAVE STATUS FOR PAD
					batch1.push(t1.none(`
						UPDATE pads SET status = $1::INT
						WHERE id = $2::INT
					;`, [ status, newID || id ]))

					if (!id) { // INSERT NEW REVIEW
						// SAVE STATUS FOR REVIEW INSTANCE
						batch1.push(t1.none(`
							INSERT INTO reviews (pad, reviewer, review, status)
							SELECT $1, $2, $3, $4
						;`, [ source, uuid, newID || id, status ]))
					} else {
						// SAVE STATUS FOR REVIEW INSTANCE
						batch1.push(t1.none(`
							UPDATE reviews
							SET status = $1::INT
							WHERE pad = $2::INT
								AND review = $3
						;`, [ status, source, newID || id ]))
					}

					return t1.batch(batch1)
					.then(_ => status)
					.catch(err => console.log(err))
				}).catch(err => console.log(err))
			}).catch(err => console.log(err)))

			return t.batch(batch)
			.then(results => {
				const status = results[results.length - 1]
				return { id: newID, status }
			}).catch(err => console.log(err))
		}).catch(err => console.log(err))
	}).then(data => {
		res.json({ status: 200, message: 'Successfully saved.', data })
	}).catch(err => console.log(err))
}
