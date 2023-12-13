const { app_storage } = include('config/')

const { BlobServiceClient } = require('@azure/storage-blob')
const fs = require('fs')
const { join } = require('path')

const { blobContainer } = include('routes/helpers/')

const img = require('./img/')
const video = require('./video/')
const audio = require('./audio/')
const pdf = require('./pdf/')

module.exports = async (req, res) => {
	const { uuid } = req.session || {}

	const fls = req.files

	let containerClient
	if (app_storage) {
		// ESTABLISH THE CONNECTION TO AZURE
		const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING)
		// FIND OR CREATE THE CONTAINER
		containerClient = await blobContainer.createContainer(blobServiceClient)
	}

	const promises = fls.map(async file => {
		const source = join(rootpath, `./${file.path}`)

		let maxFileSizeBytes = 5 * 1024 * 1024; // 5MB
		if (file.mimetype.includes('video/') || file.mimetype.includes('audio/')) maxFileSizeBytes = 500 * 1024 * 1024; // 100MB
		// Check if the file size exceeds the maximum allowed size
		if (file.size > maxFileSizeBytes) {
			fs.unlinkSync(source); // Delete the uploaded file
			return { status: 403, message: file.originalname + ' file size exceeds the maximum allowed size.' };
		}

		if (['image/png', 'image/jpg', 'image/jpeg', 'image/jfif', 'image/gif', 'application/octet-stream'].includes(file.mimetype)) { // octet-streram IS FOR IMAGE URLs
			return await img({ uuid, file, source, containerClient })
		} else if (file.mimetype.includes('video/')) {
			return await video({ uuid, file, source, containerClient })
		} else if (file.mimetype.includes('audio/')) {
			return await audio({ uuid, file, source, containerClient })
		} else if (file.mimetype.includes('application/pdf')) {
			return await pdf({ uuid, file, source, containerClient })
		} else {
			fs.unlinkSync(source)
			return { status: 403, ftype: file.mimetype, message: 'wrong file format' }
		}
	});
	
	Promise.all(promises)
	.then(results => res.json(results))
	.catch(err => {
		console.log(err)
		res.json({ status: 500, message: 'Oops! Something went wrong.' });
	});
}