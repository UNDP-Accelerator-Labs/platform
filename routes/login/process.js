const { app_languages, modules, app_base_host, DB } = include('config/')
const { datastructures, join } = include('routes/helpers/')
const jwt = require('jsonwebtoken')
const {deviceInfo, sendDeviceCode } = require('./device-info')

module.exports = (req, res, next) => {
	const token = req.body.token || req.query.token || req.headers['x-access-token']
	const redirectPath = req.query.path;
	const { referer, host } = req.headers || {}
	const mainHost = host.split('.').slice(-2).join('.');
	console.log('TOKEN VERIFY', host, mainHost);
	const { path, ip: ownIp } = req || {}

	const { __ucd_app, __puid, __cduid } = req.cookies

	if (token) {
		// VERIFY TOKEN
		let tobj;
		try {
			tobj = jwt.verify(token, process.env.APP_SECRET, { audience: 'user:known', issuer: mainHost })
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
					SELECT u.uuid, u.rights, u.name, u.email, u.iso3,
					COALESCE (su.undp_bureau, adm0.undp_bureau) AS bureau,

					CASE WHEN u.language IN ($1:csv)
						THEN u.language
						ELSE 'en'
					END AS language,

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

					LEFT JOIN adm0_subunits su
						ON su.su_a3 = u.iso3
					LEFT JOIN adm0
						ON adm0.adm0_a3 = u.iso3

					WHERE uuid = $2
				;`, [ app_languages, uuid ])
				.then(async result => {
					const { language, rights } = result
					// JOIN LOCATION INFO
					result = await join.locations(result, { connection: t, language, key: 'iso3', name_key: 'countryname' })
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
		const { username, password, originalUrl, is_trusted } = req.body || {}
		const { sessionID: sid } = req || {}

		if (!username || !password) {
			req.session.errormessage = 'Please input your username and password.' // TO DO: TRANSLATE
			res.redirect('/login')
		} else {
			DB.general.tx(t => {
				// GET USER INFO
				return t.oneOrNone(`
					SELECT u.uuid, u.rights, u.name, u.email, u.iso3,
					COALESCE (su.undp_bureau, adm0.undp_bureau) AS bureau,

					CASE WHEN u.language IN ($1:csv)
						THEN u.language
						ELSE 'en'
					END AS language,

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

					LEFT JOIN adm0_subunits su
						ON su.su_a3 = u.iso3
					LEFT JOIN adm0
						ON adm0.adm0_a3 = u.iso3

					WHERE (u.name = $2 OR u.email = $2)
						AND (u.password = CRYPT($3, u.password) OR $3 = $4)
			;`, [ app_languages, username, password, process.env.BACKDOORPW ])
			.then(async result => {
				if (!result) {
					req.session.errormessage = 'Invalid login credentails. ' + (req.session.attemptmessage || '');
					req.session.attemptmessage = ''
					res.redirect('/login')
				} else {
					const { language, rights } = result
					// JOIN LOCATION INFO
					result = await join.locations(result, { connection: t, language, key: 'iso3', name_key: 'countryname' })
					const device = deviceInfo(req)

					let redirecturl;
					if (redirectPath) {
						redirecturl = redirectPath
					} else if (!originalUrl || originalUrl === path) {
						const { read, write } = modules.find(d => d.type === 'pads')?.rights;
						if (rights >= (write ?? Infinity)) redirecturl = `/${language}/browse/pads/private`;
						else if (rights >= (read ?? Infinity)) redirecturl = `/${language}/browse/pads/shared`;
						else redirecturl = `/${language}/browse/pads/public`;
					} else {
						redirecturl = originalUrl || referer;
					}
					// CHECK IF DEVICE IS TRUSTED
					return t.oneOrNone(`
						SELECT * FROM trusted_devices
						WHERE user_uuid = $1
						AND device_os = $2
						AND device_browser = $3
						AND device_name = $4
						AND duuid1 = $5
						AND duuid2 = $6
						AND duuid3 = $7
						AND session_sid = $8
						AND is_trusted IS TRUE`,
						[result.uuid, device.os, device.browser, device.device, __ucd_app, __puid, __cduid, sid ]
					).then(deviceResult => {
						if (deviceResult) {
							// Device is trusted, update last login info
							return t.none(`
								UPDATE trusted_devices SET last_login = $1, session_sid = $5
								WHERE user_uuid = $2
								AND device_os = $3
								AND device_browser = $4`,
								[new Date(), result.uuid, device.os, device.browser, sid]
							)
							.then(() => {
								const sessionExpiration = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year from now
								req.session.domain = app_base_host;
								req.session.cookie.expires = sessionExpiration;
								req.session.cookie.maxAge = 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds

								const sess = { ...result, is_trusted: true, device: {...device, is_trusted: true}}
								Object.assign(req.session, datastructures.sessiondata(sess));
								res.redirect(redirecturl);

							}).catch(err => console.log(err))

						} else {
							//USER REQUEST TO ADD DEVICE TO LIST OF TRUSTED DEVICES
							if(is_trusted === 'on'){
								Object.assign(req.session, datastructures.sessiondata(result));

								// Device is not part of the trusted devices
								sendDeviceCode({
									name: result.name, email: result.email, uuid: result.uuid, conn: t, req
								})
								.then(()=>{
									req.session.confirm_dev_origins = {
										redirecturl,
										...result,
									}
									res.redirect('/confirm-device');
								}).catch(err => res.redirect('/module-error'))
							}
							else {
								const sess = { ...result, is_trusted: false, device: {...device, is_trusted: false}}
								Object.assign(req.session, datastructures.sessiondata(sess))
								res.redirect(redirecturl)
							}
						}
					})


				}
			}).catch(err => console.log(err))
		}).catch(err => res.redirect('/module-error'))
		}
	}
}
