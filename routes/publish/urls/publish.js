const { DB } = include('config/')

module.exports = (req, res) => {
	const { referer } = req.headers || {}
	const { pathname } = Object.keys(req.query)?.length ? req.query : Object.keys(req.body)?.length ? req.body : {}

	const isused = req.app._router.stack.some(r => {
		if (r.route?.path) return r.route.path.replace('/:language', '').substring(1).includes(pathname)
	})

	if (pathname.length > 99) return res.json({ status: 500, message: 'This name is too long. Please choose another.' })
	else if (isused) return res.json({ status: 500, message: 'This name is already used. Please choose another.' })
	else {
		return DB.general.tx(t => {
			return t.oneOrNone(`
				SELECT TRUE AS bool
				FROM adm0_subunits
				WHERE LOWER(su_a3) = LOWER($1)
					OR LOWER(adm0_a3) = LOWER($1)
				LIMIT 1
			;`, [ pathname ], d => d.bool)
			.then(result => {
				if (result) return res.json({ status: 500, message: 'This name is already used. Please choose another.' })
				else {
					return t.oneOrNone(`
						SELECT TRUE AS bool FROM teams
						WHERE LOWER(name) = LOWER($1)
						LIMIT 1
					;`, [ pathname ], d => d.bool)
					.then(result => {
						if (result) return res.json({ status: 500, message: 'This name is already used. Please choose another.' })
						else {

							// TO DO: UPSERT
							return DB.conn.none(`
								INSERT INTO instance_urls (url, pathname)
								VALUES ($1, $2)
							;`, [ pathname, referer ])
							.then(_ => res.json({ status: 200, message: 'URL successfully assigned.' }))
							.catch(err => console.log(err))
						}
					}).catch(err => console.log(err))
				}
			}).catch(err => console.log(err))
		}).catch(err => console.log(err))
	}
}