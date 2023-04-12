const { app_title, DB } = include('config/')
const { datastructures } = include('routes/helpers/')

module.exports = async (req, res) => {
	const { originalUrl, path } = req || {}
	const { errormessage } = req.session || {}
	
	// const contribute = /\/?\w{2}\/(contribute|edit)\//
	// const view = /\/?\w{2}\/(edit|view)\//

	// if (uuid) next() // A USER IS LOGGED
	// else if (token) this.process(req, res) // A LOGIN TOKEN IS RECEIVED
	// else if (object === 'pad') { // A POTENTIALLY PUBLIC PAD IS SOUGHT
	// 	const { id, mobilization } = req.query || {}
	// 	if (path.match(contribute) && mobilization) { // THE PAD IS NEW OR CAN BE EDITED
	// 		DB.conn.one(`SELECT public, language FROM mobilizations WHERE id = $1`, [ mobilization ])
	// 		.then(result => {
	// 			if (result.public === true) {
	// 				Object.assign(req.session, datastructures.sessiondata({ public: true }))
	// 				if (result.language !== language) res.redirect(originalUrl.replace(`/${language}/`, `/${result.language}/`))
	// 				else next()
	// 			} else res.render('login', { title: `${app_title} | Login`, originalUrl: req.originalUrl, errormessage: req.session.errormessage })
	// 		}).catch(err => console.log(err))
	// 	} else if (path.match(view) && id) { // THE PAD EXISTS AND CAN BE VIEWED
	// 		DB.conn.one(`SELECT status FROM pads WHERE id = $1::INT;`, [ id ], d => d.status)
	// 		.then(result => {
	// 			if (result === 3) {
	// 				Object.assign(req.session, datastructures.sessiondata({ public: true }))
	// 				next() // THE PAD IS OPEN/ PUBLIC
	// 			} else res.render('login', { title: `${app_title} | Login`, originalUrl: req.originalUrl, errormessage: req.session.errormessage })
	// 		}).catch(err => console.log(err))
	// 	} else res.render('login', { title: `${app_title} | Login`, originalUrl: req.originalUrl, errormessage: req.session.errormessage })

	// } else if (object === 'pads' && !uuid) { // THIS SHOULD ALWAYS BE A PUBLIC VIEW
	// 	if (space === 'public') next() 
	// 	else if (space === 'pinned') {
	// 		let { pinboard } = req.query
	// 		if (!pinboard) {
	// 			const referer = new URL(req.headers.referer)
	// 			pinboard = referer.searchParams.get('pinboard')
	// 		}
	// 		DB.conn.one(`SELECT status FROM pinboards WHERE id = $1;`, [ pinboard ], d => d?.status)
	// 		.then(result => {
	// 			if (result >= 2) next()
	// 			else res.render('login', { title: `${app_title} | Login`, originalUrl: req.originalUrl, errormessage: req.session.errormessage })
	// 		})
	// 	} else res.redirect('./public')
	
	

	// } else if (![null, undefined].includes(instance)) { // THIS IS FOR THE /:language/:instance PATH (FOR PUBLIC VIEW)
	// 	// CHECK IF INSTANCE IS IN COUNTRY LIST
	// 	// OR IN TEAMS LIST
	// 	return DB.general.tx(t => {
	// 		return t.oneOrNone(`
	// 			SELECT iso3, name FROM country_names
	// 			WHERE (iso3 = $1
	// 				OR LOWER(name) = LOWER($1))
	// 				AND language = $2
	// 			LIMIT 1
	// 		;`, [ decodeURI(instance), language ]) // CHECK WHETHER THE instance IS A COUNTRY
	// 		.then(result => {
	// 			if (!result) {
	// 				return t.oneOrNone(`
	// 					SELECT id, name FROM teams
	// 					WHERE LOWER(name) = LOWER($1)
	// 					LIMIT 1
	// 				;`, [ decodeURI(instance) ]) // CHECK WHETHER THE instance IS A TEAM: THE LIMIT 1 IS BECAUSE THERE IS NO UNIQUE CLAUSE FOR A TEAM NAME
	// 				.then(result => {
	// 					if (!result) {
	// 						return DB.conn.oneOrNone(`
	// 							SELECT id, title FROM pinboards
	// 							WHERE LOWER(title) = LOWER($1)
	// 								AND status >= 2
	// 							LIMIT 1
	// 						;`, [ decodeURI(instance) ])  // CHECK WHETHER THE instance IS A PINBOARD: THE LIMIT 1 IS BECAUSE THERE IS NO UNIQUE CLAUSE FOR A TEAM NAME
	// 						.then(result => {
	// 							if (result) {
	// 								res.locals.instance_vars = { activity: 'browse', object: 'pads', space: 'pinned', pinboard: result?.id, title: result?.title }
	// 								return result
	// 							} else return null
	// 						}).catch(err => console.log(err))
	// 					} else {
	// 						res.locals.instance_vars = { activity: 'browse', object: 'pads', space: 'public', teams: [result?.id], title: result?.name }
	// 						return result
	// 					}
	// 				}).catch(err => console.log(err))
	// 			} else {
	// 				res.locals.instance_vars = { activity: 'browse', object: 'pads', space: 'public', countries: [result?.iso3], title: result?.name }
	// 				return result
	// 			}
	// 		}).catch(err => console.log(err))
	// 	}).then(result => {
	// 		if (result) next()
	// 		else res.render('login', { title: `${app_title} | Login`, originalUrl: req.originalUrl, errormessage: req.session.errormessage })
	// 	}).catch(err => console.log(err))
	// }
	// else res.render('login', { title: `${app_title} | Login`, originalUrl: req.originalUrl, errormessage: req.session.errormessage })
	
	const metadata = await datastructures.pagemetadata({ req, res })
	const data = Object.assign(metadata, { originalUrl, errormessage })

	res.render('login', data)
}