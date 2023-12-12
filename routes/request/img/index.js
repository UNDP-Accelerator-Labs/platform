const { modules } = include('config/')
const buffer = require('./buffer.js')
const url = require('./url.js')

module.exports = (req, res) => {
	const { from } = req.body || {};
	const { rights } = req.session || {};

	let write = modules.find(d => d.type === 'pads' || d.type === 'files')?.rights.write;
	if (typeof write === 'object') { write = write.blank; }

	let authorized = rights >= write;

	if (authorized) {
		if (from === 'buffer') buffer(req, res);
		else if (from === 'url') url(req, res);
		else res.redirect('/module-error');
	} else res.redirect('/module-error');
}