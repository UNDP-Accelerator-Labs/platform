const { page_content_limit, modules, engagementtypes, DB } = include('config/')
const { checklanguage, engagementsummary, join, safeArr, DEFAULT_UUID, pagestats } = include('routes/helpers/')

const filter = require('../filter')

module.exports = async kwargs => {
	const conn = kwargs.connection ? kwargs.connection : DB.conn
	const { req } = kwargs || {}
	const { object } = req.params || {}
	const { uuid, rights, collaborators } = req.session || {}
	const language = checklanguage(req.params?.language || req.session.language)

	// GET FILTERS
	const [ f_space, order, page, full_filters ] = await filter(req)

	const collaborators_ids = safeArr(collaborators.map(d => d.uuid), uuid ?? DEFAULT_UUID)

	const engagement = engagementsummary({ doctype: 'template', engagementtypes, uuid })

	return conn.any(`
		SELECT t.id, t.owner, t.title, t.description AS txt, t.sections, t.status, nlevel(t.version) AS version_depth,
			st.id AS source, st.title AS source_title,
			COALESCE((SELECT COUNT (id) FROM pads WHERE template = t.id AND status >= 2), 0)::INT AS associated_pads,
			COALESCE((SELECT COUNT (id) FROM pads WHERE template = t.id AND (owner = $1 OR $4 > 2) AND status < 2), 0)::INT AS private_associated_pads,

			CASE WHEN (SELECT COUNT (id) FROM pads WHERE template = t.id) > 0
				OR (SELECT COUNT (id) FROM mobilizations WHERE template = t.id) > 0
					THEN FALSE
				ELSE TRUE
			END AS retractable,

			CASE
				WHEN AGE(now(), t.date) < '0 second'::interval
					THEN jsonb_build_object('interval', 'positive', 'date', to_char(t.date, 'DD Mon YYYY'), 'minutes', EXTRACT(minute FROM AGE(t.date, now())), 'hours', EXTRACT(hour FROM AGE(t.date, now())), 'days', EXTRACT(day FROM AGE(t.date, now())), 'months', EXTRACT(month FROM AGE(t.date, now())))
				ELSE jsonb_build_object('interval', 'negative', 'date', to_char(t.date, 'DD Mon YYYY'), 'minutes', EXTRACT(minute FROM AGE(now(), t.date)), 'hours', EXTRACT(hour FROM AGE(now(), t.date)), 'days', EXTRACT(day FROM AGE(now(), t.date)), 'months', EXTRACT(month FROM AGE(now(), t.date)))
			END AS date,

			CASE WHEN t.source IS NOT NULL
				THEN TRUE
				ELSE FALSE
			END AS is_copy,

			-- THESE ARE THE ENGAGEMENT COALESCE STATEMENTS
			$3:raw,

			CASE WHEN t.owner IN ($2:csv)
				OR $4 > 2
					THEN TRUE
					ELSE FALSE
				END AS editable,

			-- THESE ARE THE ENGAGEMENT CASE STATEMENTS
			$5:raw

		FROM templates t

		LEFT JOIN templates st
			ON t.source = st.id

		LEFT JOIN (
			SELECT docid, contributor, array_agg(DISTINCT type) AS types FROM engagement
			WHERE contributor = $1
				AND doctype = 'template'
			GROUP BY (docid, contributor)
		) e ON t.id = e.docid

		LEFT JOIN ($6:raw) ce ON t.id = ce.docid

		WHERE TRUE
			$7:raw
			$8:raw
		GROUP BY (
			t.id,
			st.title,
			st.id,
			e.types,
			$9:raw
		)
		$10:raw
		LIMIT $11 OFFSET $12
	;`, [
		/* $1 */ uuid,
		/* $2 */ collaborators_ids,
		/* $3 */ engagement.coalesce,
		/* $4 */ rights,
		/* $5 */ engagement.cases,
		/* $6 */ engagement.query,
		/* $7 */ full_filters,
		/* $8 */ f_space,
		/* $9 */ engagement.list,
		/* $10 */ order,
		/* $11 */ page_content_limit,
		/* $12 */ (page - 1) * page_content_limit
	]).then(async results => {
		results.forEach(d => {
			d.items = d.sections?.map(d => d.structure)?.flat().length || 0
			delete d.sections
		})
		await pagestats.putReadCount('template', results, d => d.id);
		const data = await join.users(results, [ language, 'owner' ])

		return {
			data,
			count: page * page_content_limit,
			sections: [{ data }]
		}
	}).catch(err => console.log(err))
}
