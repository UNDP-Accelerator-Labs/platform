const { metafields, app_suite, DB } = include('config/')
const jwt = require('jsonwebtoken')
const { redirectBack } = require('../../helpers')

module.exports = (req, res) => {
	const token = req.body.token || req.query.token || req.headers['x-access-token']

	if (token) { // THE CONSENT IS A pdf COMING FROM THE CONSENT PLATFORM (OTHER APP IN THE SUITE) AND THE REQUEST IS COMMING FROM THAT APP
		const auth = jwt.verify(token, process.env.APP_SUITE_SECRET)
		if (!auth) res.json({ status: 403, message: 'You are not allowed to upload consent forms.' })
		else {
			var { uuid, resource_path: src, callback } = auth
			var { name, type, pad_id, element_id, referer } = callback
		}
	} else { // THE CONSENT IS A URL AND THE REQUEST IS COMING FROM THIS APP
		var { name, type, pad_id, element_id, src } = Object.keys(req.query)?.length ? req.query : Object.keys(req.body)?.length ? req.body : {}
		var { uuid } = req.session || {}
	}

	// STORE THE CONSENT INFORMATION
	if (uuid && src && pad_id) {
		return DB.conn.tx(t => {
			return t.one(`
				SELECT title, sections, template, status FROM pads
				WHERE id = $1::INT
			;`, [ pad_id ])
			.then(result => {
				let { title, sections, template, status } = result

				const limit = metafields.find(d => d.type === type && d.label === name)?.limit
				const resource = sections.find(d => d.items?.some(c => c.type === type && c.name === name && c.id === element_id) || d.items?.some(c => c.type === 'group' && c.items.some(b => b.type === type && b.name === name && b.id === element_id) ))
				if (!resource) return res.json({ status: 404, message: 'Something went wrong. The meta element information is incorrect.' })

				const completion = []
				completion.push(title?.trim().length > 0)

				if (![null, undefined].includes(template)) {
				// THE PAD IS TEMPLATED SO BASE THE requirements ON THE MANUALLY SET ONES
				// TO DO: MAKE SURE THIS IS NOW THE MAIN APPPROACH (NOT SURE)
					sections.forEach(d => {
						d.items.forEach(c => {
							if (d.type === 'group') {
								c.items.forEach(b => {
									if (b.required) completion.push(b.has_content || false)
								})
							} else {
								if (c.required) completion.push(c.has_content || false)
							}
						})
					})
				} else {
					metafields.filter(d => d.required && d.label !== name)
					.forEach(d => {
						// TO DO: MAKE SURE THIS WORKS
						completion.push(
							sections.map(c => {
								return c.items.map(b => {
									if (b.type === 'group') return b.items
									else return b
								})
							}).flat(2)
							.find(c => c.name === d.label)?.has_content
						|| false)
					})
				}
				if (completion.every(d => d === true)) status = Math.max(status, 1)

				if (![null, undefined].includes(resource)) { // IF THERE IS ALREADY A CONSENT ELEMENT, FIND IT AND UPDATE IT
					// TO DO: IMPROVE THIS BY LOOKING FOR THE id OF THE meta ELEMENT (PASSED FROM FRONT END)
					const item = resource.items.find(d => d.type === type && d.name === name && d.id === element_id)

					// TO DO: FOR GENERICITY, ESTABLISH A FRONT END MECHANISM FOR MULTIPLE attachment INPUT
					if (item.srcs) item.srcs.push(src)
					else item.srcs = [src]

					if (limit && item.srcs.length > limit) item.srcs.shift()

					item.has_content = true
					item.constraint = limit

					const batch = []
					batch.push(t.none(`
						UPDATE pads
						SET sections = $1::jsonb,
							status = $2::INT
						WHERE id = $3::INT
					;`, [ JSON.stringify(sections), status, pad_id ]))
					// ADD src TO metafields
					const metadata = item.srcs.map(d => {
						return { pad: pad_id, type: 'attachment', name, value: d }
					})
					const sql = DB.pgp.helpers.insert(metadata, ['pad', 'type', 'name', 'value'], 'metafields') // NO NEED TO PASS key HERE
					batch.push(t.none(`
						$1:raw
						ON CONFLICT ON CONSTRAINT pad_value_type
							DO NOTHING
					;`, [ sql ]))
					// REMOVE ALL OLD attachments
					const values = DB.pgp.helpers.values(metadata, ['type', 'name', 'value'])
					batch.push(t.none(`
						DELETE FROM metafields
						WHERE pad = $1::INT
							AND (type, name, value) NOT IN ($2:raw)
					;`, [ pad_id, values ]))

					return t.batch(batch)
					.catch(err => console.log(err))
				} else res.json({ status: 404, message: 'Something went wrong. There is no external resource meta element in the pad.' })
			}).catch(err => console.log(err))
		}).then(_ => {
			redirectBack(req, res)
		}).catch(err => console.log(err))
	} else res.json({ status: 404, message: 'Something went wrong. There is missing information.' })
}
