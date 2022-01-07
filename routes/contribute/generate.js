const DB = require('../../db-config.js')

exports.main = (req, res) => {
	// CHECK THE PAD EXISTS
	const { uuid } = req.session || {}
	const { object } = req.params || {}
	const { id, tagging, deletion, mobilization } = req.body || {}

	DB.conn.tx(t => { 
		
	}).then(results => {
		
	}).catch(err => console.log(err))
}