const { DB } = include('config/')

module.exports = (req, res) => {
	const { id, ...data } = req.body || {}
	const sql = DB.pgp.helpers.sets(data)

	DB.general.one(`
		UPDATE pinboards
		SET $1:raw
		WHERE id = $2::INT
		RETURNING id, title, description
	;`, [ sql, id ])
	.then(datum => {
		res.json({ status: 200, message: 'Successfully saved.', datum })
	}).catch(err => console.log(err))
}