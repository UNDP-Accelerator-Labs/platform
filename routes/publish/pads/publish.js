const { modules, DB } = include('config/')
const { checklanguage, safeArr, DEFAULT_UUID, redirectBack, embed_document } = include('routes/helpers/')
const jwt = require('jsonwebtoken')

module.exports = (req, res) => {
	const req_token = req.body.token || req.query.token || req.headers['x-access-token']
	const { referer } = req.headers || {}
	let { id, limit, status } = req.query || {}
	if (!Array.isArray(id)) id = [id]
	const { uuid, rights, collaborators } = req.session || {}

	const language = checklanguage(req.params?.language || req.query.language || req.body.language || req.session.language)
	const collaborators_ids = safeArr(collaborators.map(d => d.uuid), uuid ?? DEFAULT_UUID)

	let redirect = undefined

	if (req_token) {
		const auth = jwt.verify(req_token, process.env.APP_SUITE_SECRET)
		if (!auth) return res.json({ status: 403, message: 'The token is no longer valid.' })
		else {
			const { callback } = auth
			if (callback?.referer && callback?.endpoint) {
				const { referer: cb_referer, endpoint } = callback

				const referer_url = new URL(referer)
				const path = `/${language}/view/pad?id=${id}`
				const src = new URL(path, referer_url.origin).href

				const res_token = jwt.sign({ uuid, callback, resource_path: src }, process.env.APP_SUITE_SECRET, { expiresIn: 15 * 60 }) // EXPIRES IN 15 MINUTES

				const { origin } = new URL(cb_referer)
				const callbackurl = new URL(endpoint, origin)
				const queryparams = new URLSearchParams(callbackurl.search)
				queryparams.set('token', res_token)

				redirect = `${callbackurl.href}?${queryparams.toString()}`

			} else return res.json({ status: 403, message: 'There is no callback to the request.' })
		}
	}

	// EXECUTE SQL
	DB.conn.tx(t => {
		const batch = []

		if (status) {
			if (id?.length > 0) {
				batch.push(t.none(`
					UPDATE pads
						SET status = $1::INT
					WHERE id IN ($2:csv)
						AND status >= 1
						AND (owner IN ($3:csv)
							OR $4 > 2)
				;`, [ status, id, collaborators_ids, rights ]))

				if (+status < 2) {
					// THE USER IS RETRACTING THE PAD SO IT NEEDS TO BE REMOVED FROM THE review_requests
					batch.push(t.none(`DELETE FROM review_requests WHERE pad IN ($1:csv);`, [ id ]))
				} else if (+status >= 2) {
					batch.push(t.none(`
						UPDATE templates
						SET status = 2
						WHERE id IN (SELECT template FROM pads WHERE id IN ($1:csv))
					;`, [ id ]))
				}
			} else { // PUBLISH ALL
				// MAKE SURE WE ARE NOT PUBLISHING MORE THAN THE LIMIT (IF THERE IS A LIMIT)
				batch.push(t.none(`
					UPDATE pads
						SET status = $1::INT
					WHERE id IN (
						SELECT id FROM pads
						WHERE status >= 1
							AND (owner IN ($2:csv)
							OR $3 > 2)
						LIMIT $4
					)
				;`, [ status, collaborators_ids, rights, limit ]))
			}
		}

		return t.batch(batch)
		.then(_ => {
			for (const i of id) {
				//EMBED DOCUMENT
				embed_document(i)
			}
			if (redirect) res.redirect(redirect)
			else redirectBack(req, res)
		}).catch(err => console.log(err))
	})
}
