const { page_content_limit, ownDB, DB } = include('config/');

module.exports = async (req, res) => {
	const { uuid, rights } = req.session || {};
	let { pinboard, page, limit, space, databases } = Object.keys(req.query)?.length ? req.query : Object.keys(req.body)?.length ? req.body : {};

	// IF databases IS PASSED, MAKE SURE IT IS AN ARRAY
	if (databases && !Array.isArray(databases)) databases = [databases];

	let filters = [];
	if (pinboard) filters.push(DB.pgp.as.format('p.id IN ($1:csv)', [ pinboard ]));
	
	// IN THE CONDITIONS BELOW, SUPER USERS CANNOT ACCESS NON PUBLISHED PINBOARDS
	// TO CHANGE THIS, REMOVE THE `AND p.status > 2` AFTER THE `rights > 2` CLAUSE
	if (space === 'private') {
		filters.push(DB.pgp.as.format(`
			(
				p.id IN (
					SELECT pinboard FROM pinboard_contributors
					WHERE participant = $1
				) OR p.owner = $1
				OR ($2 > 2 AND p.status > 2)
			)
		`, [ uuid, rights ]));
	} else if (space === 'published') {
		filters.push(DB.pgp.as.format('(p.status > 2 OR ($1 > 2 AND p.status > 2))', [ rights ]));
	} else if (!space || space === 'all') { // DEFAULT TO THE PINBOARDS OF THE USER AND THE PUBLISHED ONES
		filters.push(DB.pgp.as.format(`
			(
				p.id IN (
					SELECT pinboard FROM pinboard_contributors
					WHERE participant = $1
				) OR (p.status > 2 OR p.owner = $1)
				OR ($2 > 2 AND p.status > 2)
			)
		`, [ uuid, rights ]));
	}
	
	if (filters.length) filters = filters.join(' AND ');
	else filters = 'TRUE';

	let page_filter = '';
	let data;

	if (databases) db_filter = DB.pgp.as.format('(edb.db IN ($1:csv) OR edb.id IN ($1:csv))', [ databases ]);
	else db_filter = 'TRUE';

	if (!pinboard || Array.isArray(pinboard)) { // EITHER NO pinboard OR MULTIPLE pinboards ARE QUERIED
		if (!isNaN(+page)) page_filter = DB.pgp.as.format(`LIMIT $1 OFFSET $2;`, [ limit ? +limit : page_content_limit, limit ? (+page - 1) * +limit : (+page - 1) * page_content_limit ]);
		
		data = await DB.general.tx(t => {
			const batch = [];
			batch.push(t.any(`
				WITH counts AS (
					SELECT pc.pinboard AS pinboard_id, edb.db AS platform, COUNT(DISTINCT(pc.pad))::INT AS count
					FROM pinboard_contributions pc
					INNER JOIN extern_db edb
						ON edb.id = pc.db
					WHERE $5:raw
					GROUP BY (pc.pinboard, edb.db)
					ORDER BY pc.pinboard
				)

				SELECT p.id AS pinboard_id, p.title, p.description, p.date, p.status,
					json_agg(DISTINCT(c.*)) AS counts,
					COUNT(DISTINCT(pc.pad || '' || pc.db))::INT AS total,
					COUNT(DISTINCT(pct.participant))::INT AS contributors,
					json_build_object(
						'name', u.name, 
						'iso3', u.iso3,
						'isUNDP', u.email LIKE '%@undp.org'
					) AS creator,

					CASE WHEN p.owner = $2 OR $2 = ANY (array_agg(pct.participant)) OR $4 > 2
						THEN TRUE
						ELSE FALSE
					END AS is_contributor

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
					AND pc.is_included = true
				GROUP BY (p.id, u.name, u.iso3, u.email)
				ORDER BY p.id DESC
				$3:raw
			;`, [ filters, uuid, page_filter, rights, db_filter ]));

			batch.push(t.one(`
				SELECT COUNT(p.id)::INT
				FROM pinboards p
				WHERE $1:raw
					AND (
						p.id IN (
							SELECT pinboard FROM pinboard_contributors
							WHERE participant = $2
						) OR (p.status > 2 OR p.owner = $2)
					)
			;`, [ filters, uuid ], d => d.count))

			return t.batch(batch)
			.then(results => {
				const [ data, count ] = results;
				return { count, data };
			}).catch(err => console.log(err));
		}).catch(err => console.log(err));
	} else { // THERE IS ONLY ONE pinboard SO WE WANT MORE DETAILED INFORMATION
		if (!isNaN(+page)) {
			if (isNaN(+limit)) limit = page_content_limit;
			page_filter = DB.pgp.as.format(`[$1:$2]`, [ (+page - 1) * +limit + 1, +page * +limit ]);
		}

		data = await DB.general.oneOrNone(`
			WITH counts AS (
				SELECT pc.pinboard AS pinboard_id, edb.db AS platform, COUNT(DISTINCT(pc.pad))::INT AS count
				FROM pinboard_contributions pc
				INNER JOIN extern_db edb
					ON edb.id = pc.db
				WHERE $5:raw
				GROUP BY (pc.pinboard, edb.db)
				ORDER BY pc.pinboard
			)

			SELECT p.id AS pinboard_id, p.title, p.description, p.date, p.status,
				json_agg(DISTINCT(c.*)) AS counts,
				COUNT(DISTINCT(pc.pad || '' || pc.db))::INT AS total,
				COUNT(DISTINCT(pct.participant))::INT AS contributors,
				
				(COALESCE (
					array_agg(
						DISTINCT (
							jsonb_build_object('pad_id', pc.pad, 'platform', edb.db)
						)
					)
				, '{}'))$3:raw AS pads,
				
				json_build_object(
					'name', u.name, 
					'iso3', u.iso3,
					'isUNDP', u.email LIKE '%@undp.org'
				) AS creator,

				CASE WHEN p.owner = $2 OR $2 = ANY (array_agg(pct.participant)) OR $4 > 2
					THEN TRUE
					ELSE FALSE
				END AS is_contributor

			FROM pinboards p
			INNER JOIN pinboard_contributions pc
				ON pc.pinboard = p.id
			INNER JOIN pinboard_contributors pct
				ON pct.pinboard = p.id
			INNER JOIN counts c
				ON c.pinboard_id = p.id
			INNER JOIN users u
				ON u.uuid = p.owner
			INNER JOIN extern_db edb
				ON edb.id = pc.db
			WHERE $1:raw
				AND (
					p.id IN (
						SELECT pinboard FROM pinboard_contributors
						WHERE participant = $2
					) OR (p.status > 2 OR p.owner = $2)
					OR $4 > 2
				)
				AND pc.is_included = true
				AND $5:raw
			GROUP BY (p.id, u.name, u.iso3, u.email)
		;`, [ filters, uuid, page_filter, rights, db_filter ]);
	}
	
	return res.json(data);
}