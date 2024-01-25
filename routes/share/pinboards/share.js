const { DB, own_app_url, app_title, app_title_short, translations } = include('config/')
const { email: sendemail, safeArr, DEFAULT_UUID, redirectUnauthorized } = include('routes/helpers/')

module.exports = (req, res) => {
	const { referer } = req.headers || {}
	let { contributor, pinboard } = req.body || {}
	const { uuid, username } = req.session || {}

	if (!Array.isArray(contributor)) contributor = [contributor]
	const data = contributor.map(d => {
		const obj = {}
		obj.pinboard = pinboard
		obj.participant = d
		return obj
	})

	DB.general.tx(t => {
		const batch = []
		const sql = `${DB.pgp.helpers.insert(data, [ 'pinboard', 'participant' ], 'pinboard_contributors')} ON CONFLICT ON CONSTRAINT pinboard_contributors_pkey DO NOTHING;`
		batch.push(t.none(sql))
		batch.push(t.none(`
			DELETE FROM pinboard_contributors
			WHERE pinboard = $1::INT
				AND participant NOT IN ($2:csv)
				AND participant NOT IN (SELECT owner FROM pinboards WHERE id = $1::INT)
		;`, [ pinboard, safeArr(contributor, DEFAULT_UUID) ]))
		return t.batch(batch)
		.then(_ => {
			return t.one(`SELECT title FROM pinboards WHERE id = $1::INT;`, [ pinboard ])
			.then(result => {
				const { title } = result
				return t.any(`
					SELECT email FROM users
					WHERE uuid IN ($1:csv)
						AND uuid <> $2
						AND notifications = TRUE
				;`, [ safeArr(contributor, DEFAULT_UUID), uuid ])
				.then(results => {
					const platformName = translations['app title']?.[app_title_short]?.['en'] ?? app_title;
					// SEND EMAIL NOTIFICATION
					// NEED TO CHECK IF EMAIL NOTIFICATIONS IS ACTIVATED
					return Promise.all(results.map(d => {
						sendemail({
							to: d.email,
							subject: `[${platformName}] Collections`,
							html: `Dear contributor, ${username} has shared with you the follow collection on the <a href="${own_app_url}">${platformName}</a>:
								<br><br><strong>${title}</strong>
								<br><br>Please click <a href='${referer}'>this link</a> to view the collection.` // TO DO: TRANSLATE AND STYLIZE
						})
					})).then(_ => {
						if (referer) res.redirect(referer)
						else redirectUnauthorized(req, res)
					}).catch(err => console.log(err))
				}).catch(err => console.log(err))
			}).catch(err => console.log(err))
		}).catch(err => console.log(err))
	}).catch(err => console.log(err))
}
