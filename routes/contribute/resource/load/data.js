const { modules, DB } = include('config/')
const { checklanguage, flatObj, join, datastructures, safeArr, DEFAULT_UUID } = include('routes/helpers/')

module.exports = kwargs => {
	const conn = kwargs.connection ? kwargs.connection : DB.conn
	let { req, authorized } = kwargs || {}

	const { uuid, rights, collaborators } = req.session || {}

	let { modules: req_modules } = req.body || {}
	if (!req_modules) req_modules = [ 'pads', 'templates', 'files', 'reviews' ]
	else if (req_modules && !Array.isArray(req_modules)) req_modules = [req_modules]
	
	const language = checklanguage(req.params?.language || req.query.language || req.body.language || req.session.language)
	const collaborators_ids = safeArr(collaborators.map(d => d.uuid), uuid ?? DEFAULT_UUID)

	return conn.task(t => {
		const batch = []
		batch.push(t.task(t1 => {
			return t1.batch(req_modules.map(d => {
				if (modules.some(c => c.type === d && c.rights.read <= rights)) {
					if (d === 'pads') {
						return t1.any(`
							SELECT id, title, owner FROM pads
							WHERE status > 2
								AND owner IN ($1:csv)
							ORDER BY date DESC
						;`, [ collaborators_ids, rights ])
						.then(async pads => { 
							if (pads.length) {
								// IF sudo USER, JOIN PAD owner INFORMATION
								pads = await join.users(pads, [ language, 'owner' ])
								pads.forEach(d => { if (d.owner === uuid) delete d.ownername })
								return { pads } 
							} else return null
						}).catch(err => console.log(err))
					} else if (d === 'templates') {
						return t1.any(`
							SELECT id, title, owner FROM templates
							WHERE status > 2
								AND owner IN ($1:csv)
							ORDER BY date DESC
						;`, [ collaborators_ids ])
						.then(async templates => { 
							if (templates.length) {
								// IF sudo USER, JOIN TEMPLATE owner INFORMATION
								templates = await join.users(templates, [ language, 'owner' ])
								return { templates } 
							} else return null
						}).catch(err => console.log(err))
					} else if (d === 'files') {
						return t1.any(`
							SELECT id, name, owner, path FROM files
							WHERE status > 0
								AND owner IN ($1:csv)
							ORDER BY date DESC
						;`, [ collaborators_ids ])
						.then(async files => { 
							if (files.length) {
								// IF sudo USER, JOIN FILE owner INFORMATION
								files = await join.users(files, [ language, 'owner' ])
								files.forEach(d => { if (d.owner === uuid) delete d.ownername })
								return { files } 
							} else return null
						}).catch(err => console.log(err))
					} else if (d === 'reviews') {
						return t1.any(`
							SELECT id, title, owner FROM pads
							WHERE status > 2
								AND id IN (SELECT pad FROM reviews 
									WHERE reviewer = $1)
							ORDER BY date DESC
						;`, [ uuid ])
						.then(async reviews => { 
							if (reviews.length) {
								// IF sudo USER, JOIN PAD owner INFORMATION
								reviews = await join.users(reviews, [ language, 'owner' ])
								return { reviews } 
							} else return null
						}).catch(err => console.log(err))
					} else return null
					// CANNOT BE THIS SIMPLE UNFORTUNATELY
					// MUST BE DONE INDIVIDUALLY FOR EACH MODULE (BECAUSE OF THE REVIEWS STRUCTURE)
				} else return null
			})).then(results => flatObj.call(results.filter(d => d)))
			.catch(err => console.log(err))
		}))

		batch.push(t.task(t1 => {
			return t1.batch(req_modules.map(d => {
				if (modules.some(c => {
					let { write } = c.rights
					if (typeof write === 'object') write = write.templated
					return c.type === d && write <= rights
				})) {
					if (d === 'pads') {
						return t1.any(`
							SELECT id, title, owner
							FROM templates 
							WHERE status >= 2
								AND id NOT IN (SELECT template FROM review_templates)
							ORDER BY date DESC
						;`).then(async pads => { 
							if (pads.length) {
								// IF sudo USER, JOIN PAD owner INFORMATION
								pads = await join.users(pads, [ language, 'owner' ])
								pads.forEach(d => { if (d.owner === uuid) delete d.ownername })
							}
							return { pads } 
						}).catch(err => console.log(err))
					} else return null
					/* else if (d === 'reviews') {
						return t1.any(`
							SELECT t.id, t.title, t.owner 
							FROM templates t
							INNER JOIN review_templates rt
								ON rt.template = t.id 
							WHERE t.status >= 2
						;`).then(reviews => { return { reviews } })
						.catch(err => console.log(err))
					} */
				} else return null
			})).then(results => flatObj.call(results))
			.catch(err => console.log(err))
		}))

		return t.batch(batch)
		.catch(err => console.log(err))
	}).catch(err => console.log(err))
}