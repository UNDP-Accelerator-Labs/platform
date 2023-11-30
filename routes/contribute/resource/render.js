const { modules, DB } = include('config/')
const { checklanguage, flatObj, join, datastructures, safeArr, DEFAULT_UUID } = include('routes/helpers/')

module.exports = async (req, res) => {
	const { referer } = req.headers || {}
	req.session.reqReferer = referer // STORE THIS IN CASE THE TOKEN EXPIRES

	// const { uuid, rights, collaborators } = req.session || {}

	// const language = checklanguage(req.params?.language || req.query.language || req.body.language || req.session.language)
	// const collaborators_ids = safeArr(collaborators.map(d => d.uuid), uuid ?? DEFAULT_UUID)

	// return DB.conn.tx(t => {
	// 	const batch = []

	// 	return t.batch(batch)
	// 	.then(async results => {
	// 		// GET THE INFO FOR CREATING NEW ENTRIES
	// 		// FOR EXAMPLE, GET TEMPLATES FOR NEW PADS OR NEW REVIEWS
	// 		const [ data, templates ] = results
	// 		const metadata = await datastructures.pagemetadata({ connection: t, req })
	// 		return Object.assign(metadata, { data: flatObj.call(data), templates: flatObj.call(templates) })
	// 	}).catch(err => console.log(err))
	// }).then(results => {
	// 	res.render('contribute/resource', results)
	// }).catch(err => console.log(err))

	const metadata = await datastructures.pagemetadata({ req })
	res.render('contribute/resource', metadata)
}

// TO DO: IN files TABLE, ALTER COLUMN NAME name TO title FOR CONSISTENCY WITH OTHER MODULES