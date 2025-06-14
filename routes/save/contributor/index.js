const { modules, app_suite_url, own_app_url, app_title, app_title_short, app_languages, DB, translations } = include('config/')
const { email: sendemail, sessionupdate, redirectBack, redirectError } = include('routes/helpers/')
const { error } = require('../..')
const { isPasswordSecure, createResetLink } = require('../../login')
const { updateRecord, confirmEmail } = require('./services')

module.exports =async (req, res) => {
	const { uuid, rights: session_rights, username, is_trusted, email: initiatorEmail } = req.session || {}
	let { id, teams, new_teams, fromBaseHost, ...userinfo  } = req.body || {}
	let { new_name: name, new_email: email, new_position: position, new_password: password, iso3, language, rights, reviewer, email_notifications: notifications, secondary_languages } = userinfo || {}
	if (teams && !Array.isArray(teams)) teams = [teams]
	if (new_teams && !Array.isArray(new_teams)) new_teams = [new_teams]
	if (secondary_languages && !Array.isArray(secondary_languages)) secondary_languages = [secondary_languages]

	fromBaseHost = fromBaseHost === 'true' || fromBaseHost === true;

	let logoutAll = false;
	let errorMessage = '';

	let redirect_url;
	const { protocol } = req
	const nextUrl = new URL(
		`${protocol}://${req.get('host')}/${language}/edit/contributor?id=${uuid}`
	);
	const nextParams = new URLSearchParams(nextUrl.search);

	if (id && password?.length) {
		let message = isPasswordSecure(password);
		if (message.length) {
			nextParams.set('errormessage', message);
			//fromBaseHost is used to determine if the request is coming from the base host or not
			if (fromBaseHost) {
				return res.status(400).json({
					status: 400,
					message: message
				});
			}
			return res.redirect(`${nextUrl.pathname}?${nextParams.toString()}`);
		}
	}
	if (!id) {
		password = password ?? (Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10));  // we always create a random password
		if(fromBaseHost){
			rights = 1
			language = 'en'
		}
		DB.general.tx(t => {
			if (Object.keys(userinfo).length) {
				return t.one(`
					INSERT INTO users (name, email, position, password, iso3, language, secondary_languages, rights, notifications, reviewer)
					VALUES ($1, $2, $3, crypt($4, GEN_SALT('bf', 8)), $5, $6, $7, $8, $9, $10)
					RETURNING uuid
				;`, [
					/* $1 */ name,
					/* $2 */ email,
					/* $3 */ position,
					/* $4 */ password,
					/* $5 */ iso3,
					/* $6 */ language,
					/* $7 */ JSON.stringify(secondary_languages || []),
					/* $8 */ rights,
					/* $9 */ true,  // notifications
					/* $10 */ reviewer || false
				], d => d.uuid)
				.then(result => {
					const batch = []
					//IF FROM BASE HOST, WE DO NOT CREATE A COHORT BECAUSE THE ACCOUNT IS SELF CREATED AND NOT CREATED BY SOMEONE ELSE
					if(!fromBaseHost) {
						batch.push(t.none(`
							INSERT INTO cohorts (contributor, host)
							VALUES ($1, $2)
						;`, [ result, uuid ]))


						if (modules.some(d => d.type === 'teams' && d.rights.write <= session_rights)) {
							if (new_teams?.length > 0) {
								const insert_teams = new_teams.map(d => {
									const obj = {}
									obj.host = uuid
									obj.name = d
									return obj
								})

								const sql = `${DB.pgp.helpers.insert(insert_teams, [ 'host', 'name' ], 'teams')} RETURNING id;`
								batch.push(t.any(sql)
								.then(results => {
									const team_members = results.map(d => {
										return [ result, uuid ].map(c => {
											const obj = {}
											obj.team = d.id
											obj.member = c
											return obj
										})
									}).flat()

									const sql = DB.pgp.helpers.insert(team_members, [ 'team', 'member' ], 'team_members')
									return t.none(sql)
									.catch(err => console.log(err))
								}).catch(err => console.log(err)))
							}
							if (teams?.length > 0) {
								teams.forEach(d => {
									batch.push(t.none(`
										INSERT INTO team_members (team, member)
										VALUES ($1, $2)
									;`, [ d, result ]))
								})
							}
						}
					}
					return t.batch(batch)
					.then(async _ => {
						// SEND EMAIL TO THE NEW USER
						// IF FROM  BASE HOST, WE DO NOT NEED TO SEND RESENT LINK AS THE USER IS CREATING THE ACCOUNT. HOWEVER, WE NEED TO SEND THE EMAIL NOTIFICATION
						if(fromBaseHost) {
							await sendemail({
								to: email,
								subject: `Welcome to SDG Commons!`,
								html: `
									<p>
									Hello ${name}!
									</p><p>
									Welcome to the <a href="${app_suite_url}">SDG Commons</a>.<br/>
									We are excited to share with you the SDG Commons of the UNDP Accelerator Labs.
									This platform is part of the
									<a href="${app_suite_url}">SDG Innovation Commons Suite</a>. With your account
									you have access to all its platforms.
									</p>
									The SDG Commons is a resource hub with data, insights, solutions and next practices for the Sustainable Development Goals (SDGs) powered by the UNDP Accelerator Labs. 
									<p>
									We appreciate your interest in advance and look forward to the possibility of collaborating closely on this initiative.
									</p>
								`,
							});
							return result;
						}else {
							const own_app = new URL(own_app_url)
							const resetLink = await createResetLink(own_app.protocol, own_app.hostname, email);
							if (result !== uuid) {
								// ALWAYS SEND EMAIL IN THIS CASE AS IT IS SOMEONE ELSE INTERVENING ON ACCOUNT INFORMATION
								const temail = translations['email notifications'];
								const platformName = (translations['app title']?.[app_title_short]?.[language] ?? translations['app title']?.[app_title_short]?.['en']) ?? app_title;
								const platformDesc = (translations['app desc']?.[app_title_short]?.[language] ?? translations['app desc']?.[app_title_short]?.['en']) ?? '';
								await sendemail({
									to: email,
									cc: initiatorEmail,
									subject: (temail['new user subject'][language] ?? temail['new user subject']['en'])(platformName),
									html: (temail['new user body'][language] ?? temail['new user body']['en'])(name, username, initiatorEmail, platformName, platformDesc, resetLink, own_app_url, app_suite_url),
								})
								return result
							} else return result
						}
					})
					.catch(err => console.log(err))
				}).catch(err => {
					console.log('There is a non-blocking error. Likely already a user with the same email account')
					console.log(err)
					return null
				})
			} else return null
		}).then(result => {
			if (result) {
				if( fromBaseHost) {
					return res.status(200).json({
						status: 200,
						message: 'Account created successfully. Please proceed to login with your email and password.',
						data: result
					});
				}

				res.redirect(`/${language}/edit/contributor?id=${result}`)
			}
			else { // TELL THE USER TO LOG IN OR USE A DIFFERENT EMAIL
				const message = 'It seems the email you want to use is already associated with an account. Please use a different email for the new account.' // TO DO: TRANSLATE
				if (fromBaseHost) {
					return res.status(400).json({
						status: 400,
						message: message
					});
				}
				errorMessage = message;
				nextParams.set('errormessage', message)
				res.redirect(`${nextUrl.pathname}?${nextParams.toString()}`);
			}
		}).catch(err => console.log(err))
	} else {
		DB.general.tx(async t => {
			const batch = []

			// CHECK IF THE CURRENT USER HAS THE RIGHT TO CHANGE VALUES
			if (Object.keys(userinfo).length) {
				batch.push(t.any(`
					SELECT c.host, u.name FROM cohorts c
					INNER JOIN users u
					ON u.uuid = c.host
					WHERE c.contributor = $1
				`, [ id ]).then(async results => {
					if (id === uuid || results.some(d => d.host === uuid) || session_rights > 2) {
						let update_pw = ''
						if ((id === uuid || session_rights > 2) && password?.trim().length > 0) update_pw = DB.pgp.as.format(`password = crypt($1, GEN_SALT('bf', 8)),`, [ password ])
						let update_rights = ''
						if ((results.some(d => d.host === uuid) || session_rights > 2) && ![undefined, null].includes(rights)) update_rights = DB.pgp.as.format('rights = $1,', [ rights ]) // ONLY HOSTS AND SUPER USERS CAN CHANGE THE USER RIGHTS

						const u_user = await t.oneOrNone(`SELECT email, name FROM users WHERE uuid = $1`, [id])

						//IF THE USER IS TRYING TO UPDATE THE EMAIL OR PASSWORD OR NAME, WE NEED TO CHECK IF THE USER IS TRUSTED AND LOG OUT EVERYWHERE
						if(u_user?.email != email || update_pw?.length > 0 || u_user.name != name){
							if (is_trusted || fromBaseHost) {
								console.log('User is trusted or from base host, proceeding with update')
								logoutAll = true;
								//IF EMAIL CHANGES, SEND CONFIRM EMAIL BEFORE UPDATING EMAIL
								if(u_user?.email != email){
									//TODO: UPDATE THE CONFIRM EMAIL LOGIC TO ALLOW CHANGE FROM BASE HOST
									confirmEmail({email, name: u_user.name, uuid: id, old_email: u_user?.email, req, fromBaseHost })
									if(!update_pw && u_user.name == name) logoutAll = false
									message = 'An email has been sent to your email address. Please confirm the email to proceed with the email update.'
									req.session.errormessage = message

									errorMessage = message
									redirect_url = `${nextUrl.pathname}?${nextParams.toString()}`
								}

								updateRecord({
									conn: t,
									data: [
										/* $1 */ name,
										/* $2 */ email,
										/* $3 */ position,
										/* $4 */ update_pw,
										/* $5 */ iso3,
										/* $6 */ language,
										/* $7 */ JSON.stringify(secondary_languages || []),
										/* $8 */ update_rights,
										/* $9 */ true,  // notifications
										/* $10 */ reviewer || false,
										/* $11 */ id
									]
								})
								.catch(err => {
									console.error(err)
									redirectError(req, res)
								})
							} else {
								const message = 'This action can only be authorized on trusted devices. Please log in from a trusted device'
								nextParams.set('u_errormessage', message);
								errorMessage = message
								redirect_url = `${nextUrl.pathname}?${nextParams.toString()}`
							}
						} else {
							return t.none(`
								UPDATE users
								SET name = $1,
									position = $3,
									iso3 = $5,
									language = $6,
									secondary_languages = $7,
									$8:raw
									notifications = $9,
									reviewer = $10
								WHERE uuid = $11
							;`, [
								/* $1 */ name,
								/* $2 */ email,
								/* $3 */ position,
								/* $4 */ 'NOT USED',
								/* $5 */ iso3,
								/* $6 */ language,
								/* $7 */ JSON.stringify(secondary_languages || []),
								/* $8 */ update_rights,
								/* $9 */ true,  // notifications
								/* $10 */ reviewer || false,
								/* $11 */ id
							])
						}
					} else return null
				}).catch(err => console.log(err)))
			}

			if (modules.some(d => d.type === 'teams' && d.rights.write <= session_rights)) {
				if (teams?.length > 0) {
					const team_members = teams.map(d => {
						const obj = {}
						obj.team = d
						obj.member = id
						return obj
					})
					const sql = `${DB.pgp.helpers.insert(team_members, [ 'team', 'member' ], 'team_members')} ON CONFLICT ON CONSTRAINT unique_team_member DO NOTHING;`
					batch.push(t.none(sql))

					// teams.forEach(d => {
					// 	batch.push(t.none(`
					// 		INSERT INTO team_members (team, member)
					// 		VALUES ($1, $2)
					// 		ON CONFLICT ON CONSTRAINT unique_team_member
					// 			DO NOTHING
					// 	;`, [ d, id ]))
					// })

				}
				if (new_teams?.length > 0) {
					const insert_teams = new_teams.map(d => {
						const obj = {}
						obj.host = uuid
						obj.name = d
						return obj
					})

					const sql = `${DB.pgp.helpers.insert(insert_teams, [ 'host', 'name' ], 'teams')} RETURNING id;`
					batch.push(t.any(sql)
					.then(results => {
						const team_members = results.map(d => {
							return [ id, uuid ].map(c => {
								const obj = {}
								obj.team = d.id
								obj.member = c
								return obj
							})
						}).flat()

						const sql = `${DB.pgp.helpers.insert(team_members, [ 'team', 'member' ], 'team_members')} ON CONFLICT ON CONSTRAINT unique_team_member DO NOTHING;`
						return t.none(sql)
						.then(_ => results)
						.catch(err => console.log(err))
					}).catch(err => console.log(err)))
				}
			}

			return t.batch(batch)
			.then(results => {
				const batch = []
				if (modules.some(d => d.type === 'teams' && d.rights.write <= session_rights)) {
					// DO ALL THE DELETES
					const new_teams_ids = results[results.length - 1]?.map(d => d.id)
					let sql = DB.pgp.as.format(`DELETE FROM team_members WHERE member = $1;`, [ id ])
					const allteams = (teams || []).concat(new_teams_ids || []).map(d => +d)
					if (allteams?.length > 0) sql = DB.pgp.as.format(`DELETE FROM team_members WHERE member = $1 AND team NOT IN ($2:csv);`, [ id, allteams ])

					batch.push(t.none(sql)
					.then(_ => {
						return t.none(`
							DELETE FROM teams t
							WHERE t.host = $1
								AND t.id IN (
									SELECT team
									FROM team_members
									GROUP BY team
									HAVING COUNT (member) = 1
									AND $1 = ANY (array_agg(member))
								)
						;`, [ uuid ]).catch(err => console.log(err))
					}).catch(err => console.log(err)))
				} else batch.push(null)

				return t.batch(batch)
				.then(async _ => {
					if (logoutAll) {
						// PASSWORD HAS BEEN RESET SO LOG OUT EVERYWHERE
						await sessionupdate({
							conn: t,
							whereClause: `sess ->> 'uuid' = $1`,
							queryValues: [id]
						})
					} else {
						// UPDATE THE SESSION DATA
						await t.one(`
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
						;`, [ app_languages, id ])
						.then(async result => {
							await sessionupdate({
								conn: t,
								whereClause: `sess ->> 'uuid' = $1`,
								queryValues: [id]
							})
						}).catch(err => console.log(err))
					}
					// SEND EMAIL IF THE CHANGES ARE NOT SELF-TRIGGERED
					if (id !== uuid) {
						// ALWAYS SEND EMAIL IN THIS CASE AS IT IS SOMEONE ELSE INTERVENING ON ACCOUNT INFORMATION
						const platformName = fromBaseHost ? 'SDG Commons' : translations['app title']?.[app_title_short]?.['en'] ?? app_title;
						await sendemail({
							to: email,
							subject: `[${platformName}] Your account information has been modified`,
							html: `Your account information has been modified by ${username} via the <a href="${ fromBaseHost ? app_suite_url : own_app_url}">${platformName}</a>.` // TO DO: TRANSLATE
						})
						return null
					} else return null
				}).catch(err => console.log(err))
			}).catch(err => console.log(err))
		}).then(_ => {
			if (fromBaseHost) {
				if(errorMessage?.length) {
					return res.status(400).json({
						status: 400,
						message: errorMessage
					});
				}
				return res.status(200).json({
					status: 200,
					message: 'Account updated successfully.',
					data: id
				});
			}
			else if (redirect_url) res.redirect(redirect_url)
			else redirectBack(req, res)
		}).catch(err => console.log(err))
	}
}
