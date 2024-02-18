const { app_storage, modules, DB } = include('config/')
const fs = require('fs')
const { join, extname, relative } = require ('path')
const Jimp = require('jimp')

module.exports = async (kwargs) => {
	const { uuid, file, source, containerClient } = kwargs || {}

	return new Promise((resolve, reject) => {
		if (app_storage) { // A CLOUD BASED STORAGE OPTION IS AVAILABLE
			// USEFUL GUIDE: https://spin.atomicobject.com/2022/03/25/azure-storage-node-js/
			const targetdir = join('uploads/', uuid)
			const targetsmdir = join('uploads/sm/', uuid)

			// SET UP BLOB OPTIONS
			Jimp.read(source, async (err, image) => {
				try {
					if (err) console.log(err)
					const w = image.bitmap.width

					// SET MAX WIDTH (AND THEREBY SIZE) FOR UPLOADED IMAGES
					if (w > 1080) {
						const r = 1080 / w
						image.scale(r)
					}
					await image.getBufferAsync(Jimp.MIME_PNG)
					.then(async buffer => {
						if (err) console.log(err)
						let fileerror = false

						const blobClient = containerClient.getBlockBlobClient(join(targetdir, `${file.filename}.png`))
						const options = { blobHTTPHeaders: { blobContentType: Jimp.MIME_PNG } }

						await blobClient.uploadData(buffer, options)
						.catch(err=> {
							if(err){
								fileerror = true;
								console.log(err)
							}
						})

						if(!fileerror && modules.some(d => d.type === 'files')){
							const pathurl = `${app_storage}/${targetdir}/${file.filename}.png`
							await DB.conn.one(`
								INSERT INTO files (name, path, owner)
								VALUES ($1, $2, $3)
								RETURNING id
							;`, [file.originalname, pathurl, uuid])
							.catch(err => console.log(err))
						}

						// REMOVE source FILE IN tmp IF IT EXISTS (MEANING IF IT IS ON THE SERVER AND NOT IN THE BLOB STORAGE)
						if (fs.existsSync(source)) {
							fs.unlinkSync(source)
						} else {
							const sourceBlobClient = containerClient.getBlockBlobClient(relative(app_storage, source));
							await sourceBlobClient.delete();
						}

						console.log('should have written main file')
					}).catch(err => console.log(err))

					// SET EVERYTHING UP FOR VIGNETTES
					// CHECK IMAGE ORIENTATION (EXIF)
					// SEE https://www.impulseadventure.com/photo/exif-orientation.html
					if (image._exif && image._exif.tags && image._exif.tags.Orientation) {
						const o = image._exif.tags.Orientation
						if (o === 8) image.rotate(270).cover(200, 300, Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_MIDDLE).normalize().brightness(-.05)
						if (o === 6) image.rotate(90).cover(200, 300, Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_MIDDLE).normalize().brightness(-.05)
						else image.cover(300, 200, Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_MIDDLE).normalize().brightness(-.05)
					} else {
						image.cover(300, 200, Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_MIDDLE).normalize().brightness(-.05)
					}
					await image.getBufferAsync(Jimp.MIME_PNG)
					.then(async buffer => {
						if (err) console.log(err)
						const blobClient = containerClient.getBlockBlobClient(join(targetsmdir, `${file.filename}.png`))
						const options = { blobHTTPHeaders: { blobContentType: Jimp.MIME_PNG } }

						await blobClient.uploadData(buffer, options)
						console.log('should have written small file')
					}).catch(err => console.log(err))

					resolve({ status: 200, src: join(targetdir, `${file.filename}.png`), originalname: file.originalname, type: 'img', message: 'success' })
					console.log('failed resolve')
				} catch (err) {
					reject(err)
				}
			})
		} else { // THIS IS SERVER FILE SYSTEM BASED
			const basedir = join(rootpath, `./public/uploads/`)
			if (!fs.existsSync(basedir)) fs.mkdirSync(basedir)
			const dir = join(basedir, uuid)
			if (!fs.existsSync(dir)) fs.mkdirSync(dir)

			const smdir = join(basedir, 'sm/')
			if (!fs.existsSync(smdir)) fs.mkdirSync(smdir)
			const targetdir = join(smdir, uuid)
			if (!fs.existsSync(targetdir)) fs.mkdirSync(targetdir)

			const target = join(dir, `./${file.filename}${extname(file.originalname).toLowerCase()}`)
			const smtarget = join(targetdir, `./${file.filename}${extname(file.originalname).toLowerCase()}`)

			// CREATE THE SMALL IMAGE
			Jimp.read(source, (err, image) => {
				try {
					if (err) console.log(err)
					const w = image.bitmap.width
					const h = image.bitmap.height
					// CHECK IMAGE ORIENTATION (EXIF)
					// SEE https://www.impulseadventure.com/photo/exif-orientation.html
					if (image._exif && image._exif.tags && image._exif.tags.Orientation) {
						const o = image._exif.tags.Orientation
						if (o === 8) image.rotate(270).cover(200, 300, Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_MIDDLE).normalize().brightness(-.05)
						if (o === 6) image.rotate(90).cover(200, 300, Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_MIDDLE).normalize().brightness(-.05)
						else image.cover(300, 200, Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_MIDDLE).normalize().brightness(-.05)
					} else {
						image.cover(300, 200, Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_MIDDLE).normalize().brightness(-.05)
					}

					image.quality(60)
					image.writeAsync(smtarget)
					.then(_ => {
						fs.renameSync(source, target)
						resolve({ status: 200, src: target.split('public/')[1], originalname: file.originalname, type: 'img', message: 'success' })
					}).catch(err => {
						fs.copyFileSync(source, smtarget)
						fs.renameSync(source, target)
						resolve({ status: 200, src: target.split('public/')[1], originalname: file.originalname, type: 'img', message: 'success' })
					})
				} catch (err) {
					reject(err)
				}
			})
		}
	});
}
