const { page_content_limit, engagementtypes, DB } = include('config/')

const filter = require('../filter')

module.exports = async kwargs => {
	const conn = kwargs.connection ? kwargs.connection : DB.conn
	let { req, res, filters } = kwargs || {}

	const { limit, orderby } = Object.keys(req.query)?.length ? req.query : Object.keys(req.body)?.length ? req.body : {}

	// GET FILTERS
	if (!filters?.length) filters = await filter(req, res)
	const [ f_space, order, page, full_filters ] = filters

	let sql = DB.pgp.as.format(`
		SELECT p.id FROM pads p
		WHERE TRUE
			$1:raw
			AND p.id NOT IN (SELECT review FROM reviews)
		$2:raw
		LIMIT $3 OFFSET $4
	;`, [ full_filters, order, limit === null ? null : page_content_limit, limit === null ? null : (page - 1) * page_content_limit ])

	if (engagementtypes.includes(orderby)) {
		sql = DB.pgp.as.format(`
			SELECT p.id, COALESCE(e.count, 0) AS orderid
			FROM pads p
			LEFT JOIN (
				SELECT docid AS id, COUNT(DISTINCT(contributor))
				FROM engagement
				WHERE doctype = 'pad'
					AND type = $1
				GROUP BY docid
			) AS e
			ON e.id = p.id
			WHERE TRUE
				$2:raw
				AND p.id NOT IN (SELECT review FROM reviews)
			ORDER BY orderid DESC, p.date DESC
			LIMIT $3 OFFSET $4
		;`, [ orderby, full_filters, limit === null ? null : page_content_limit, limit === null ? null : (page - 1) * page_content_limit ])
	}
	return conn.any(sql)
	.then(results => {
		return results.map(d => d.id)
	}).catch(err => console.log(err))
}
