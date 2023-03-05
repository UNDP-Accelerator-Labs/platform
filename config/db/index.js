const logSQL = true
const initOptions = {
	query(e) {
		if (logSQL) console.log(e.query)
	}
}
const pgp = require('pg-promise')(initOptions)
const DB = require('./app.js').connection
const DB_apps = require('./app.js').connections
const DB_general = require('./general.js').connection

exports.DB = { conn: pgp(DB), conns: DB_apps.map(d => pgp(d)), general: pgp(DB_general), pgp }
