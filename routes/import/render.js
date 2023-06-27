const { modules, metafields, DB } = include('config/')
const { checklanguage, flatObj, datastructures } = include('routes/helpers/')

module.exports = async (req, res) => {
	const { referer } = req.headers || {}
	const { object } = req.params || {}
	let { uuid, rights } = req.session || {}
	const language = checklanguage(req.params?.language || req.session.language)

	const { authorized } = check_authorization({ rights })
	
	if (!authorized) {
		if (referer) return res.redirect(referer)
		else res.redirect('/login')
	} else {
		DB.general.task(t => {
			const batch1 = metafields.filter(d => ['tag', 'index'].includes(d.type))
			.map(d => {
				return t.any(`
					SELECT id, key, name, type FROM tags 
					WHERE type = $1
						AND language = (COALESCE((SELECT language FROM tags WHERE type = $1 AND language = $2 LIMIT 1), 'en'))
				;`, [ d.label, language ])
				.then(results => {
					const obj = {}
					obj[d.label] = results
					return obj
				}).catch(err => console.log(err))
			})
			return t.batch(batch1)
			.then(results => {
				return flatObj.call(results)
			}).catch(err => console.log(err))
		}).then(async tags => {
			const metadata = await datastructures.pagemetadata({ req })
			return Object.assign(metadata, { tags })
		}).then(data => res.render('import', data))
		.catch(err => console.log(err))
	}
}
function check_authorization (_kwargs) {
	const { rights } = _kwargs
	let { write } = modules.find(d => d.type === 'pads')?.rights || {}
	if (rights >= (write.blank ?? write) ?? Infinity) return { authorized: true }
	else return { authorized: false }
}