const { DB } = include('config/')

module.exports = (req, res) => {
	const { uuid } = req.session || {}
	let filters = []
	
	if (uuid) filters.push(DB.pgp.as.format('(p.status >= 2)'))
	else filters.push(DB.pgp.as.format('(p.status > 2)'))

	filters = filters.join(' AND ')
	if (filters.length && filters.slice(0, 3) !== 'AND') filters = `AND ${filters}`

	return [ filters ]
}