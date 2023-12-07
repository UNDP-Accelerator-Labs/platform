const { page_content_limit, DB } = include('config/')

const filter = require('../filter')

module.exports = async kwargs => {
	const conn = kwargs.connection ? kwargs.connection : DB.conn
	let { req, res, filters } = kwargs || {}

	const { limit } = Object.keys(req.query)?.length ? req.query : Object.keys(req.body)?.length ? req.body : {}

	// GET FILTERS
	if (!filters?.length) filters = await filter(req, res)
	const [ f_space, order, page, full_filters ] = filters

	return conn.any(`
		SELECT id FROM pads p
		WHERE TRUE
			$1:raw
			AND p.id NOT IN (SELECT review FROM reviews)
		$2:raw
		LIMIT $3 OFFSET $4
	;`, [ full_filters, order, limit === null ? null : page_content_limit, limit === null ? null : (page - 1) * page_content_limit ])
	.then(results => {
		return results.map(d => d.id)
	}).catch(err => console.log(err))
}
