const { DB } = include('config/')

module.exports = (req, res) => {	
	const { referer } = req.headers || {}
	let { id } = req.query || {}
	const { uuid, rights, public } = req.session || {}
	// CONVERT id TO ARRAY
	if (!Array.isArray(id)) id = [id]
	id = id.map(d => +d).filter(d => !isNaN(d))
	
	if (id.length && !public) {
		DB.conn.none(`
			DELETE FROM templates
			WHERE id IN ($1:csv)
				AND (owner = $2
					OR $3 > 2)
		;`, [ id, uuid, rights ])
		.then(_ => {
			if (referer) res.redirect(referer)
			else res.redirect('/login')
		}).catch(err => console.log(err))
	} else {
		if (referer) res.redirect(referer)
		else res.redirect('/login')
	}
}