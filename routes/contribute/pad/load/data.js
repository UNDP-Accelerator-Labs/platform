const { engagementtypes, modules, DB } = include('config/')
const { checklanguage, engagementsummary, join, pagestats } = include('routes/helpers/')

const check_authorization = require('../authorization.js')

module.exports = async kwargs => {
	const conn = kwargs.connection ? kwargs.connection : DB.conn
	let { req, authorized } = kwargs || {}

	const { id, template, source, mobilization, display } = Object.keys(req.query)?.length ? req.query : Object.keys(req.body)?.length ? req.body : {}

	const { uuid, rights, collaborators, public } = req.session || {}
	const language = checklanguage(req.params?.language || req.query.language || req.body.language || req.session.language)

	if (authorized === undefined) {

		const authorization = await check_authorization({ connection: conn, id, template, mobilization, source, uuid, rights, collaborators, public })
		authorized = authorization.authorized
	}

	if (authorized === false) return null
	else {
		const engagement = engagementsummary({ doctype: 'pad', engagementtypes, docid: id, uuid })
		// GET THE PAD DATA
		return conn.oneOrNone(`
			SELECT p.id, p.title, p.owner, p.sections, p.template, p.status,

				CASE
					WHEN AGE(now(), p.date) < '0 second'::interval
						THEN jsonb_build_object('interval', 'positive', 'date', to_char(p.date, 'DD Mon YYYY'), 'minutes', EXTRACT(minute FROM AGE(p.date, now())), 'hours', EXTRACT(hour FROM AGE(p.date, now())), 'days', EXTRACT(day FROM AGE(p.date, now())), 'months', EXTRACT(month FROM AGE(p.date, now())))
					ELSE jsonb_build_object('interval', 'negative', 'date', to_char(p.date, 'DD Mon YYYY'), 'minutes', EXTRACT(minute FROM AGE(now(), p.date)), 'hours', EXTRACT(hour FROM AGE(now(), p.date)), 'days', EXTRACT(day FROM AGE(now(), p.date)), 'months', EXTRACT(month FROM AGE(now(), p.date)))
				END AS date,

				CASE WHEN p.id IN (SELECT pad FROM review_requests)
					THEN 1
					ELSE 0
				END AS review_status,

				CASE WHEN p.id IN (SELECT review FROM reviews)
					THEN TRUE
					ELSE FALSE
				END AS is_review,

				-- EXAMPLE FROM https://stackoverflow.com/questions/43053262/return-row-position-postgres
				COALESCE(
					(SELECT idx FROM (SELECT review, row_number() over(ORDER BY id) AS idx FROM reviews
						WHERE pad = p.source) res
						WHERE review = p.id
					)::INT,
				NULL) AS review_idx,

				COALESCE (
					(SELECT jsonb_agg(json_build_object('id', id, 'owner', owner)) FROM pads
					WHERE id IN (SELECT review FROM reviews WHERE status >= 2)
						AND source = p.id
					GROUP BY source
				)::TEXT, '[]')::JSONB AS reviews,

				-- THESE ARE THE ENGAGEMENT CASE STATEMENTS
				$1:raw

			FROM pads p

			LEFT JOIN (
				SELECT docid, user, array_agg(DISTINCT type) AS types FROM engagement
				WHERE user = $2
					AND doctype = 'pad'
				GROUP BY (docid, user)
			) e ON e.docid = p.id

			WHERE p.id = $3::INT
		;`, [ engagement.cases || false, uuid, id ])
		.then(async result => {
			if (result.reviews?.length > 0) {
				// TO DO: INVESTIGATE THIS
				if (result.reviews.length % modules.find(d => d.type === 'reviews')?.reviewers !== 0) {
					result.reviews = result.reviews.filter(d => d.owner === uuid)
				}
				result.reviews.sort((a, b) => a.id - b.id)
			}
			result.readCount = await pagestats.getReadCount(id, 'pad');
			if (result.status >= 2) {
				await pagestats.recordRender(req, id, 'pad');
			} else {
				result.readCount = '-';  // we're not recording so we don't imply we do
			}
			const data = await join.users(result, [ language, 'owner' ])
			return data
		}).catch(err => console.log(err))
	}
}