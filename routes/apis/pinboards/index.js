const { page_content_limit, ownDB, DB } = include('config/');

module.exports = async (req, res) => {
	const { uuid, rights } = req.session || {};
	let { pinboard, page, limit, space, databases, search } = Object.keys(req.query)?.length ? req.query : Object.keys(req.body)?.length ? req.body : {};

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

	const _search = search?.trim()
	if (_search?.length) {
		const words = _search?.split(/\s+/);
		const patterns = words.map(word => `%${word}%`);
		filters.push(
			DB.pgp.as.format(
				`(p.title ILIKE ANY($1) OR p.description ILIKE ANY($1))`,
				[patterns]
			)
		);
	}
	
	if (filters.length) filters = filters.join(' AND ');
	else filters = 'TRUE';

	let page_filter = '';
	let data;

	if (databases) db_filter = DB.pgp.as.format('edb.db IN ($1:csv)', [ databases ]);
	else db_filter = 'TRUE';

	if (!pinboard || Array.isArray(pinboard)) { // EITHER NO pinboard OR MULTIPLE pinboards ARE QUERIED
		if (!isNaN(+page)) page_filter = DB.pgp.as.format(`LIMIT $1 OFFSET $2;`, [ limit ? +limit : page_content_limit, limit ? (+page - 1) * +limit : (+page - 1) * page_content_limit ]);
		
		data = await DB.general.tx(t => {
			const batch = [];
			batch.push(t.any(`
				WITH counts AS (
					SELECT pc.pinboard AS pinboard_id, edb.db AS platform, COUNT(DISTINCT(pc.pad))::INT AS count
					FROM pinboard_contributions pc
					LEFT JOIN extern_db edb
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
						'id', p.owner,
						'isUNDP', u.email LIKE '%@undp.org'
					) AS creator,

					CASE WHEN p.owner = $2 OR $2 = ANY (array_agg(pct.participant)) OR $4 > 2
						THEN TRUE
						ELSE FALSE
					END AS is_contributor

				FROM pinboards p
				LEFT JOIN pinboard_contributions pc
					ON pc.pinboard = p.id
				LEFT JOIN pinboard_contributors pct
					ON pct.pinboard = p.id
				LEFT JOIN counts c
					ON c.pinboard_id = p.id
				LEFT JOIN users u
					ON u.uuid = p.owner
				WHERE $1:raw
					AND (
						-- Condition for contributions or pc.is_included
						(
							EXISTS (
								SELECT 1 
								FROM pinboard_contributions pc_sub
								WHERE pc_sub.pinboard = p.id
							) AND pc.is_included = true
						) 
						OR NOT EXISTS (
							SELECT 1 
							FROM pinboard_contributions pc_sub
							WHERE pc_sub.pinboard = p.id
						)
					)
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
				LEFT JOIN extern_db edb
					ON edb.id = pc.db
				-- WHERE $5:raw
				GROUP BY (pc.pinboard, edb.db)
				ORDER BY pc.pinboard
			)

			SELECT p.id AS pinboard_id, p.title, p.description, p.date, p.status,
				json_agg(DISTINCT(c.*)) AS counts,
				COALESCE(COUNT(DISTINCT pc.pad || '' || pc.db), 0)::INT AS total,
    			COALESCE(COUNT(DISTINCT pct.participant), 0)::INT AS contributors,
				
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
					'id', p.owner,
					'isUNDP', u.email LIKE '%@undp.org'
				) AS creator,

				CASE WHEN p.owner = $2 OR $2 = ANY (array_agg(pct.participant)) OR $4 > 2
					THEN TRUE
					ELSE FALSE
				END AS is_contributor

			FROM pinboards p
			LEFT JOIN pinboard_contributions pc
				ON pc.pinboard = p.id
			LEFT JOIN pinboard_contributors pct
				ON pct.pinboard = p.id
			LEFT JOIN counts c
				ON c.pinboard_id = p.id
			LEFT JOIN users u
				ON u.uuid = p.owner
			LEFT JOIN extern_db edb
				ON edb.id = pc.db
			WHERE $1:raw
				AND (
					p.id IN (
						SELECT pinboard FROM pinboard_contributors
						WHERE participant = $2
					) OR (p.status > 2 OR p.owner = $2)
					OR $4 > 2
				)
				AND (
					-- Condition for contributions or pc.is_included
					(
						EXISTS (
							SELECT 1 
							FROM pinboard_contributions pc_sub
							WHERE pc_sub.pinboard = p.id
						) AND pc.is_included = true
					) 
					OR NOT EXISTS (
						SELECT 1 
						FROM pinboard_contributions pc_sub
						WHERE pc_sub.pinboard = p.id
					)
				)
				AND $5:raw
			GROUP BY (p.id, u.name, u.iso3, u.email)
		;`, [ filters, uuid, page_filter, rights, db_filter ]);
	}
	
	return res.json(data);
}