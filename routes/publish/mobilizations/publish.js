const { DB } = include('config')
const { checklanguage, email: sendemail } = include('routes/helpers/')

exports.main = (req, res) => {
	let { title, description, cohort, template, public } = req.body || {}
	if (title.length > 99) title = `${title.slice(0, 96)}…`
	if (!Array.isArray(cohort)) cohort = [cohort]
	
	const { uuid } = req.session || {}
	const language = checklanguage(req.params?.language || req.session.language)

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
				batch.push(t.one(`
					INSERT INTO pinboards (title, description, owner, status, mobilization)
					VALUES ($1, $2, $3, 3, $4::INT)
					RETURNING id
				;`, [ title, description, uuid, id ], d => d.id)
				.then(result => {
					return t.none(`
						INSERT INTO pinboard_contributors (pinboard, participant)
						VALUES ($1::INT, $2)
					;`, [ result, uuid ])
				}).catch(err => console.log(err)))
			}

			return t.batch(batch)
			.then(_ => {
				const batch = []

				if (!public) {
					// SEND EMAILS TO THOSE WHO ACCEPT NOTIFICATIONS (IN bcc FOR ONLY ONE EMAIL)
					batch.push(DB.general.any(`
						SELECT email FROM users 
						WHERE uuid IN ($1:csv)
							AND notifications = TRUE
					;`, [ cohort ]).then(async results => {
						await sendemail({
							to: 'myjyby@gmail.com',// TO DO: CHANGE TO email, 
							bcc: results.map(d => d.email),
							subject: `New mobilization`,
							html: `Dear contributor, you are invited to participate in a new mobilization. 
								Below you will find some information about the mobilziation.
								<br><br>${title}<br>${description}` // TO DO: TRANSLATE AND STYLIZE
						})
						// SEE https://stackoverflow.com/questions/57675265/how-to-send-an-email-in-bcc-using-nodemailer FOR bcc
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
		})
	}).then(_ => res.redirect(`/${language}/browse/mobilizations/ongoing`))
	.catch(err => console.log(err))
}