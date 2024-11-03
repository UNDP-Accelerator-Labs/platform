const { DB, ownDB } = include('config/');

module.exports = async (req, res) => {
	const { uuid } = req.session || {};
	let { pinboards } = Object.keys(req.query)?.length ? req.query : Object.keys(req.body)?.length ? req.body : {};
	const ownId = await ownDB();

	let filters = [];
	if (pinboards) filters.push(DB.pgp.as.format('p.id IN ($1:csv)', [ pinboards ]));
	
	if (filters.length) filters = filters.join(' AND ');
	else filters = 'TRUE';

	DB.general.any(`
		WITH counts AS (
			SELECT pc.pinboard, edb.db AS platform, COUNT(pc.pad)::INT AS count
			FROM pinboard_contributions pc
			INNER JOIN extern_db edb
				ON edb.id = pc.db
			GROUP BY (pc.pinboard, edb.db)
			ORDER BY pc.pinboard
		)
		SELECT p.id AS pinboard_id, p.title, p.description, p.date, 
			json_agg(DISTINCT(c.*)) AS counts,
			COUNT(pc.pad)::INT AS total
		FROM pinboards p
		INNER JOIN pinboard_contributions pc
			ON pc.pinboard = p.id
		INNER JOIN counts c
			ON c.pinboard = p.id
		WHERE $1:raw
			AND (
				p.id IN (
					SELECT pinboard FROM pinboard_contributors
					WHERE participant = $2
				) OR (p.status > 2 OR p.owner = $2)
			)
			AND pc.is_included = true
		GROUP BY (p.id)
	;`, [ filters, uuid ])
	.then(data => res.json(data))
	.catch(err => console.log(err));
}