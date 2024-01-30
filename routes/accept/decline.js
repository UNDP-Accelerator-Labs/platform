const { modules, DB } = include('config/')
const { redirectBack } = include('routes/helpers/')

module.exports = (req, res) => {
	const { id, redirection } = req.query || {}
	const { uuid } = req.session || {}
	const { object } = req.params || {}

	// EXECUTE SQL
	if (object === 'review') {
		return DB.conn.tx(t => {
			return t.one(`
				SELECT COUNT (id)::INT FROM reviewer_pool
				WHERE request = (SELECT id FROM review_requests WHERE pad = $1)
			;`, [ id ], d => d.count)
			.then(reviewer_count => {
				if (reviewer_count - 1 >= modules.find(d => d.type === 'reviews').reviewers) {
					return t.none(`
						DELETE FROM reviewer_pool
						WHERE reviewer = $1
							AND request = (SELECT id FROM review_requests WHERE pad = $2)
					;`, [ uuid, id ])
				} else return null
			})
		}).then(_ => {
			redirectBack(req, res)
		}).catch(err => console.log(err))
	}
}
