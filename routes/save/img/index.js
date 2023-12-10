const { modules, app_storage } = include('config/');
const createContainer = include('routes/upload/container.js');
const upload = include('routes/upload/img/');
const { v4: uuidv4 } = require('uuid');

const { BlobServiceClient } = require('@azure/storage-blob')
const path = require('path');

module.exports = async (req, res) => {
	const { sources } = req.body || {};
	const { uuid, rights } = req.session || {};

	let write = modules.find(d => d.type === 'pads' || d.type === 'files')?.rights.write;
	if (typeof write === 'object') { write = write.blank; }

	let authorized = rights >= write;

	if (authorized && sources?.length) {
		let containerClient
		if (app_storage) {
			// ESTABLISH THE CONNECTION TO AZURE
			const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING)
			// FIND OR CREATE THE CONTAINER
			containerClient = await createContainer(blobServiceClient)
		}

		const promises = sources.map(async source => {
			source = path.join(rootpath, `./${source}`)

			// SIMULATE file OBJECT NEEDED TO UPLOAD IMAGES
			const file = {
				filename: uuidv4(), // GENERATE A RANDOM FILE NAME
				originalname: path.basename(source),
			}

			return await upload({ uuid, file, source, containerClient });
		});

		Promise.all(promises)
		.then(results => res.json(results))
		.catch(err => {
			console.log(err)
			res.json({ status: 500, message: 'Oops! Something went wrong.' });
		});

	} else res.redirect('/module-error');
}