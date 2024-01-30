const { DB } = include('config/')
const { checklanguage, datastructures, redirectUnauthorized } = include('routes/helpers/')

const check_authorization = require('./authorization.js')
const load = require('./load/')

module.exports = (req, res) => {
	const { uuid, rights, public } = req.session || {}

	if (public) redirectUnauthorized(req, res)
	else {
		const { id, display } = req.query || {}
		const path = req.path.substring(1).split('/')
		const activity = path[1]

		DB.conn.tx(async t => {
			// CHECK IF THE USER IS ALLOWED TO CONTRIBUTE A TEMPLATE
			return check_authorization({ connection: t, uuid, id, rights })
			.then(async result => {
				const { authorized, redirect } = result
				if (!authorized) {
					return redirectUnauthorized(req, res)
				} else if (authorized && redirect && redirect !== activity) {
					const language = checklanguage(req.params?.language || req.session.language)
					const query = new URLSearchParams(req.query || {});
					return res.redirect(`/${language}/${redirect}/mobilization?${query.toString()}`)
				} else {
					if (display === 'stats') {
						return load.stats({ connection: t, req, authorized: true })
						.then(async results => {
							const metadata = await datastructures.pagemetadata({ connection: t, req })
							const data = Object.assign(metadata, results)
							res.status(200).render('contribute/mobilization/stats.ejs', data)
						}).catch(err => console.log(err))
					} else {
						// LOAD DATA
						return load.data({ connection: t, req, authorized: true })
						.then(async results => {
							const metadata = await datastructures.pagemetadata({ connection: t, req })
							const data = Object.assign(metadata, results)
							res.status(200).render('contribute/mobilization/', data)
						}).catch(err => console.log(err))
					}
				}
			}).catch(err => console.log(err))
		}).catch(err => console.log(err))
	}
}
