const { app_storage, modules, DB } = include('config/')

const fs = require('fs')
const { execFile } = require('child_process')
const { join, extname } = require('path')

module.exports = (kwargs) => {
	const { uuid, file, source, containerClient } = kwargs || {}
	// CREDIT: https://superuser.com/questions/552817/fastest-way-to-convert-any-audio-file-to-low-bitrate
	// ffmpeg -i input.file -map 0:a:0 -b:a 96k output.mp3

	// TO DO: MOVE THIS DOWN TO THE if NO app_storage
	const basedir = join(rootpath, `../public/uploads/`)
	if (!fs.existsSync(basedir)) fs.mkdirSync(basedir)
	const dir = join(basedir, uuid)
	if (!fs.existsSync(dir)) fs.mkdirSync(dir)

	const fftarget = join(dir, `./ff-${file.filename}${extname(file.originalname).toLowerCase()}`)
	let fileerror = false

	return new Promise((resolve, reject) => {
		execFile('ffmpeg', [
			'-i', source,
			'-map', '0:a:0',
			'-b:a', '48K',
			fftarget
		], async function(err, stdout, stderr) {
			try {
				if (err) console.log(err)
				const targetdir = join('uploads/', uuid)

				if (app_storage) {
					const buffer = await fs.readFileSync(fftarget)

					const blobClient = containerClient.getBlockBlobClient(join(targetdir, `${file.filename}${extname(file.originalname).toLowerCase()}`))
					const options = { blobHTTPHeaders: { blobContentType: file.mimetype } }
					await blobClient.uploadData(buffer, options)
					.then(_ => {
						// DELETE FILE STORED ON SERVER
						fs.unlinkSync(fftarget)
					}).catch(err=> {
						if (err){
							fileerror = true;
							console.log(err)
						}
					})
				}

				if(!fileerror && modules.some(d => d.type === 'files')){
					const pathurl = `${app_storage}/${targetdir}/${file.filename}${extname(file.originalname).toLowerCase()}`
					DB.conn.one(`
						INSERT INTO files (name, path, owner)
						VALUES ($1, $2, $3)
						RETURNING id
					;`, [file.originalname, pathurl, uuid])
					.then(result => {
						fs.unlinkSync(source)
						if (result) {
							resolve({ status: 200, src: join(targetdir, `${file.filename}${extname(file.originalname).toLowerCase()}`), originalname: file.originalname, type: 'audio', message: 'success' })
						} else resolve({ status: 403, message: 'file was not properly stored' })
					}).catch(err => {
						console.log(err)
						reject(err)
					})
				} else {
					fs.unlinkSync(source)
					resolve({ status: 200, src: fftarget.split('public/')[1], originalname: file.originalname, type: 'audio', message: 'success' })
				}
			} catch (err) {
				reject(err)
			}
		})
	})
}
