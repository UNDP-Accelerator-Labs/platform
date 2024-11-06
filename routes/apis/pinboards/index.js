const { page_content_limit, ownDB, DB } = include('config/');

module.exports = async (req, res) => {
	const { uuid } = req.session || {};
	let { pinboard, page, limit } = Object.keys(req.query)?.length ? req.query : Object.keys(req.body)?.length ? req.body : {};
	// const ownId = await ownDB();

	let filters = [];
	if (pinboard) filters.push(DB.pgp.as.format('p.id IN ($1:csv)', [ pinboard ]));
	
	if (filters.length) filters = filters.join(' AND ');
	else filters = 'TRUE';

	let page_filter = '';
	if (!isNaN(+page)) page_filter = DB.pgp.as.format(`LIMIT $1 OFFSET $2;`, [ limit ? +limit : page_content_limit, limit ? (+page - 1) * +limit : (+page - 1) * page_content_limit ]);

	DB.general.any(`
		WITH counts AS (
			SELECT pc.pinboard AS pinboard_id, edb.db AS platform, COUNT(DISTINCT(pc.pad))::INT AS count
			FROM pinboard_contributions pc
			INNER JOIN extern_db edb
				ON edb.id = pc.db
			GROUP BY (pc.pinboard, edb.db)
			ORDER BY pc.pinboard
		)

		SELECT p.id AS pinboard_id, p.title, p.description, p.date, 
			json_agg(DISTINCT(c.*)) AS counts,
			COUNT(DISTINCT(pc.pad || '' || pc.db))::INT AS total,
			COUNT(DISTINCT(pct.participant))::INT AS contributors,
			json_build_object(
				'name', u.name, 
				'iso3', u.iso3,
				'isUNDP', u.email LIKE '%@undp.org'
			) AS creator

		FROM pinboards p
		INNER JOIN pinboard_contributions pc
			ON pc.pinboard = p.id
		INNER JOIN pinboard_contributors pct
			ON pct.pinboard = p.id
		INNER JOIN counts c
			ON c.pinboard_id = p.id
		INNER JOIN users u
			ON u.uuid = p.owner
		WHERE $1:raw
			AND (
				p.id IN (
					SELECT pinboard FROM pinboard_contributors
					WHERE participant = $2
				) OR (p.status > 2 OR p.owner = $2)
			)
			AND pc.is_included = true
		GROUP BY (p.id, u.name, u.iso3, u.email)
		$3:raw
	;`, [ filters, uuid, page_filter ])
	.then(data => res.json(data))
	.catch(err => console.log(err));
}