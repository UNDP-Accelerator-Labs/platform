const { DB } = require('../../../config')

const role = process.argv[2]

DB.general.any(`
	SELECT uuid FROM users
	WHERE position ILIKE $1
;`, [role]).then(contributors => {
	contributors = contributors.map(d => d.uuid)

	return DB.conn.any(`
		SELECT id FROM pads
		WHERE owner IN ($1:csv)
		AND status >= 2
	;`, [contributors])
	.then(pads => {
		pads = pads.map(d => `pads=${d.id}`)
		
		console.log(pads.join('&'))

		process.exit()
	}).catch(err => console.log(err))
}).catch(err => console.log(err))