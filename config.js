let connection = {}

if (!['production', 'local-production'].includes(process.env.NODE_ENV)) {
	connection = {
		database: process.env.database, 
		port: process.env.port, 
		host: process.env.host,
		user: process.env.user,
		password: process.env.password
	}
} else {
	connection = {
		database: process.env.DB_NAME, 
		port: process.env.DB_PORT, 
		host: process.env.DB_HOST,
		user: process.env.DB_USERNAME,
		password: process.env.DB_PASSWORD,
		ssl: true
	}
}

const logSQL = true
const initOptions = {
	query(e) {
		if (logSQL) console.log(e.query)
	}
}
const pgp = require('pg-promise')(initOptions)
exports.conn = pgp(connection)
exports.pgp = pgp