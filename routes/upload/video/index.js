const { app_storage, modules, DB } = include('config/')

const fs = require('fs')
const { execFile } = require('child_process')

module.exports = (kwargs) => {
	const { uuid, file, source, containerClient } = kwargs || {}

	// TO DO: MOVE THIS DOWN TO THE if NO app_storage
	const basedir = join(rootpath, `../public/uploads/`)
	if (!fs.existsSync(basedir)) fs.mkdirSync(basedir)
	const dir = join(basedir, uuid)
	if (!fs.existsSync(dir)) fs.mkdirSync(dir)

	const fftarget = path.join(dir, `./ff-${file.filename}${path.extname(file.originalname).toLowerCase()}`)
	let fileerror = false

	execFile('ffmpeg', [
		'-i', source,
		// '-s', '640x480',
		'-b:v', '512k',
		'-c:v', 'libx264',
		'-c:a', 'copy',
		'-vf', 'scale=854:ih*854/iw', // 854 = 480p
		fftarget
	], async function(err, stdout, stderr) {
		if (err) console.log(err)
		const targetdir = path.join('uploads/', uuid)

		if (app_storage) {
			const buffer = await fs.readFileSync(fftarget)

			const blobClient = containerClient.getBlockBlobClient(path.join(targetdir, `${file.filename}${path.extname(file.originalname).toLowerCase()}`))
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
			const pathurl = `${app_storage}/${targetdir}/${file.filename}${path.extname(file.originalname).toLowerCase()}`
			DB.conn.one(`
				INSERT INTO files (name, path, owner)
				VALUES ($1, $2, $3)
				RETURNING id
			;`, [file.originalname, pathurl, uuid])
			.then(result => {
				fs.unlinkSync(source)
				if (result) {
					resolve({ status: 200, src: path.join(targetdir, `${file.filename}${path.extname(file.originalname).toLowerCase()}`), originalname: file.originalname, message: 'success' })
				} else resolve({ status: 403, message: 'file was not properly stored' })
			}).catch(err => console.log(err))
		} else {
			fs.unlinkSync(source)
			resolve({ status: 200, src: fftarget.split('public/')[1], originalname: file.originalname, message: 'success' })
		}
	})
}