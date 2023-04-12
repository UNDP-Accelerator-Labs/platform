const { DB } = include('config/')

module.exports = (req, res) => {
	const { referer } = req.headers || {}
	const { id } = req.query || {}

	DB.conn.none(`
		UPDATE mobilizations 
		SET status = 2,
			end_date = NOW()
		WHERE id = $1::INT
	;`, [ id ])
	.then(_ => {
		if (referer) res.redirect(referer)
		else res.redirect('/login')
	}).catch(err => console.log(err))
}
