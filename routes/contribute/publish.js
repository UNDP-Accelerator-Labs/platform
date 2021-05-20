const DB = require('../../db-config.js')

exports.main = (req, res) => {
	const { referer } = req.headers || {}
	const { id, limit } = req.query || {}
	const { uuid, rights } = req.session || {}
	const { lang, activity, object } = req.params || {}
	
	let saveSQL
	if (id) {
		saveSQL = DB.pgp.as.format(`
			UPDATE $1:name
			SET status = 2,
				published = TRUE
			WHERE id = $2
				AND status = 1
				AND (contributor = (SELECT id FROM contributors WHERE uuid = $3)
					OR $4 > 2)
		;`, [object, +id, uuid, rights])
	} else { // PUBLISH ALL
		// MAKE SURE WE ARE NOT PUBLISHING MORE THAN THE LIMIT (IF THERE IS A LIMIT)
		saveSQL = DB.pgp.as.format(`
			UPDATE $1:name
			SET status = 2,
				published = TRUE
			WHERE id IN (
				SELECT id FROM $1:name 
				WHERE status = 1 
					AND (contributor = (SELECT id FROM contributors WHERE uuid = $2)
					OR $3 > 2)
				LIMIT $4
			)
		;`, [object, uuid, rights, limit])
	}
	// EXECUTE SQL
	DB.conn.none(saveSQL)
	.then(_ => res.redirect(referer))
	.catch(err => console.log(err))
}