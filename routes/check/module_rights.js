const { modules, DB } = include('config/')

module.exports = async (req, res) => {
	const { uuid } = req.session || {};
	const { module_type } = req.body || {};

	if (modules.some(d => d.type === module_type)) {
		const { read, write } = modules.find(d => d.type === module_type).rights;

		let rights = 0
		if (uuid) {
			rights = await DB.general.one(`
				SELECT rights FROM users
				WHERE uuid = $1
			;`, [ uuid ], d => d.rights).catch(err => console.log(err))
		}
		
		const obj = {};
		obj.write = {}
		
		if (typeof write === 'object') {
			obj.write['blank'] = rights >= write.blank
			obj.write['templated'] = rights >= write.templated
		} else {
			obj.write['all'] = rights >= write
		}
		obj.read = rights >= read

		return res.status(200).json({ status: 200, rights: obj })
	} else {
		return res.status(404).json({ status: 404, message: 'The module was not found.' })
	}
}