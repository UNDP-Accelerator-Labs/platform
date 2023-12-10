const fs = require('fs')
const path = require('path')

module.exports = async (req, res) => {
	const { data, name } = req.body || {};
	const { uuid } = req.session || {};

	const buffer = Buffer.from(data, 'base64')

	const tmpdir = path.join(rootpath, `/public/tmp/`)
	if (!fs.existsSync(tmpdir)) fs.mkdirSync(tmpdir)
	const userdir = path.join(tmpdir, uuid)
	if (!fs.existsSync(userdir)) fs.mkdirSync(userdir)

	const img = path.join(userdir, name)
	fs.writeFileSync(img, buffer)

	res.status(200).json({ src: img.split('public')[1] });
}