const { metafields, modules, app_suite, DB } = include('config/')
const jwt = require('jsonwebtoken')

module.exports = (req, res) => {
	// THIS IS TO REQUEST INFORMATION
	const { uuid, rights } = req.session || {}
	const { uri, resources, pad_id, element_id, name, type } = req.query || {}
	const { host, referer } = req.headers || {}

	// GET THE USER INFO TO SEND TO THE CONSENT MANAGEMENT PLATFORM
	// WE NEED THE email, THE ID OF THE pad (THIS NMEANS THE PAD NEEDS TO BE SAVED BEFORE ADDING THE CONSENT)
	let { write } = modules.find(d => d.type === 'pads')?.rights
	if (typeof write === 'object') write = Math.min(write.blank ?? Infinity, write.templated ?? Infinity)

	if (pad_id && rights >= write) {
		
		// const token = jwt.sign({ uuid, callback: { pad_id, name, host, referer, uuid }, authorization: [ 'api' ] }, process.env.APP_SUITE_SECRET, { expiresIn: 15 * 60 }) // EXPIRES IN 15 MINUTES

		const token = jwt.sign(
			{ 
				uuid, 
				resources,
				callback: { 
					pad_id, 
					element_id,
					name, 
					type,
					host, 
					endpoint: '/save/resource', 
					referer, 
					uuid
				} 
			}, 
			process.env.APP_SUITE_SECRET, 
			{ 
				expiresIn: 15 * 60 
			}
		) // EXPIRES IN 15 MINUTES
		// TO DO: CHECK AGAIN WHAT issuer AND audience DOES
		// const token = jwt.sign({ uuid, rights }, process.env.APP_SECRET, { audience: 'user:known', issuer: host })
		res.redirect(`${uri}?token=${encodeURIComponent(token)}`)

	} else res.json({ status: 403, message: 'You need to save your pad before joining a file.' })
}
