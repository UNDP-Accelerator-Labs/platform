const { followup_count, DB } = include('config')

exports.main = (req, res) => {
	const { referer } = req.headers || {}
	const { id, mobilization } = req.query || {}

	// THIS SOLUTION IS TAKEN FROM https://dba.stackexchange.com/questions/122120/duplicate-row-with-primary-key-in-postgresql
	DB.conn.tx(t => {
		return t.one(`
			SELECT COUNT(p.id) FROM mobilization_contributions mc
			INNER JOIN pads p
				ON p.id = mc.pad
			WHERE mc.mobilization = $1::INT
			AND p.source = $2::INT
		`, [ mobilization, id ], d => d.count)
		.then(duplicates => {
			// TO DO: MAYBE FEEDBACK HERE
			if (duplicates >= followup_count) return null
			else {
				return t.one(`
					INSERT INTO pads
					SELECT (p1).* FROM (
						SELECT p #= hstore('id', nextval(pg_get_serial_sequence('pads', 'id'))::text) AS p1
						FROM pads p WHERE id = $1::INT
					) subquery
					RETURNING id
				;`, [ id ])
				.then(result => {
					const batch = []
					batch.push(t.none(`
						UPDATE pads
						SET date = NOW(),
							status = 1,
							source = $1::INT
						WHERE id = $2::INT
					;`, [ id, result.id ]))
					// TO DO: AT SOME POINT, RECONSIDER FORWARDING IN DISTRIBUTED MOBILIZATIONS
					batch.push(t.none(`
						INSERT INTO mobilization_contributions (pad, mobilization)
						VALUES ($1::INT, $2::INT)
					;`, [ result.id, mobilization ]))
					return t.batch(batch)
				})
			}
		})
	})
	.then(_ => res.redirect(referer))
	.catch(err => console.log(err))	
}