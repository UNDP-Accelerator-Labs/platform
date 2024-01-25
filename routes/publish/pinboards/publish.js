const { modules, DB } = include('config/')
const { safeArr, DEFAULT_UUID, redirectUnauthorized } = include('routes/helpers/')

module.exports = (req, res) => {
	const { referer } = req.headers || {}
	const { id, limit, status } = req.query || {}
	const { uuid, rights, collaborators } = req.session || {}

	const module_rights = modules.find(d => d.type === 'pinboards')?.rights
	const collaborators_ids = safeArr(collaborators.map(d => d.uuid), uuid ?? DEFAULT_UUID) //.filter(d => d.rights >= (module_rights?.write ?? Infinity)).map(d => d.uuid)

	// EXECUTE SQL
	DB.conn.tx(t => {
		const batch = []

		if (status) {
			if (id) {
				batch.push(DB.general.none(`
					UPDATE pinboards
						SET status = $1::INT
					WHERE id = $2::INT
						AND status >= 1
						AND (owner IN ($3:csv)
							OR $4 > 2)
				;`, [ status, id, collaborators_ids, rights ]))
			} else { // PUBLISH ALL
				// THIS SHOULD NOT HAPPEN FOR pinboards
				batch.push(DB.general.none(`
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
		.then(_ => {
			if (referer) res.redirect(referer)
			else redirectUnauthorized(req, res)
		}).catch(err => console.log(err))
	})
}
