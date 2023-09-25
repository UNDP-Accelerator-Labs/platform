const { modules, engagementtypes, metafields, app_languages, DB } = include('config/')
const { checklanguage, datastructures, userrights } = include('routes/helpers/')

module.exports = async (req, res) => {
	const { uuid, rights, public } = req.session || {}

	if (public) res.redirect('/login')
	else {

		const { object } = req.params || {}
		const { id, reset_message } = req.query || {}
		const language = checklanguage(req.params?.language || req.session.language)
		const path = req.path.substring(1).split('/')
		const activity = path[1]

		DB.general.tx(async t => {
			return check_authorization({ connection: t, id, uuid, rights, public })
			.then(result => {
				const { authorized, redirect } = result
				if (!authorized) {
					if (referer) return res.redirect(referer)
					else res.redirect('/login')
				} else if (authorized && redirect && redirect !== activity) {
					const query = []
					for (key in req.query) {
						query.push(`${key}=${req.query[key]}`)
					}
					return res.redirect(`/${language}/${redirect}/contributor${query.length > 0 ? `?${query.join('&')}` : ''}`)
					// return res.redirect(`/${language}/${redirect}/contributor?id=${id}`)
				} else {
					const batch = []
					// GET LIST OF COUNTRIES
					batch.push(t.any(`
						SELECT DISTINCT (iso3), name FROM country_names
						WHERE language = (COALESCE((SELECT DISTINCT (language) FROM country_names WHERE language = $1 LIMIT 1), 'en'))
						ORDER BY name
					;`, [ language ]))
					// GET LIST OF LANGUAGES
					batch.push(t.any(`
						SELECT DISTINCT (language), name FROM languages
						WHERE language IN ($1:csv)
						ORDER BY name
					;`, [ app_languages ]))
					// GET LIST OF TEAMS
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
					// GET DATA
					if (id) {
						batch.push(t.one(`
							SELECT DISTINCT (u.uuid), u.name, u.email, u.position, u.iso3, u.language, u.secondary_languages, u.rights, u.notifications, u.reviewer,
							cn.name AS country, l.name AS languagename,

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

							CASE WHEN uuid = $1
								OR $2 > 2
									THEN TRUE
									ELSE FALSE
							END AS editable,

							CASE WHEN $1 IN (SELECT host FROM cohorts WHERE contributor = u.uuid)
								OR $2 > 2
									THEN TRUE
									ELSE FALSE
							END AS host_editor

							FROM users u
							INNER JOIN country_names cn
								ON cn.iso3 = u.iso3
								AND cn.language = u.language
							INNER JOIN languages l
								ON l.language = u.language
							WHERE uuid = $3
						;`, [ uuid, rights, id ])
						.then(result => {
							return DB.conn.one(`
								SELECT COUNT (id)::INT FROM pads
								WHERE owner = $1
							;`, result.uuid, d => d.count)
							.then(pads => Object.assign(result, { pads }))
							.catch(err => console.log(err))
						}).catch(err => console.log(err)))
					} else batch.push(null)


					return t.batch(batch)
					.then(async results => {
						const [ countries, languages, teams, data ] = results
						
						const metadata = await datastructures.pagemetadata({ req })
						return Object.assign(metadata, { data, countries, languages, teams, reset_errormessage: reset_message })
					}).then(data => res.render('profile', data))
					.catch(err => console.log(err))
				}
			}).catch(err => console.log(err))
		}).catch(err => console.log(err))
	}
}

async function check_authorization (_kwargs) {
	const conn = _kwargs.connection || DB.general
	const { id, uuid, public } = _kwargs
	const { read, write } = modules.find(d => d.type === 'contributors')?.rights || {}

	const rights = await userrights({uuid})

	if (public) return new Promise(resolve => resolve({ authorized: false }))
	else if (id) {
		if (id === uuid || rights > 2) return new Promise(resolve => resolve({ authorized: true, redirect: 'edit' }))
		else return conn.oneOrNone(`
			SELECT DISTINCT (TRUE) AS bool FROM cohorts
			WHERE contributor = $1
				AND host = $2
		;`, [ id, uuid ])
		.then(result => {
			if (result) return { authorized: true, redirect: 'view' }
			else return { authorized: false }
		}).catch(err => console.log(err))
	} else return new Promise(resolve => resolve({ authorized: rights >= write }))
}