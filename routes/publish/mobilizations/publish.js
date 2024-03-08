const { own_app_url, app_suite_url, app_title_short, app_title, DB, ownDB, translations } = include('config/');
const { checklanguage, email: sendemail, safeArr, DEFAULT_UUID, limitLength } = include('routes/helpers/')

const cron = require('node-cron')

module.exports = (req, res) => {
	const { username: creator, email: creatorEmail } = req.session || {}
	let { title, description, source, cohort, template, public, start_date, end_date } = req.body || {}
	if (title) title = limitLength(title, 99);
	if (!Array.isArray(cohort)) cohort = [cohort]
	if (start_date) start_date = new Date(start_date)
	if (end_date) end_date = new Date(end_date)

	const { uuid, email } = req.session || {}
	const language = checklanguage(req.params?.language || req.session.language)

	const use_bcc = false

	DB.conn.tx(t => { // INSERT THE NEW MOBILIZATION
		// INSPIRED BY https://stackoverflow.com/questions/38750705/filter-object-properties-by-key-in-es6
		const insert = Object.keys(req.body)
			.filter(key => !['cohort'].includes(key))
			.reduce((obj, key) => {
				obj[key] = req.body[key]
				return obj
			}, {})

		saveSQL = DB.pgp.as.format(`
			INSERT INTO $1:name ($2:name, owner)
			SELECT $2:csv, $3
			RETURNING $1:name.id
		;`, [ 'mobilizations', insert, uuid ])

		return t.one(saveSQL)
		.then(result => { // INSERT THE COHORT FOR THE MOBILIZATION
			const { id } = result
			const batch = []

			// TO DO: TO OPTIMIZE THE CRON JOBS, KEEP TRACK OF THE UNIQUE mobilization-job(s) IN CASE THE MOBILIZATION IS ENDED PREMATURELY OR DELETED
			// IF THE MOBILIZATION IS SCHEDULED FOR A LATER DATE, SET UP A CRON JOB
			const now = new Date()
			if (start_date && start_date >= now) {
				const min = start_date.getMinutes()
				const hour = start_date.getHours()
				const day = start_date.getDate()
				const month = start_date.getMonth() + 1
				const year = start_date.getFullYear()

				cron.schedule(`${min} ${hour} ${day} ${month} *`, function () {
					DB.conn.none(`
						UPDATE mobilizations
						SET status = 1
						WHERE id = $1
					;`, [ id ])
					.catch(err => console.log(err))
				})
			}
			// IF THE MOBILIZATION HAS AN END DATE, SET UP A CRON JOB
			if (end_date && end_date >= now) {
				const min = end_date.getMinutes()
				const hour = end_date.getHours()
				const day = end_date.getDate()
				const month = end_date.getMonth() + 1
				const year = end_date.getFullYear()

				cron.schedule(`${min} ${hour} ${day} ${month} *`, function () {
					DB.conn.none(`
						UPDATE mobilizations
						SET status = 2
						WHERE id = $1
					;`, [ id ])
					.catch(err => console.log(err))
				})
			}

			if (!public) {
				cohort.forEach(d => {
					batch.push(t.none(`
						INSERT INTO mobilization_contributors (participant, mobilization)
						VALUES ($1, $2::INT)
					;`, [ d, id ]))
				})
				// ADD THE HOST OF THE MOBIILIZATION BY DEFAULT
				if (!cohort.some(d => d === uuid)) {
					batch.push(t.none(`
						INSERT INTO mobilization_contributors (participant, mobilization)
						VALUES ($1, $2::INT)
					;`, [ uuid, id ]))
				}
			} else {
				// AUTOMATICALLY CREATE A PUBLIC PINBOARD FOR THIS MOBILIZATION
				batch.push(ownDB().then(async ownId => {
					const result = await DB.general.one(`
						INSERT INTO pinboards (title, description, owner, status, mobilization, mobilization_db)
						VALUES ($1, $2, $3, 3, $4::INT, $5)
						RETURNING id
					;`, [ title, description, uuid, id, ownId ], d => d.id)
					return DB.general.none(`
						INSERT INTO pinboard_contributors (pinboard, participant)
						VALUES ($1::INT, $2)
						ON CONFLICT ON CONSTRAINT pinboard_contributors_pkey
							DO NOTHING
					;`, [ result, uuid ])
				}).catch(err => console.log(err)))
			}

			// SAVE VERSION TREE
			if (source) {
				batch.push(t.none(`
					UPDATE mobilizations
					SET version = source.version || $1::TEXT
					FROM (SELECT id, version FROM mobilizations) AS source
					WHERE mobilizations.id = $1::INT
						AND source.id = mobilizations.source
				;`, [ id ]))
			} else {
				batch.push(t.none(`
					UPDATE mobilizations
					SET version = '$1'::ltree
					WHERE id = $1::INT
				;`, [ id ]))
			}


			return t.batch(batch)
			.then(_ => {
				const batch = []

				if (!public) {
					// SEND EMAILS TO THOSE WHO ACCEPT NOTIFICATIONS (IN bcc FOR ONLY ONE EMAIL)
					batch.push(DB.general.any(`
						SELECT DISTINCT email FROM users
						WHERE uuid IN ($1:csv)
							AND uuid <> $2
							AND notifications = TRUE
					;`, [ safeArr(cohort, DEFAULT_UUID) , uuid ])
					.then(results => {
						if (use_bcc) {
							let bcc = results.map(d => d.email)

							const sendChunk = async () => {
								if (!bcc.length) {
									return;
								} else {
									const chunk = bcc.slice(0, 10);
									bcc = bcc.slice(10);

									// ALWAYS SEND EMAIL IN THIS CASE AS IT IS SOMEONE ELSE INTERVENING ON ACCOUNT INFORMATION
									const temail = translations['email notifications'];
									const platformName = (translations['app title']?.[app_title_short]?.[language] ?? translations['app title']?.[app_title_short]?.['en']) ?? app_title;
									const platformDesc = (translations['app desc']?.[app_title_short]?.[language] ?? translations['app desc']?.[app_title_short]?.['en']) ?? '';
									const esubject = temail['mobilization invitation subject'][language] ?? temail['mobilization invitation subject']['en']
									const ebody = temail['mobilization invitation body'][language] ?? temail['mobilization invitation body']['en']
									await sendemail({
										to: creatorEmail,
										bcc: chunk.join(','),
										subject: (esubject)(platformName),
										html: (ebody)(own_app_url, platformName, app_suite_url, title, description, creatorEmail, creator, `${own_app_url}/en/contribute/pad?mobilization=${id}&template=${template}`),
									});
									setTimeout(sendChunk, 2000);
								}
							}
							setTimeout(sendChunk, 2000);
							return false
						} else {
							let emails = results.map(d => d.email)
							emails.push(creatorEmail)

							const sendIndividualEmail = async () => {
								if (!emails.length) {
									return;
								} else {
									const to_email = emails[0];
									emails = emails.slice(1);

									// ALWAYS SEND EMAIL IN THIS CASE AS IT IS SOMEONE ELSE INTERVENING ON ACCOUNT INFORMATION
									const temail = translations['email notifications'];
									const platformName = (translations['app title']?.[app_title_short]?.[language] ?? translations['app title']?.[app_title_short]?.['en']) ?? app_title;
									const platformDesc = (translations['app desc']?.[app_title_short]?.[language] ?? translations['app desc']?.[app_title_short]?.['en']) ?? '';
									const esubject = temail['mobilization invitation subject'][language] ?? temail['mobilization invitation subject']['en']
									const ebody = temail['mobilization invitation body'][language] ?? temail['mobilization invitation body']['en']
									await sendemail({
										to: to_email,
										subject: (esubject)(platformName),
										html: (ebody)(own_app_url, platformName, app_suite_url, title, description, creatorEmail, creator, `${own_app_url}/en/contribute/pad?mobilization=${id}&template=${template}`),
									});
									setTimeout(sendIndividualEmail, 2000);
								}
								setTimeout(sendIndividualEmail, 2000);
								return false
							}
						}
					}).catch(err => console.log(err)))
				}

				// PUBLISH THE TEMPLATE USED
				batch.push(t.none(`
					UPDATE templates
					SET status = 2
					WHERE id = $1::INT
				;`, [ template ]))
				return t.batch(batch)
				.catch(err => console.log(err))
			}).catch(err => console.log(err))
		}).catch(err => console.log(err))
	}).then(_ => res.redirect(`/${language}/browse/mobilizations/ongoing`))
	.catch(err => console.log(err))
}
