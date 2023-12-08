const { modules } = include('config/')
const fs = require('fs')

module.exports = (req, res) => {
	const { src, type } = req.body || {};
	const { uuid, rights } = req.session || {};

	let write = modules.find(d => d.type === 'pads')?.rights.write;
	if (typeof write === 'object') { write = write.blank; }

	let authorized = rights >= write

	
}