const xlsx = require('./xlsx.js').main
const json = require('./json.js').main

module.exports = async (req, res) => {
	const token = req.body.token || req.query.token || req.headers['x-access-token']
	const { action } = req.params || {}
	const { output, render } = req.body || {}

	// TO DO: ADD Readme.md TO DOWNLOADS

	if (token) { // IF THERE IS A TOKEN, THIS IS AN CORS CALL, SO WE NEED TO SET UP SOME BASIC session INFORMATION
		const auth = jwt.verify(token, process.env.GLOBAL_LOGIN_KEY)
		if (auth) {
			const { email } = auth
			req.session.email = email // PASS THIS TO SESSION FOR THE json PROCESSOR
		} // IF NOT TOKEN IS SENT, THEN ONLY PUBLIC CONTENT CAN BE DOWNLOADED
	}

	if (render) {
		if (['xlsx', 'csv'].includes(output)) xlsx(req, res)
		else if (['json', 'geojson'].includes(output)) json(req, res)
		else res.redirect('/module-error')
	} else {
		json(req, res)
	}
}