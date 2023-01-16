const { metafields, app_suite, DB } = include('config')
const jwt = require('jsonwebtoken')

exports.main = (req, res) => {
	const { method } = req
	if (method === 'GET') GET(req, res)
	else if (method === 'POST') POST(req, res)
}
function GET (req, res) {
	const { uuid } = req.session || {}
	const { uri, join_id, name } = req.query || {}
	const { host, referer } = req.headers || {}

	// GET THE USER INFO TO SEND TO THE CONSENT MANAGEMENT PLATFORM
	// WE NEED THE email, THE ID OF THE pad (THIS NMEANS THE PAD NEEDS TO BE SAVED BEFORE ADDING THE CONSENT)
	if (join_id) {
		DB.general.one(`
			SELECT email FROM users WHERE uuid = $1
		;`, [ uuid ])
		.then(result => {
			if (result) {
				const token = jwt.sign({ email: result.email, callback: { join_id, name, host, referer, uuid }, authorization: [ 'api' ] }, process.env.ACCLAB_PLATFORM_KEY, { expiresIn: 60 * 60 })
				res.redirect(`${uri}?origin=${app_suite}&token=${encodeURIComponent(token)}`)

			} else res.json({ status: 403, message: 'You are not allowed to upload consent forms.' })
		}).catch(err => console.log(err))
	} else res.json({ status: 403, message: 'You need to save your pad before joining a file.' })
}
function POST (req, res) {
	const token = req.body.token || req.query.token || req.headers['x-access-token']

	if (token) { // THE CONSENT IS A pdf COMING FROM THE CONSENT PLATFORM (OTHER APP IN THE SUITE) AND THE REQUEST IS COMMING FROM THAT APP
		const auth = jwt.verify(token, process.env.ACCLAB_PLATFORM_KEY)
		if (!auth) res.json({ status: 403, message: 'You are not allowed to upload consent forms.' })
		else {
			var join_id = auth.join_id
			var src = auth.file_path
			var uuid = auth.uuid
			var name = auth.name
		}
	} else { // THE CONSENT IS A URL AND THE REQUEST IS COMING FROM THIS APP
		var { name, join_id, src } = req.body || {}
		var { uuid } = req.session || {}
	}

	// STORE THE CONSENT INFORMATION
	if (uuid && src && join_id) {
		return DB.conn.tx(t => {
			return t.one(`
				SELECT title, sections, template, status FROM pads
				WHERE id = $1::INT
			;`, [ join_id ]) 
			.then(result => {
				let { title, sections, template, status } = result
				const resource = sections.find(d => d.items?.find(c => c.type === 'attachment'))

				const completion = []
				completion.push(title?.trim().length > 0)
				if (![null, undefined].includes(template)) { // THE PAD IS TEMPLATED SO BASE THE requirements ON THE MANUALLY SET ONES
					sections.forEach(d => {
						d.items.forEach(c => {
							if (c.required) completion.push(c.has_content || false)
						})
					})
				} else {
					metafields.filter(d => d.required && d.label !== name)
					.forEach(d => {
						completion.push(sections.map(c => c.items).flat().find(c => c.name === d.label)?.has_content || false)
					})
				}
				if (completion.every(d => d === true)) status = Math.max(status, 1)
				
				if (![null, undefined].includes(resource)) { // IF THERE IS ALREADY A CONSENT ELEMENT, FIND IT AND UPDATE IT
					const item = resource.items.find(d => d.type === 'attachment')
					// if (resource.srcs) item.srcs.push(src)
					// else item.srcs = [src]
					
					// ALWAYS RESET srcs HERE
					// TO DO: ESTABLISH A FRONT END MECHANISM FOR MULTIPLE attachment INPUT
					// NOTE THIS IS NOT NEEDED RIGHT NOW
					item.srcs = [src]
					item.has_content = true

					return t.none(`
						UPDATE pads 
						SET sections = $1::jsonb,
							status = $2::INT
						WHERE id = $3::INT
					;`, [ JSON.stringify(sections), status, join_id ])
				} else res.json({ status: 404, message: 'Something went wrong. There is no external resource meta element in the pad.' })
			})
		}).then(res.json({ status: 200 }))
		.catch(err => console.log(err))
	} else res.json({ status: 404, message: 'Something went wrong. There is missing information.' })
}