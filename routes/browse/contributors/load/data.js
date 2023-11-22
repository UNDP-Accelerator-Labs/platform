const { modules, DB } = include('config/')
const { join, checklanguage, safeArr, DEFAULT_UUID } = include('routes/helpers/')

const filter = require('../filter')

module.exports = async kwargs => {
	const conn = kwargs.connection ? kwargs.connection : DB.general
	const { req } = kwargs || {}
	const { object } = req.params || {}
	const { uuid, rights, collaborators } = req.session || {}
	const language = checklanguage(req.params?.language || req.session.language)

	// GET FILTERS
	const [ f_space, page, full_filters ] = await filter(kwargs.req)

	const collaborators_ids = safeArr(collaborators.map(d => d.uuid), uuid ?? DEFAULT_UUID)
	// const team_rights = modules.find()

	return conn.task(gt => {
		return gt.any(`
			SELECT DISTINCT (u.uuid) AS id 
			FROM users u
			WHERE TRUE
				$1:raw
		;`, [ full_filters ])
		.then(contributors => {
			contributors = contributors.map(d => d.id)
			contributorlist = DB.pgp.as.format(contributors.length === 0 ? '(NULL)' : '($1:csv)', [ contributors ])

			const batch = []

			// GET BASIC CONTRIBUTOR INFO
			batch.push(gt.any(`
				SELECT DISTINCT (u.uuid) AS id, u.name, u.email, u.position AS txt, u.iso3, 
					u.confirmed::INT AS status,
					u.confirmed_at, u.left_at,
					u.language, u.secondary_languages,
					to_char(u.confirmed_at, 'DD Mon YYYY') AS start_date, 
					to_char(u.left_at, 'DD Mon YYYY') AS end_date,

					CASE WHEN u.uuid IN (SELECT contributor FROM cohorts WHERE host = $2) 
						OR $3 > 2
							THEN TRUE
							ELSE FALSE
					END AS editable

				FROM users u
				WHERE u.uuid IN $1:raw
			;`, [ contributorlist, uuid, rights ])
			.then(async results => {
				// JOIN LOCATION INFO
				const located_users = await join.locations(results, { connection: gt, language, key: 'iso3' })
				return located_users
			}).catch(err => console.log(err)))
			// GET TEAMS INFO
			if (modules.some(d => d.type === 'teams' && d.rights.read <= rights)) {
				batch.push(gt.any(`
					SELECT DISTINCT (u.uuid) AS id,

						COALESCE(
						(SELECT json_agg(json_build_object(
								'id', t.id,
								'title', t.name,
								'is_exploration', FALSE,
								'editable', ((u.uuid IN (SELECT contributor FROM cohorts WHERE host = $2) OR $3 > 2) AND $4)
							)) FROM teams t
							INNER JOIN team_members tm
								ON tm.team = t.id
							WHERE tm.member = u.uuid
							GROUP BY tm.member
						)::TEXT, '[]')::JSONB
						AS pinboards

					FROM users u
					WHERE u.uuid IN $1:raw
				;`, [ contributorlist, uuid, rights, modules.find(d => d.type === 'teams').rights.write <= rights ]))
			}

			return gt.batch(batch)
			.then(async results => {
				let data = contributors.map(d => { return { id: d } })
				results.forEach(d => {
					data = join.multijoin.call(data, [ d, 'id' ])
				})
				return data
			}).catch(err => console.log(err))
		}).then(users => {
			if (users.length) {
				return DB.conn.task(t => {
					const batch = []
					batch.push(t.any(`
						SELECT mc.participant AS id, COALESCE(COUNT (mc.mobilization), 0)::INT AS ongoing_associated_mobilizations FROM mobilization_contributors mc
						INNER JOIN mobilizations m
							ON m.id = mc.mobilization
						WHERE mc.participant IN ($1:csv)
							AND m.status = 1
						GROUP BY mc.participant
					;`, [ users.map(d => d.id) ]))

					batch.push(t.any(`
						SELECT mc.participant AS id, COALESCE(COUNT (mc.mobilization), 0)::INT AS past_associated_mobilizations FROM mobilization_contributors mc
						INNER JOIN mobilizations m
							ON m.id = mc.mobilization
						WHERE mc.participant IN ($1:csv)
							AND m.status = 2
						GROUP BY mc.participant
					;`, [ users.map(d => d.id) ]))

					batch.push(t.any(`
						SELECT owner AS id, COALESCE(COUNT (id), 0)::INT AS private_associated_pads FROM pads
						WHERE owner IN ($1:csv)
							AND status < 2
						GROUP BY owner
					;`, [ users.map(d => d.id) ]))

					batch.push(t.any(`
						SELECT owner AS id, COALESCE(COUNT (id), 0)::INT AS associated_pads FROM pads
						WHERE owner IN ($1:csv)
							AND status >= 2
						GROUP BY owner
					;`, [ users.map(d => d.id) ]))

					return t.batch(batch)
					.then(results => {
						// const [ ongoing_associated_mobilizations, past_associated_mobilizations, private_associated_pads, associated_pads ] = results

						// let data = join.multijoin.call(users, [ ongoing_associated_mobilizations, 'id' ])
						// data = join.multijoin.call(data, [ past_associated_mobilizations, 'id' ])
						// data = join.multijoin.call(data, [ private_associated_pads, 'id' ])
						// data = join.multijoin.call(data, [ associated_pads, 'id' ])

						results.forEach(d => {
							users = join.multijoin.call(users, [ d, 'id' ])
						})

						users.forEach(d => { // UPDATE STATUS BASED ON PADS
							if (d.status === 1 && (d.associated_pads > 0 || d.private_associated_pads > 0)) d.status = 2
						})

						return users.sort((a, b) => a.name.localeCompare(b.name))
					}).catch(err => console.log(err))
				}).catch(err => console.log(err))
			} else return users.sort((a, b) => a.name.localeCompare(b.name))
		}).catch(err => console.log(err))
		/*
		return gt.any(`
			-- SELECT DISTINCT (u.uuid) AS id, u.name, u.email, u.position AS txt, u.iso3, u.confirmed::INT AS status,
			-- u.confirmed_at, u.left_at,
			-- u.language, u.secondary_languages,
			-- to_char(u.confirmed_at, 'DD Mon YYYY') AS start_date, 
			-- to_char(u.left_at, 'DD Mon YYYY') AS end_date,
			
			-- CASE WHEN u.uuid IN (SELECT contributor FROM cohorts WHERE host = $4) 
			-- 	OR $1 > 2
			-- 		THEN TRUE
			-- 		ELSE FALSE
			-- END AS editable,

			-- THIS IS THE PINBOARD CASE STATEMENT
			--COALESCE(
			--(SELECT json_agg(json_build_object(
			--		'id', t.id,
			--		'title', t.name,
			--		'is_exploration', FALSE,
			--		'editable', (u.uuid IN (SELECT contributor FROM cohorts WHERE host = $4) OR $1 > 2)
			--	)) FROM teams t
			--	INNER JOIN team_members tm
			--		ON tm.team = t.id
			--	WHERE 
			--		-- u.uuid IN ($2:csv)
			--		-- AND 
			--		tm.member = u.uuid
			--	GROUP BY tm.member
			--)::TEXT, '[]')::JSONB
			--AS pinboards

			--FROM users u
			--
			--LEFT JOIN languages l
			--	ON l.iso3 = u.iso3
			--WHERE TRUE
			--	$3:raw
			--ORDER BY u.name
		;`, [ rights, collaborators_ids, full_filters, uuid ])
		*/
		
	}).then(data => {
		return {
			data,
			sections: [{ data }]
		}
	}).catch(err => console.log(err))
}
