const { page_content_limit, DB } = include('config/')
const { checklanguage, join} = include('routes/helpers/')

const filter = require('../filter')

module.exports = async kwargs => {
	const conn = kwargs.connection ? kwargs.connection : DB.conn
	const { req } = kwargs || {}
	const language = checklanguage(req.params?.language || req.session.language)

	// GET FILTERS
	const [ f_space, order, page, full_filters ] = await filter(req)

	return conn.task(t => {
		return t.any(`
			SELECT f.id, f.name AS title, f.path AS url, f.owner,
				CASE
					WHEN AGE(now(), f.date) < '0 second'::interval
						THEN jsonb_build_object('interval', 'positive', 'date', to_char(f.date, 'DD Mon YYYY'), 'minutes', EXTRACT(minute FROM AGE(f.date, now())), 'hours', EXTRACT(hour FROM AGE(f.date, now())), 'days', EXTRACT(day FROM AGE(f.date, now())), 'months', EXTRACT(month FROM AGE(f.date, now())))
					ELSE jsonb_build_object('interval', 'negative', 'date', to_char(f.date, 'DD Mon YYYY'), 'minutes', EXTRACT(minute FROM AGE(now(), f.date)), 'hours', EXTRACT(hour FROM AGE(now(), f.date)), 'days', EXTRACT(day FROM AGE(now(), f.date)), 'months', EXTRACT(month FROM AGE(now(), f.date)))
				END AS date
			FROM files f
			WHERE TRUE
				$1:raw
				$2:raw
				$3:raw
			LIMIT $4 OFFSET $5
		;`, [ full_filters, f_space, order, page_content_limit, (page - 1) * page_content_limit ])
	}).then(async results => {
		const data = await join.users(results, [ language, 'owner' ])

		return {
			data,
			count: page * page_content_limit,
			sections: [{ data }]
		}
	}).catch(err => console.log(err))
}