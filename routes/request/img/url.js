const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');

module.exports = (req, res) => {
	let { data: url, name } = req.body || {}
	if (!name) {
		if (path.basename(url)) { name = path.basename(url); }
		else { name = uuidv4(); }
	}
	const { uuid } = req.session || {}

	const tmpdir = path.join(rootpath, `/public/tmp/`);
	if (!fs.existsSync(tmpdir)) fs.mkdirSync(tmpdir);
	const userdir = path.join(tmpdir, uuid);
	if (!fs.existsSync(userdir)) fs.mkdirSync(userdir);

	const img = path.join(userdir, name);

	return fetch(url)
	.then(response => response.buffer())
	.then(buffer => {
		fs.writeFileSync(img, buffer)
		// TO DO: SEND DIRECTLY TO BLOB STORAGE
		res.status(200).json({ src: img.split('public')[1] })
	}).catch(err => console.log(err));
}