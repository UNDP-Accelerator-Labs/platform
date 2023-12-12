const { modules, engagementtypes, metafields, app_languages, DB } = include('config/')
const { checklanguage, datastructures, geo, join } = include('routes/helpers/')

module.exports = async (req, res) => {
	const { uuid, rights, public } = req.session || {}

	if (public) res.redirect('/login')
	else {
		const { referer } = req.headers || {}
		const { id, errormessage, u_errormessage } = req.query || {}

		const language = checklanguage(req.params?.language || req.session.language)
		const path = req.path.substring(1).split('/')
		const activity = path[1]

		DB.general.tx(async t => {
			return check_authorization({ connection: t, id, uuid, rights, public })
			.then(async result => {
				const { authorized, redirect } = result
				if (!authorized) {
					if (referer) return res.redirect(referer)
					else res.redirect('/login')
				} else if (authorized && redirect && redirect !== activity) {
					// const query = []
					// for (const [key, value] of req.query) {
					// 	query.push(`${key}=${value}`);
					// }
					const query = new URLSearchParams(req.query || {});
					return res.redirect(`/${language}/${redirect}/contributor?${query.toString()}`)
				} else {
					const country_name_column = await geo.adm0.name_column({ connection: t, language })
					const batch = []
					// GET LIST OF COUNTRIES
					batch.push(t.task(async t1 => {
						const batch1 = []
						batch1.push(t1.any(`
							SELECT DISTINCT (su_a3) AS iso3, $1:name AS name, 'subunit' AS type
							FROM adm0_subunits
							WHERE su_a3 <> adm0_a3
						;`, [ country_name_column ]))
						batch1.push(t1.any(`
							SELECT DISTINCT (adm0_a3) AS iso3, $1:name AS name, 'unit' AS type
							FROM adm0
						;`, [ country_name_column ]))

						return t1.batch(batch1)
						.then(results => {
							const [ su_a3, adm_a3 ] = results
							let locations = su_a3.concat(adm_a3)
							// TO DO: COULD IMPROVE THIS WITH THE equivalents METHOD
							locations = locations.filter(d => {
								if (locations.filter(c => c.name === d.name).length > 1) {
									if (d.type === 'subunit') return true
									else return false
								} else return true
							})
							return locations.sort((a, b) => a.name.localeCompare(b.name))
						}).catch(err => console.log(err))
					}).catch(err => console.log(err)))
					// GET LIST OF LANGUAGES
					batch.push(t.any(`
						SELECT DISTINCT (language), name FROM languages
						WHERE language IN ($1:csv)
						ORDER BY name
					;`, [ app_languages ]))
					// GET LIST OF TEAMS
					if (modules.some(d => d.type === 'teams' && d.rights.write <= rights)) {
						batch.push(t.any(`
							SELECT id, name FROM teams
							WHERE host = $1
								OR id IN (
									SELECT team FROM team_members
									WHERE member = $1
								)
								OR $2 > 2
							ORDER BY name
						;`, [ uuid, rights ]))
					} else batch.push(null)
					// GET DATA
					if (id) {
						// TO DO: EXTRACT TEAMS AND SET IF VIEWING RIGHTS
						batch.push(t.task(t1 => {
							const batch1 = []

							// GET BASIC INFO
							batch1.push(t1.one(`
								SELECT DISTINCT (u.uuid), u.name, u.email, u.position, u.iso3, u.language,
									u.secondary_languages, u.rights, u.notifications, u.reviewer,

									CASE WHEN u.uuid = $1
										OR $2 > 2
											THEN TRUE
											ELSE FALSE
									END AS editable

								FROM users u
								WHERE u.uuid = $3
							;`, [ uuid, rights, id ])
							.then(async result => {
								const located_user = await join.locations(result, { connection: t1, language, key: 'iso3' })
								return located_user
							}).catch(err => console.log(err)))
							// GET LANGUAGE
							batch1.push(t1.one(`
								SELECT DISTINCT (u.uuid), l.name AS languagename
								FROM languages l
								INNER JOIN users u
									ON u.language = l.language
								WHERE u.uuid = $1
							;`, [ id ]))
							// DETERMINE IF CURRENT USER IS HOST
							batch1.push(t1.one(`
								SELECT DISTINCT (u.uuid),
									(
										u.uuid IN (SELECT contributor FROM cohorts WHERE host = $2)
										OR $3 > 2
									) AS host_editor
								FROM users u
								WHERE u.uuid = $1
							;`, [ id, uuid, rights ]))
							if (modules.some(d => d.type === 'teams' && d.rights.read <= rights)) {
								batch1.push(t1.one(`
									SELECT DISTINCT (u.uuid),

										COALESCE(
										(SELECT json_agg(json_build_object(
												'id', t.id,
												'name', t.name,
												'editable', ((u.uuid IN (SELECT contributor FROM cohorts WHERE host = $2) OR $3 > 2) AND $4)
											)) FROM teams t
											INNER JOIN team_members tm
												ON tm.team = t.id
											WHERE tm.member = u.uuid
											GROUP BY tm.member
										)::TEXT, '[]')::JSONB
										AS teams

									FROM users u
									WHERE u.uuid = $1
								;`, [ id, uuid, rights, modules.find(d => d.type === 'teams').rights.write <= rights ]))
							}

							/*
							t.one(`
								-- SELECT DISTINCT (u.uuid), u.name, u.email, u.position, u.iso3, u.language, u.secondary_languages, u.rights, u.notifications, u.reviewer,

								-- l.name AS languagename,

								-- COALESCE(su.$1:name, adm0.$1:name) AS country,

								COALESCE(
								(SELECT json_agg(json_build_object(
										'id', t.id,
										'name', t.name
									)) FROM teams t
									INNER JOIN team_members tm
										ON tm.team = t.id
									WHERE tm.member = u.uuid
									GROUP BY tm.member
								)::TEXT, '[]')::JSONB
								AS teams,

								-- CASE WHEN uuid = $2
								-- 	OR $3 > 2
								-- 		THEN TRUE
								-- 		ELSE FALSE
								-- END AS editable,

								-- CASE WHEN u.uuid IN (SELECT contributor FROM cohorts WHERE host = $2)
								-- 	OR $3 > 2
								-- 		THEN TRUE
								-- 		ELSE FALSE
								-- END AS host_editor

								-- FROM users u
								-- LEFT JOIN adm0_subunits su
								-- 	ON su.su_a3 = u.iso3
								-- LEFT JOIN adm0
								-- 	ON adm0.adm0_a3 = u.iso3

								-- INNER JOIN languages l
								--	ON l.language = u.language
								-- WHERE uuid = $4
							;`, [ country_name_column, uuid, rights, id ])
							*/
							return t1.batch(batch1)
							.then(results => {
								let [ userinfo, ...uservariables ] = results
								uservariables.forEach(d => {
									userinfo = join.joinObj.call(userinfo, d)
								})

								return DB.conn.one(`
									SELECT COUNT (id)::INT FROM pads
									WHERE owner = $1
								;`, userinfo.uuid, d => d.count)
								.then(pads => Object.assign(userinfo, { pads }))
								.catch(err => console.log(err))

							}).catch(err => console.log(err))
						}).catch(err => console.log(err)))
					} else batch.push(null)

					if(uuid === id){
						batch.push(t.any(`
						SELECT *
						FROM trusted_devices
						WHERE user_uuid = $1
						  AND is_trusted = true
						  AND created_at >= NOW() - INTERVAL '1 year';
						;`, [ uuid ]))
					} else batch.push(null)

					return t.batch(batch)
					.then(async results => {
						let [ countries, languages, teams, data, devices ] = results

						const trusted_devices = devices?.map(p=> ({
							...p,
							last_login: new Date(p.last_login)?.toLocaleDateString() + ' ' + new Date(p.last_login).toLocaleTimeString(),
							created_at: new Date(p.created_at)?.toLocaleDateString() + ' ' + new Date(p.last_login).toLocaleTimeString(),
						}))
						const metadata = await datastructures.pagemetadata({ req })

						return Object.assign(metadata, { data, countries, languages, teams, errormessage, trusted_devices, u_errormessage })
					}).then(data => res.render('contribute/contributor/', data))
					.catch(err => console.log(err))
				}
			}).catch(err => console.log(err))
		}).catch(err => console.log(err))
	}
}

function check_authorization (_kwargs) {
	const conn = _kwargs.connection || DB.general
	const { id, uuid, rights, public } = _kwargs
	const { read, write } = modules.find(d => d.type === 'contributors')?.rights || {}

	if (public) return new Promise(resolve => resolve({ authorized: false }))
	else if (id) {
		if (id === uuid || rights > 2) return new Promise(resolve => resolve({ authorized: true, redirect: 'edit' }))
		else return conn.oneOrNone(`
			SELECT DISTINCT (TRUE) AS bool FROM cohorts
			WHERE contributor = $1
				AND host = $2
		;`, [ id, uuid ])
		.then(result => {
			if (result) return { authorized: true, redirect: 'view' } // THIS SHOULD ACTUALLY PREVENT EVEN PEOPLE WHO CREATED A THIRD PARTY ACCOUNT FROM CHANGING THE SETTINGS OF THAT ACCOUNT
			else return { authorized: false }
		}).catch(err => console.log(err))
	} else return new Promise(resolve => resolve({ authorized: rights >= write }))
}
