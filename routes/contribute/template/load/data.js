const { engagementtypes, DB } = include('config/')
const { checklanguage, engagementsummary, join, pagestats } = include('routes/helpers/')

const check_authorization = require('../authorization.js')

module.exports = async kwargs => {
	const conn = kwargs.connection ? kwargs.connection : DB.conn
	let { req, authorized } = kwargs || {}

	let { id, source } = Object.keys(req.query)?.length ? req.query : Object.keys(req.body)?.length ? req.body : {}
	let workingID = id ?? source
	if (!workingID) return { message: 'No id found.' }

	const { uuid, rights, collaborators } = req.session || {}
	const language = checklanguage(req.params?.language || req.query.language || req.body.language || req.session.language)

	if (authorized === undefined) {
		const authorization = await check_authorization({ connection: conn, uuid, id, rights, collaborators })
		authorized = authorization.authorized
	}


	if (authorized === false) return null
	else {
		const engagement = engagementsummary({ doctype: 'template', engagementtypes, docid: +id, uuid })
		// GET THE TEMPLATE DATA
		return conn.oneOrNone(`
			SELECT t.id, t.title, t.owner, t.description, t.sections, t.status, t.slideshow,
			nlevel(t.version) > 1 AS copy,

				CASE
					WHEN AGE(now(), t.date) < '0 second'::interval
						THEN jsonb_build_object('interval', 'positive', 'date', to_char(t.date, 'DD Mon YYYY'), 'minutes', EXTRACT(minute FROM AGE(t.date, now())), 'hours', EXTRACT(hour FROM AGE(t.date, now())), 'days', EXTRACT(day FROM AGE(t.date, now())), 'months', EXTRACT(month FROM AGE(t.date, now())))
					ELSE jsonb_build_object('interval', 'negative', 'date', to_char(t.date, 'DD Mon YYYY'), 'minutes', EXTRACT(minute FROM AGE(now(), t.date)), 'hours', EXTRACT(hour FROM AGE(now(), t.date)), 'days', EXTRACT(day FROM AGE(now(), t.date)), 'months', EXTRACT(month FROM AGE(now(), t.date)))
				END AS date,


				CASE WHEN t.id IN (SELECT template FROM review_templates)
					THEN TRUE
					ELSE FALSE
				END AS review_template,

				CASE WHEN t.id IN (SELECT template FROM review_templates)
					THEN (SELECT DISTINCT(language) FROM review_templates WHERE template = t.id)
					ELSE NULL
				END AS review_language,

				-- THESE ARE THE ENGAGEMENT CASE STATEMENTS
				$1:raw

			FROM templates t

			LEFT JOIN (
				SELECT docid, user, array_agg(DISTINCT type) AS types FROM engagement
				WHERE user = $2
					AND doctype = 'template'
				GROUP BY (docid, user)
			) e ON e.docid = t.id

			WHERE t.id = $3::INT
		;`, [ engagement.cases || false, uuid, workingID ])
		.then(async result => {
			if (result) {
				if (!id) { // THIS IS IN CASE A TEMPLATE IS BEING COPIED
					result.id = null
					result.source = +source
				}
				result.copy = result.copy || ![null, undefined, 0].includes(source)

				result.readCount = await pagestats.getReadCount(id, 'template');
				const data = await join.users(result, [ language, 'owner' ])
				return data;
			} else return null
		})
	}
}
