const logSQL = false
const initOptions = {
	query(e) {
		if (logSQL) console.log(e.query)
	}
}
const pgp = require('pg-promise')(initOptions)
const DB_app = require('./app.js').connection
const DB_general = require('./general.js').connection

exports.DB = { conn: pgp(DB_app), general: pgp(DB_general), pgp }
