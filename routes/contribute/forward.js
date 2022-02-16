const DB = require('../../db-config.js')
const { followup_count } = require('../../config.js')

exports.main = (req, res) => {
	const { referer } = req.headers || {}
	const { object } = req.params || {}
	const { id, mobilization } = req.query || {}
	if (object === 'pad') {
		// THIS SOLUTION IS TAKEN FROM https://dba.stackexchange.com/questions/122120/duplicate-row-with-primary-key-in-postgresql
		console.log(`forwarding ${id}`)
		DB.conn.tx(t => {
			return t.one(`
				SELECT COUNT(p.id) FROM mobilization_contributions mc
				INNER JOIN pads p
					ON p.id = mc.pad
				WHERE mc.mobilization = $1
				AND p.source = $2
			`, [mobilization, id], d => d.count)
			.then(duplicates => {
				// TO DO: MAYBE FEEDBACK HERE
				if (duplicates >= followup_count) return null
				else {
					return t.one(`
						INSERT INTO pads
						SELECT (p1).* FROM (
							SELECT p #= hstore('id', nextval(pg_get_serial_sequence('pads', 'id'))::text) AS p1
							FROM pads p WHERE id = $1
						) subquery
						RETURNING id
					;`, [id])
					.then(result => {
						const batch = []
						batch.push(t.none(`
							UPDATE pads
							SET date = NOW(),
								status = 1,
								source = $1
							WHERE id = $2
						;`, [id, result.id]))
						batch.push(t.none(`
							INSERT INTO mobilization_contributions (pad, mobilization)
							VALUES ($1, $2)
						;`, [result.id, mobilization]))
						return t.batch(batch)
					})
				}
			})
		})
		.then(_ => res.redirect(referer))
		.catch(err => console.log(err))	
	}
}