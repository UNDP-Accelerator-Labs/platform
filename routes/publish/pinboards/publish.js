const { DB } = include('config')

exports.main = (req, res) => {
	const { referer } = req.headers || {}
	const { id, limit, status } = req.query || {}
	const { uuid, rights, collaborators } = req.session || {}

	let collaborators_ids = collaborators.filter(d => d.rights > 0).map(d => d.uuid)
	if (!collaborators_ids.length) collaborators_ids = [null]

	// EXECUTE SQL
	DB.conn.tx(t => {
		const batch = []

		if (status) {
			if (id) {
				batch.push(t.none(`
					UPDATE pinboards
						SET status = $1::INT
					WHERE id = $2::INT
						AND status >= 1
						AND (owner IN ($3:csv)
							OR $4 > 2)
				;`, [ status, id, collaborators_ids, rights ]))
			} else { // PUBLISH ALL
				// THIS SHOULD NOT HAPPEN FOR pinboards
				batch.push(t.none(`
					UPDATE pinboards
						SET status = $1::INT
					WHERE id IN (
						SELECT id FROM pinboards
						WHERE status >= 1 
							AND (owner IN ($2:csv)
							OR $3 > 2)
						LIMIT $4
					)
				;`, [ status, collaborators_ids, rights, limit ]))
			}
		}

		return t.batch(batch)
		.then(_ => res.redirect(referer))
		.catch(err => console.log(err))
	})
}