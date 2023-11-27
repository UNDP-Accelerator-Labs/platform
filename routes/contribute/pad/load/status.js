const { DB } = include('config/')

module.exports = kwargs => {
	const conn = kwargs.connection ? kwargs.connection : DB.conn
	const { req } = kwargs

	const { id } = Object.keys(req.query)?.length ? req.query : Object.keys(req.body)?.length ? req.body : {}
	return DB.conn.one(`
		SELECT status FROM pads
		WHERE id = $1::INT
	;`, [ id ], d => d.status).catch(err => console.log(err))
}