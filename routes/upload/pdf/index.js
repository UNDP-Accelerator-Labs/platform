const { app_storage, modules, DB } = include('config/')
const fs = require('fs')
const { join } = require('path')

module.exports = async (kwargs) => {
	const { uuid, file, source, containerClient } = kwargs || {}

	const targetdir = join('uploads/', uuid)
	const filename = `${file.filename}.pdf`
	let fileerror = false

	if (app_storage) { // A CLOUD BASED STORAGE OPTION IS AVAILABLE
		const blobClient = containerClient.getBlockBlobClient(join(targetdir, filename))
		const buffer = await fs.readFileSync(source)
		await blobClient.uploadData(buffer)
		.catch(err=> {
			if(err){
				fileerror = true;
				console.log(err)
			}
		})

		if(!fileerror && modules.some(d => d.type === 'files')){
			const pathurl = `${app_storage}/${targetdir}/${filename}`
			return DB.conn.one(`
				INSERT INTO files (name, path, owner)
				VALUES ($1, $2, $3)
				RETURNING id
			;`, [file.originalname, pathurl, uuid])
			.then(result => {
				fs.unlinkSync(source)
				if (result) {
					return { status: 200, src: join(targetdir, filename), originalname: file.originalname, type: 'pdf', message: 'success' }
				} else {
					return { status: 403, message: 'file was not properly stored' }
				}
			}).catch(err => console.log(err))
		} else {
			fs.unlinkSync(source)
			return { status: 403, ftype: file.mimetype, message: 'file upload failed.' }
		}
	} else {
		// TO DO: HANDLE CASE WHEN THERE IS NO BLOB STORAGE WITH if (app_storage)
		return { status: 403, message: 'Sorry, storage on the server is not currently handled.' }
	}
}