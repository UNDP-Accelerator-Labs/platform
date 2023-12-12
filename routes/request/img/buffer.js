const { app_storage } = include('config/')
const fs = require('fs')
const path = require('path')

const { createContainer } = include('routes/upload/container_functions.js');
const { BlobServiceClient } = require('@azure/storage-blob');

module.exports = async (req, res) => {
	const { data, name } = req.body || {};
	const { uuid } = req.session || {};

	const buffer = Buffer.from(data, 'base64')

	if (app_storage) {
		let fileerror = false
		const targetdir = path.join('tmp/', uuid)

		let containerClient
		// ESTABLISH THE CONNECTION TO AZURE
		const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING)
		// FIND OR CREATE THE CONTAINER
		containerClient = await createContainer(blobServiceClient)

		const blobClient = containerClient.getBlockBlobClient(path.join(targetdir, name))
		await blobClient.uploadData(buffer)
		.catch(err=> {
			if(err){
				fileerror = true;
				console.log(err)
			}
		})

		if (fileerror) res.status(403).json({ status: 403, ftype: file.mimetype, message: 'file upload failed.' })
		else res.status(200).json({ status: 200, src: path.join(targetdir, name) })
	} else {
		const tmpdir = path.join(rootpath, `/public/tmp/`)
		if (!fs.existsSync(tmpdir)) fs.mkdirSync(tmpdir)
		const userdir = path.join(tmpdir, uuid)
		if (!fs.existsSync(userdir)) fs.mkdirSync(userdir)

		const img = path.join(userdir, name)
		fs.writeFileSync(img, buffer)

		res.status(200).json({ src: img.split('public')[1] });
	}
}