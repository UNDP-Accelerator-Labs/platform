const { app_title, DB } = include('config/')
const { checklanguage, stripHTML, join, parsers, array } = include('routes/helpers/')
// const request = require('request')
const format = require('./formatting.js')
const path = require('path')
const fs = require('fs')
// const mime = require('mime')
const Jimp = require('jimp')
const { execFile } = require('child_process')
const fetch = require('node-fetch')
const Pageres = require('pageres') // THIS IS FOR SCREENSHOTS
const turf = require('@turf/turf')
const archiver = require('archiver')

const jwt = require('jsonwebtoken')


if (!exports.redirect) { exports.redirect = {} }
if (!exports.render) { exports.render = {} }
if (!exports.process) { exports.process = {} }
if (!exports.public) { exports.public = {} }
if (!exports.private) { exports.private = {} }
if (!exports.dispatch) { exports.dispatch = {} }



exports.forwardGeocoding = (req, res) => {
	const { locations, list } = req.body || {}
	const { country } = req.session || {}
	
	const promises = geocode(locations, country.lnglat, list)
	Promise.all(promises)
	.then(data => res.json(data))
	.catch(err => {
		console.log(err)
		res.json({ status: 500, message: 'Oops! Something went wrong while searching for locations.' })
	})
}
function geocode (locations, centerpoint, list = false, dir = 'forward') { // FOR NOW WE ONLY DO FORWARD GEOCODING
	console.log('pay attention to forward geocode')
	return locations.map(l => {
		return new Promise(resolve => {
			if (!l || typeof l !== 'string') {
				const obj = {}
				obj.input = l
				obj.found = false
				obj.centerpoint = centerpoint
				obj.caption = `No location was found for <strong>${l}</strong>.` // TO DO: TRANSLATE
				resolve(obj)
			} else {
				setTimeout(_ => {
					l_formatted = l.removeAccents().replacePunctuation(', ').trim()
					console.log(`https://api.opencagedata.com/geocode/v1/json?q=${l_formatted}`)
					fetch(`https://api.opencagedata.com/geocode/v1/json?q=${l_formatted}&key=${process.env.OPENCAGE_API}`)
					.then(response => response.json())
					.then(data => {
						const obj = {}
						obj.input = l
						if (data.results.length) {
							if (!list) {
								const location = data.results[0] // NOTE CONFIDENCE IS SOMETHING ELSE: https://opencagedata.com/api#ranking
								obj.centerpoint = { lat: +location.geometry.lat, lng: +location.geometry.lng }
							} else {
								obj.locations = data.results
							}
							obj.found = true
							obj.caption = `<strong>${l.trim().capitalize()}</strong> found using <a href='https://opencagedata.com/credits' target='_blank'>OpenCage Geocoder</a> | &copy; <a href='https://www.openstreetmap.org/copyright' target='_blank'>OpenStreetMap contributors</a>`
						} else {
							obj.found = false
							obj.centerpoint = centerpoint
							obj.caption = `No location was found for <strong>${l.trim().capitalize()}</strong>.` // TO DO: TRANSLATE
						}
						resolve(obj)
					}).catch(err => console.log(err))
				}, 1000)
			}
		})
	})
}




exports.process.callapi = (req, res) => {
	const { uri, method, key, expect } = req.body || {}
	const headers = { 
		'Accept': 'application/*', 
		'Content-Type': 'application/*', 
		'X-Requested-With': 'XMLHttpRequest',
		'x-access-token': process.env[key]
	}
	
	fetch(uri, { method: method, headers: headers })
		.then(response => {
			if (expect === 'json') return response.json()
			else if (['blob', 'image', 'file'].includes(expect)) return response.blob()
			else return response
		}).then(result => {
			if (expect === 'json') res.json(result)
			else if (['blob', 'image', 'file'].includes(expect)) {
				// BASED ON https://stackoverflow.com/questions/52665103/using-express-how-to-send-blob-object-as-response
				res.type(result.type)
				result.arrayBuffer().then(buf => {
					res.send(Buffer.from(buf))
				})
			}
			else res.send(result)
		}).catch(err => console.log(err))
}

/* =============================================================== */
/* =========================== LOGIN ============================= */
/* =============================================================== */
exports.render.login = require('./login/').render
exports.process.login = require('./login/').process
exports.process.logout = require('./login/').logout
exports.redirect.home = require('./login/').redirect

exports.redirect.public = (req, res) => res.redirect('/public')
exports.dispatch.public = require('./login/').public


/* =============================================================== */
/* =========================== BROWSE ============================ */
/* =============================================================== */
exports.dispatch.browse = require('./browse/')

/* =============================================================== */
/* ========================= MOBILIZE ============================ */
/* =============================================================== */
// THIS DOES NOT SEEM TO RETURN ANYTHING
exports.dispatch.analyse = (req, res) => {
	const { uuid, rights } = req.session || {}
	const { object } = req.params || {}
	const language = checklanguage(req.params?.language || req.session.language)

	// if (rights >= (modules.find(d => d.type === 'analyses')?.rights.write ?? Infinity)) {
	// 	if (object === 'pad') createPad(req, res)
	// 	else if (object === 'import') createImport(req, res)
	// 	else if (object === 'template') createTemplate(req, res)
	// } else res.redirect(`/${language}/browse/${object}s/public`)

	if (object === 'mobilization') {
		compileMobilization(req, res)
	}
}
function compileMobilization (req, res) {
	const { id } =  req.query || {}

	DB.conn.tx(t => {
		const batch = []
		batch.push(t.one(`
			SELECT t.sections FROM mobilizations m
			INNER JOIN templates t
				ON m.template = t.id
			WHERE m.id = $1
		;`, [id]))
		// batch.push(t.any(`
		// 	SELECT p.id, p.title, p.sections FROM mobilization_contributions mc
		// 	INNER JOIN pads p
		// 		ON mc.pad = p.id
		// 	WHERE mc.id = $1
		// ;`, [id]))
		batch.push(t.any(`
			SELECT p.id, p.title, p.sections FROM pads p
			WHERE p.id = 134
		;`))
		return t.batch(batch)
	}).then(results => {
		const [ template, pads ] = results
		
		console.log(template.sections)
		pads.forEach(d => console.log(d.id, d.title, d.sections))
		pads.forEach(d => console.log(d.id, d.title, d.sections.map(c => c.structure)))
		pads.forEach(d => console.log(d.id, d.title, d.sections.map(c => c.items)))
	}).catch(err => console.log(err))
}
/* =============================================================== */
/* ============================ PADS ============================= */
/* =============================================================== */
exports.dispatch.contribute = require('./contribute/').main

exports.dispatch.edit = require('./edit/').main

exports.dispatch.view = require('./view/').main

exports.dispatch.import = require('./import/').create

exports.dispatch.mobilize = require('./mobilize/').main

/* =============================================================== */
/* ========================== IMPORT ============================= */
/* =============================================================== */
// TO DO: CHANGE THIS TO THE GENERAL save/ MECHANISM
exports.storeImport = require('./import/').save


/* =============================================================== */
/* ====================== SAVING MECHANISMS ====================== */
/* =============================================================== */
exports.process.upload = (req, res) => {
	const { uuid } = req.session || {}
	
	const fls = req.files
	console.log(fls)
	const promises = fls.map(f => {
		const basedir = path.join(__dirname, `../public/uploads/`)
		if (!fs.existsSync(basedir)) fs.mkdirSync(basedir)
		const dir = path.join(basedir, uuid)
		if (!fs.existsSync(dir)) fs.mkdirSync(dir)
		const source = path.join(__dirname, `../${f.path}`)

		return new Promise(resolve => {
			if (['image/png', 'image/jpg', 'image/jpeg', 'image/jfif', 'image/gif', 'application/octet-stream'].includes(f.mimetype)) { // octet-streram IS FOR IMAGE URLs				
				const smdir = path.join(basedir, 'sm/')
				if (!fs.existsSync(smdir)) fs.mkdirSync(smdir)
				const targetdir = path.join(smdir, uuid)
				if (!fs.existsSync(targetdir)) fs.mkdirSync(targetdir)

				// const source = path.join(__dirname, `../${f.path}`)
				const target = path.join(dir, `./${f.filename}${path.extname(f.originalname).toLowerCase()}`)
				const smtarget = path.join(targetdir, `./${f.filename}${path.extname(f.originalname).toLowerCase()}`)
				
				// CREATE THE SMALL IMAGE
				Jimp.read(source, (err, image) => {
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
						resolve({ status: 200, src: target.split('public/')[1], originalname: f.originalname, message: 'success' })
					}).catch(err => {
						fs.copyFileSync(source, smtarget)
						fs.renameSync(source, target)
						resolve({ status: 200, src: target.split('public/')[1], originalname: f.originalname, message: 'success' })
					})
				})
			} else if (f.mimetype.includes('video/')) {
				// TO DO: CHECK SIZE HERE AND IF TOO BIG DO NOTHING (IN FRONT END TELL USER TO GO THROUGH YOUTUBE OF MSSTREAM)
				// const target = path.join(dir, `./${f.filename}${path.extname(f.originalname).toLowerCase()}`)
				const fftarget = path.join(dir, `./ff-${f.filename}${path.extname(f.originalname).toLowerCase()}`)

				execFile('ffmpeg', [
					'-i', source,
					// '-s', '640x480',
					'-b:v', '512k',
					'-c:v', 'libx264',
					'-c:a', 'copy',
					'-vf', 'scale=854:ih*854/iw', // 854 = 480p
					fftarget
				], function(err, stdout, stderr) {
					if (err) console.log(err)

					fs.unlinkSync(source)
					resolve({ status: 200, src: fftarget.split('public/')[1], originalname: f.originalname, message: 'success' })
				})
			} else if (f.mimetype.includes('application/pdf')) {
				const target = path.join(dir, `./${f.filename}${path.extname(f.originalname).toLowerCase()}`)

				DB.conn.one(`
					INSERT INTO files (name, path, contributor) 
					SELECT $1, $2, id FROM contributors WHERE uuid = $3
					RETURNING id
				;`, [f.originalname, `/${target.split('public/')[1]}`, uuid])
				.then(result => {
					if (result) {
						fs.renameSync(source, target)
						resolve({ status: 200, src: target.split('public/')[1], originalname: f.originalname, message: 'success' })
					} else resolve({ status: 403, message: 'file was not properly stored' })
				}).catch(err => console.log(err))
			} else {
				fs.unlinkSync(source)
				resolve({ status: 403, ftype: f.mimetype, message: 'wrong file format' })
			}
		})
	})
	Promise.all(promises)
	.then(results => res.json(results))
	.catch(err => {
		console.log(err)
		res.json({ status: 500, message: 'Oops! Something went wrong.' })
	})
}
// THIS IS NOT BEING USED NOW
exports.process.screenshot = (req, res) => {
	if (process.env.NODE_ENV !== 'production') {
		const src = req.body.src
		const target = src.simplify()

		const basedir = path.join(__dirname, `../public/uploads/`)
		if (!fs.existsSync(basedir)) fs.mkdirSync(basedir)
		
		const dir = path.join(__dirname, `../public/uploads/${req.session.uuid}`)
		if (!fs.existsSync(dir)) fs.mkdirSync(dir)
		
		if (!fs.existsSync(path.join(dir, `${target}.png`))) {
			new Pageres({ delay: 2, filename: target, format: 'png' })
				.src(src, ['1280x1024'])
				.dest(dir)
				.run()
			.then(result => res.json({ status: 200, src: path.join(dir, `${target}.png`).split('public/')[1], message: 'success' }))
			.catch(err => {
				console.log(err)
				res.json({ status: 500, message: 'Oops! Something went wrong.' })
			})
		} else {
			res.json({ status: 200, src: path.join(dir, `${target}.png`).split('public/')[1], message: 'image already exists' })
		}
	}
	else res.json({ status: 200, src: null, message: 'cannot load image in production mode' })
}



exports.process.check = require('./check/').main
exports.process.save = require('./save/').main
exports.process.generate = require('./generate/').main
exports.process.delete = require('./delete/').main

exports.process.publish = require('./publish/').publish
exports.process.unpublish = require('./publish/').unpublish

exports.process.share = require('./share/').share

exports.process.forward = require('./forward/').main

exports.process.pin = require('./engage/').pin
// exports.process.unpin = require('./engage/').unpin

exports.process.engage = require('./engage/').engage
exports.process.comment = require('./engage/').comment

exports.process.request = require('./request/').main
exports.process.accept = require('./accept/').accept
exports.process.decline = require('./accept/').decline



// THIS IS DEPRECATED
exports.process.download = (req, res) => {
	const { uuid } = req.session || {}
	const { object } = req.params || {}
	const { id } = req.body || {}

	if (object === 'mobilization') {
		DB.conn.tx(t => {
			const batch = []
			batch.push(t.one(`
				SELECT t.sections FROM mobilizations m
				INNER JOIN templates t
					ON m.template = t.id
				WHERE m.id = $1
			;`, [id]))
			// TO DO: KEEP ONLY PUBLISHED PADS
			batch.push(t.any(`
				SELECT p.id, p.title, p.sections, c.country, to_char(p.date, 'DD Mon YYYY') AS date, to_char(p.update_at, 'DD Mon YYYY') AS update FROM mobilization_contributions mc
				INNER JOIN pads p
					ON mc.pad = p.id
				INNER JOIN contributors c
					ON p.contributor = c.id
				WHERE mc.mobilization = $1
			;`, [id]))
			return t.batch(batch)
		}).then(async results => {
			const [ template, pads ] = results
			

			function getImg (d) {
				if (d?.sections) {
					const media = d.sections.map(c => c.items.map(b => b.type === 'group' ? b.items.flat() : b).flat()).flat()
					const img = media.find(c => c.type === 'img' && c.src)
					const mosaic = media.find(c => c.type === 'mosaic' && c.srcs)
					const embed = media.find(c => c.type === 'embed' && c.src)
					if (img && img.length) return img.map(c => c.src)
					else if (mosaic && mosaic.length) return mosaic.map(c => c.srcs).flat()
					else if (embed && embed.length) return embed.map(c => c.src)
					else return [null]
				} else return [null]
			}

			const imgs = pads.map(d => getImg(d)).flat().filter(d => d !== null)
			console.log(imgs)

			const [ structure, entries ] = compileTable(template, pads)			
			const csv = dumpCSV(structure, entries)

			await fs.writeFileSync(path.join(__dirname, `../tmp/mobilization_${id}_data.csv`), csv, 'utf8')		
			// CODE FROM https://github.com/archiverjs/node-archiver
			const zippath = path.join(__dirname, `../tmp/mobilization_${id}.zip`)
			const output = fs.createWriteStream(zippath)
			const archive = archiver('zip', {
				zlib: { level: 9 } // Sets the compression level. 6 is default, 9 is high compression
			})
			output.on('close', function() {
				res.download(path.join(__dirname, `../tmp/mobilization_${id}.zip`), `mobilization_${id}.zip`, err => {
					if (err) console.log(err)
					fs.unlinkSync(path.join(__dirname, `../tmp/mobilization_${id}_data.csv`))
					fs.unlinkSync(path.join(__dirname, `../tmp/mobilization_${id}.zip`))
				})
			})
			archive.on('warning', function(err) {
				if (err.code === 'ENOENT') {
					console.log('archive warning')
					console.log(err)
				} else {
					console.log('archive error')
					console.log(err)
				}
			})
			archive.on('error', err => console.log(err))
			
			archive.pipe(output)
			archive.file(path.join(__dirname, `../tmp/mobilization_${id}_data.csv`), { name: `mobilization_${id}_data.csv` })
			
			imgs.forEach((d, i) => {
				console.log(d)
				// const file = path.join(__dirname, `../public/${d}`)
				// archive.file(file, { name: d })
			})
			archive.finalize()
		}).catch(err => console.log(err))
	}

	// DB.conn.any(saveSQL).then(async results => {
	// 	if (format === 'raw') {
	// 		function getImg (d) {
	// 			if (d && d.sections) {
	// 				const img = d.sections.map(d => d.items).flat().filter(c => c.type === 'img' && c.src)
	// 				const mosaic = d.sections.map(d => d.items).flat().filter(c => c.type === 'mosaic' && c.srcs)
	// 				const embed = d.sections.map(d => d.items).flat().filter(c => c.type === 'embed' && c.src)
	// 				if (img.length) return img.map(c => c.src)
	// 				else if (mosaic.length) return mosaic.map(c => c.srcs).flat()
	// 				else if (embed.length) return embed.map(c => c.src)
	// 				else return [null]
	// 			} else return [null]
	// 		}

	// 		results.forEach(d => d.imgs = getImg(d).flat())
	// 		const imgs = results.map(d => d.imgs).flat()
	// 		const max_imgs = results.sort((a, b) => b.imgs.length - a.imgs.length)[0].imgs.length

	// 		const columns = [
	// 			'id', 
	// 			'title', 
	// 			'contributor', 
	// 			'contribution_date', 
	// 			'full_text', 
	// 			'location_JSON', 
	// 			new Array(5).fill(null).map((d, i) => `SDG_tag_${i + 1}`),
	// 			new Array(5).fill(null).map((d, i) => `thematic_area_tag_${i + 1}`),
	// 			new Array(max_imgs).fill(null).map((d, i) => `image_${i + 1}`)
	// 		].flat()

	// 		let csv = `${columns.join('\t')}`
	// 		results.forEach(d => {
	// 			const imgIdx = getImg(d).map(c => `file: img-${imgs.flat().indexOf(c) + 1}`)

	// 			csv += `\n${[
	// 				d.id, 
	// 				d.title, 
	// 				d.contributor, 
	// 				d.date, 
	// 				`"${d.full_text.replace(/"/g, '""')}"`, 
	// 				JSON.stringify(d.location.centerpoints || d.location.centerpoint), 
	// 				new Array(5).fill(null).map((c, i) => d.sdgs[i] ? d.sdgs[i].toString() : ''), 
	// 				new Array(5).fill(null).map((c, i) => d.tags[i] ? d.tags[i].toString() : ''),
	// 				new Array(max_imgs).fill(null).map((c, i) => imgIdx[i] ? imgIdx[i].toString() : '')
	// 			].flat().join('\t')}`
	// 		})

	// 		await fs.writeFileSync(path.join(__dirname, '../tmp/solutions_data.tsv'), csv, 'utf8')		
	// 		// CODE FROM https://github.com/archiverjs/node-archiver
	// 		const zippath = path.join(__dirname, '../tmp/grassroots_solutions.zip')
	// 		const output = fs.createWriteStream(zippath)
	// 		const archive = archiver('zip', {
	// 			zlib: { level: 9 } // Sets the compression level. 6 is default, 9 is high compression
	// 		})
	// 		output.on('close', function() {
	// 			res.download(path.join(__dirname, '../tmp/grassroots_solutions.zip'), 'grassroots_solutions.zip', err => {
	// 				if (err) console.log(err)
	// 				fs.unlinkSync(path.join(__dirname, '../tmp/solutions_data.tsv'))
	// 				fs.unlinkSync(path.join(__dirname, '../tmp/grassroots_solutions.zip'))
	// 			})
	// 		})
	// 		archive.on('warning', function(err) {
	// 			if (err.code === 'ENOENT') {
	// 				console.log('archive warning')
	// 				console.log(err)
	// 			} else {
	// 				console.log('archive error')
	// 				console.log(err)
	// 			}
	// 		})
	// 		archive.on('error', err => console.log(err))
			
	// 		archive.pipe(output)
	// 		archive.file(path.join(__dirname, '../tmp/solutions_data.tsv'), { name: 'solutions_data.tsv' })
			
	// 		imgs.forEach((d, i) => {
	// 			const file = path.join(__dirname, `../public/${d}`)
	// 			archive.file(file, { name: `img-${i + 1}${path.extname(file)}` })
	// 		})
	// 		archive.finalize()
	// 	}
	// })
}

// MIGRATE THE FOLLOWING TO helpers // THIS IS DEPRECATED
function extractItem (d = {}, section = null, group = null) {
	if (d.type === 'img') return { key: d.instruction, value: d.src ? d.src : null, section: section, group: group }
	if (d.type === 'mosaic') return { key: d.instruction, value: d.srcs.length ? d.srcs.join(', ') : null, section: section, group: group }
	// NOTE: HAVE NOT TESTED WITH mosaic OR video
	if (d.type === 'video') return { key: d.instruction, value: d.src ? d.src : null, section: section, group: group }
	if (d.type === 'txt') return { key: d.instruction, value: d.txt && d.txt !== '' ? d.txt : null, section: section, group: group }
	if (d.type === 'embed') return { key: d.instruction, value: d.html && d.html !== '' ? d.html : null, section: section, group: group }
	if (d.type === 'checklist') return d.options.map(c => { return { key: `${d.instruction}: ${c.name}`, value: c.checked ? 1 : 0, section: section, group: group } })
	if (d.type === 'radiolist') return { key: d.instruction, value: d.options && d.options.find(c => c.checked) ? d.options.find(c => c.checked).name : null, section: section, group: group }
	
	if (d.type === 'sdgs') return { key: d.instruction, value: d.sdgs.length ? d.sdgs.join(', ') : null, section: section, group: group }
	if (d.type === 'tags') return { key: d.instruction, value: d.tags.length ? d.tags.map(c => c.name).join(', ') : null, section: section, group: group }
	if (['skills', 'methods'].includes(d.type)) return { key: d.instruction, value: d.tags.length ? d.tags.map(c => c.name).join(', ') : null, section: section, group: group }
	if (d.type === 'datasources') return { key: d.instruction, value: d.tags.length ? d.tags.map(c => c.name).join(', ') : null, section: section, group: group }

	if (d.type === 'group') { 
		if (d.repeat) { // THIS IS A REPEAT GROUP
			const grouped_items = []
			for (let i = 0; i < d.repeat; i ++) {
				let items = []
				if (d.items[i]) items = d.items[i]
				// PASS AN OBJECT WITH ALL null VALUES (THIS IS A FILLER IN CASE OTHER PADS HAVE MORE REPETITIONS OF THE GROUP)
				else {
					items = d.items[0].map(c => { // THIS IS MAYBE A BIT HACKY (SINCE VERY SPECIFIC)
						const obj = {}
						for (key in c) {
							obj[key] = c[key]
							if (!['type', 'instruction'].includes(key)) {
								if (obj.type === 'checklist' && key === 'options') obj[key].forEach(b => b.checked = false) // IF CHECKLIST, THEN WE NEED TO KEEP THE OPTIONS AND WE FORCE A NON RESPONSE (checked = false)
								else obj[key] = null
							}
						}
						return obj
					})
				}				
				grouped_items.push(items.map(c => { // THESE ARE THE ITEMS IN EACH REPEAT GROUP
					return extractItem(c, section, `${d.instruction} #${i + 1}`)
				}).flat())
			}
			return grouped_items.flat()
		} else { // THIS IS NOT A REPEAT GROUP
			return d.items.map(c => { // THIS IS WHERE REPEAT GROUPS ARE STORED
				return c.map(b => { // THESE ARE THE ITEMS IN EACH GROUP
					return extractItem(b, section, `${d.instruction}`)
				}).flat()
			}).flat()
		}
	}
}
function compileEntries (sections = [], id = null, title = null, country = null, submitted = null, updated = null) {
	sections = sections.map((c, j) => c.items.map(b => extractItem(b, `${j}: ${c.title}`))).flat(2)
	// FINALLY, ADD COLUMNS FOR title, contributor, submitted, AND updated
	sections.unshift({ section: null, group: null, key: 'updated', value: updated })
	sections.unshift({ section: null, group: null, key: 'submitted', value: submitted })
	sections.unshift({ section: null, group: null, key: 'contributor', value: `AccLab ${country}` })
	sections.unshift({ section: null, group: null, key: 'title', value: title })
	sections.unshift({ section: null, group: null, key: 'id', value: id })

	return { 
		id: id,
		title: title, 
		contributor: `AccLab ${country}`,
		submitted: submitted,
		updated: updated,
		sections: sections,
		// count_sections: d.sections.filter((c, j) => !c.repeat || (c.group === repeat_sections_counts[0].group && i + offset_index === j)).length
	}
}
function compileTable (template = {}, pads = []) { // TO DO: ISSUE IS HERE
	const repeat_sections = template.sections.filter(d => d.repeat).map(d => d.group)
	const repeat_sections_counts = repeat_sections.map(d => { return { group: d, count: Math.max(...pads.map(c => c.sections.filter(b => b.group === d).length)) } })
	const entries = []
	// RULE: IF THERE IS ONLY ONE REPEAT SECTION, THEN BREAK UP INTO MULLTIPLE ENTRIES
	// OTHERWISE KEEP AS SINGLE ENTRY WITH MORE COLUMNS
	if (repeat_sections.length === 0) {
		pads.forEach(d => {
			entries.push(compileEntries(d.sections, d.id, d.title, d.country, d.date, d.update))
		})
	} else if (repeat_sections.length === 1) {
		// HERE WE EXPLODE EACH PAD INTO MUTIPLE ENTRIES
		offset_index = template.sections.findIndex(d => d.group === repeat_sections_counts[0].group)
		pads.forEach(d => {
			const repetitions = d.sections.filter(c => c.repeat).length
			for (let i = 0; i < repetitions; i ++) {
				entries.push(compileEntries(d.sections.filter((c, j) => !c.repeat || (c.group === repeat_sections_counts[0].group && i + offset_index === j)), d.id, d.title, d.country, d.date, d.update))
			}
		})
	} // else TO DO: IF THERE ARE MULTIPLE REPEAT SECTIONS, THEN WE DO NOT TREAT EACH AS A NEW ENTRY, BUT RATHER AS ADDITIONAL DIMENSIONS 
		// pads.forEach(d => {
		// 	for (let i = 0; i < repeat_sections_counts[0].count; i ++) {
		// 		entries.push(compileEntries(d.sections.filter((c, j) => !c.repeat || (c.group === repeat_sections_counts[0].group && i + offset_index === j)), d.id, d.title, d.country, d.date, d.update))
		// 	}
		// })
	// }
	// HERE WE CREATE A REFERENCE FOR THE STRUCTURE OF THE TABLE
	// AND WE CHECK WHETHER THE TEMPLATE CONTAINS GROUPS: IF IT DOES NOT, WE DO NOT NEED TO CREATE AN EXTRA GROUP LEVEL
	const groups = template.sections.map(d => d.structure.filter(c => c.type === 'group')).flat()
	const structure = entries[0].sections.map(d => {
		const obj = {}
		obj.section = d.section
		if (groups.length) obj.group = d.group
		obj.key = d.key
		return obj
	})
	return [structure, entries]
}
// THIS IS DEPRECATED
function dumpCSV (structure, entries) {
	let csv = structure.map(d => {
		if (typeof d.key === 'string') {
			if (d.key.includes(',')) return `"${stripHTML.call(d.key.replace(/\"/g, '""'))}"`
			else if (d.key.match(/\n/)) return `"${stripHTML.call(d.key.replace(/\"/g, '""'))}"`
			else return d.key
		} else return d.key
	}).join(',')
	entries.forEach(d => {
		csv += `\n${d.sections.map(c => {
			if (typeof c.value === 'string') {
				if (c.value.includes(',')) return `"${stripHTML.call(c.value.replace(/\"/g, '""'))}"` 
				else if (c.value.match(/\n/)) return `"${stripHTML.call(c.value.replace(/\"/g, '""'))}"`
				else return c.value
			} else return c.value
		}).join(',')}`
	})
	return csv
}


// TO DO: CHECK WHETHER THIS IS NECESSARY: engage SHOULD COVER FOR THIS
exports.process.validate = (req, res) => {
	const { uuid } = req.session || {}
	const { pad, active, type, message, path } = req.body || {}

	DB.conn.none(`
		INSERT INTO engagement (contributor, doctype, docid, type, message) 
		VALUES ($1, $2, $3, $4, $5)
	;`, [ uuid, 'pad', +pad, type, message])
	.then(result => {
		res.redirect(path)
	}).catch(err => console.log(err))
}
/* =============================================================== */
/* ============================= API ============================= */
/* =============================================================== */
exports.dispatch.apis = require('./apis/')

if (!exports.api) exports.api = {}
// THE TAGS APIS SHOULD BE DEPRECATED FOR NOW
exports.api.skills = (req, res) => {
	DB.general.any(`
		SELECT id, category, name FROM skills ORDER BY category, name
	;`).then(results => res.status(200).json(results))
	.catch(err => res.status(500).send(err))
}
exports.api.methods = (req, res) => {
	DB.general.any(`
		SELECT id, name FROM methods ORDER BY name
	;`).then(results => res.status(200).json(results))
	.catch(err => res.status(500).send(err))
}
exports.api.datasources = (req, res) => {
	if (req.method === 'GET') {
		DB.general.any(`
			SELECT d.id, d.name, d.description, u.iso3 FROM datasources d
			LEFT JOIN users u
				ON u.uuid = d.contributor
		;`).then(results => res.status(200).json(results))
		.catch(err => res.status(500).send(err))
	} else if (req.method === 'POST') {
		const { uuid } = req.session || {}
		const { tag } = req.body || {}

		DB.general.one(`
			INSERT INTO datasources (name, contributor)
			VALUES ($1, $2)
				ON CONFLICT ON CONSTRAINT datasources_name_key
				DO NOTHING
			RETURNING uuid, name
		;`, [ tag.toLowerCase(), uuid || null ])
		.then(result => res.status(200).json(result))
		.catch(err => res.status(500).send(err))
	}
}
exports.api.sdgs = (req, res) => {
	let { lang } = req.query || {}
	if (lang) {
		const language = checklanguage(lang)
		DB.general.any(`
			SELECT key, name, description FROM tags
			WHERE type = 'sdgs'
				AND language = $1
			ORDER BY key
		;`, [ language ])
		.then(results => {
			res.status(200).json(results)
		}).catch(err => res.status(500).send(err))
	} else {
		DB.general.any(`
			SELECT key, name, lang, description FROM tags
			WHERE type = 'sdgs'
			ORDER BY key
		;`).then(results => res.status(200).json(results))
		.catch(err => res.status(500).send(err))
	}
}
exports.api.thematic_areas = (req, res) => {
	if (req.method === 'GET') {
		DB.general.any(`
			SELECT id, name FROM tags
			WHERE type = 'thematic_areas' 
			ORDER BY name
		;`).then(results => res.status(200).json(results))
		.catch(err => res.status(500).send(err))
	} else if (req.method === 'POST') {
		const { tag } = req.body || {}
		
		if (tag.trim().length) {
			DB.general.one(`
				INSERT INTO tags (name, type)
				VALUES ($1, 'thematic_areas')
					ON CONFLICT ON CONSTRAINT name_type_key
					DO NOTHING
				RETURNING id, name
			;`, [ tag.trim().toLowerCase() ])
			.then(result => res.status(200).json(result))
			.catch(err => res.status(500).send(err))
		} else res.status(200).json({ message: 'No tag was submitted.' })
	}
}
exports.api.solutions = (req, res) => {
	// CHECK TOKEN
	const token = req.body.token || req.query.token || req.headers['x-access-token']

	if (token) {
		
		const auth = jwt.verify(token, process.env.ACCLAB_PLATFORM_KEY)

		if (auth?.authorization?.includes('api')) {
			let { pads, sdgs, thematic_areas, contributors, limit } = req.query || {}

			if (pads && !Array.isArray(pads)) pads = [pads]
			if (sdgs && !Array.isArray(sdgs)) sdgs = [sdgs]
			if (contributors && !Array.isArray(contributors)) contributors = [contributors]

			if (pads?.length || sdgs?.length || thematic_areas?.length || contributors?.length) {
				
				// GET THE tag IDs
				DB.general.tx(gt => {
					const gbatch = []
					if (thematic_areas?.length > 0) {
						gbatch.push(gt.any(`
							SELECT id FROM tags
							WHERE type = 'thematic_areas'
							AND name IN ($1:csv)
						;`, [ thematic_areas ]))
					} else gbatch.push(null)
					if (sdgs?.length > 0) {
						gbatch.push(gt.any(`
							SELECT id FROM tags
							WHERE type = 'sdgs'
							AND key IN ($1:csv)
								OR name IN ($1:csv)
						;`, [ sdgs ]))
					} else gbatch.push(null)
					return gt.batch(gbatch)
					.catch(err => console.log(err))
				}).then(tags => {
					const [ thematic_areas_ids, sdg_ids ] = tags
					const f_pads = pads ? DB.pgp.as.format(`AND p.id IN ($1:csv)`, [pads.map(d => +d)]) : ''
					// const f_sdgs = sdgs ? DB.pgp.as.format(`AND p.sdgs @> ANY('{$1:csv}'::jsonb[])`, [sdgs.map(d => +d)]) : ''
					const f_sdgs = sdg_ids ? DB.pgp.as.format(`AND p.id IN (SELECT pad FROM tagging WHERE type = 'sdgs' AND tag_id IN ($1:csv))`, [ sdg_ids.map(d => +d.id) ]) : ''
					// const f_thematic_areas = thematic_areas ? DB.pgp.as.format(`AND p.tags ?| ARRAY[$1:csv]`, [thematic_areas]) : ''
					const f_thematic_areas = thematic_areas_ids ? DB.pgp.as.format(`AND p.id IN (SELECT pad FROM tagging WHERE type = 'thematic_areas' AND tag_id IN ($1:csv))`, [ thematic_areas_ids.map(d => +d.id) ]) : ''
					// const f_contributors = contributors ? DB.pgp.as.format(`AND p.contributor IN ($1:csv)`, [ contributors.map(d => +d) ]) : ''
					const f_limit = limit ? DB.pgp.as.format(`LIMIT $1::INT`, [ limit ]) : ''

					return DB.conn.tx(t => {
						const batch = []
						batch.push(t.oneOrNone(`
							SELECT COUNT (p.id)::INT FROM pads p
							WHERE p.status >= 2
								$1:raw
								$2:raw
								$3:raw
						;`, [ f_pads, f_sdgs, f_thematic_areas ], d => d ? d.count : d))
						// ;`, [f_pads, f_sdgs, f_thematic_areas, f_contributors], d => d ? d.count : d))
						batch.push(t.any(`
							SELECT p.id, p.sections, p.title, to_char(p.date, 'DD Mon YYYY') AS date, owner AS contributor_id FROM pads p
							WHERE p.status >= 2
								$1:raw
								$2:raw
								$3:raw
							$4:raw
						;`, [ f_pads, f_sdgs, f_thematic_areas, f_limit ])
						.then(async results => {
							// const data = await join.users(results, [ language, 'contributor_id' ])
							const data = await join.users(results, [ 'en', 'contributor_id' ])
							return data
						}).catch(err => console.log(err)))
						// ;`, [f_pads, f_sdgs, f_thematic_areas, f_contributors, f_limit]))
						return t.batch(batch)
						.catch(err => console.log(err))
					}).then(results => {
						const [ count, pads ] = results
						console.log(count, pads)
						pads.forEach(d => {
							d.imgs = parsers.getImg(d)
							d.sdgs = parsers.getSDGs(d)
							d.thematic_areas = parsers.getTags(d)
							if (thematic_areas) d.rank = array.intersection.call(d.thematic_areas, thematic_areas)?.length / (d.thematic_areas || 1)
							else if (sdgs) d.rank = array.intersection.call(d.sdgs, sdgs)?.length / (d.sdgs.length || 1)
							else d.rank = d.id
						})
						pads.sort((a, b) => {
							return b.rank - a.rank
							// THIS SHOULD THEN BE RANDOMIZED
						})
						res.status(200).json({ count: count, pads: pads })
					}).catch(err => console.log(err))
				})
			} else res.status(400).json({ message: 'Missing filters. You cannot retrieve all data at once.' })
		} else res.status(403).json({ message: 'It seems you do not have the authorization to use the api.' })


		// return DB.conn.tx(t => {
		// 	return t.any(`
		// 		SELECT uuid FROM mappers
		// 	;`).then(results => {
		// 		results = results.map(d => d.uuid)
		// 		// ADD PLATFORM REQUEST KEYS
		// 		results.push(process.env.ACCLAB_PLATFORM_KEY)
				
		// 		const auth = results.map(d => {
		// 			try {
		// 				return jwt.verify(token, d)
		// 			} catch (err) {
		// 				return null
		// 			}
		// 		}).filter(d => d)?.[0]
				
				
		// 	})
		// }).catch(err => console.log(err))
	} else res.status(403).json({ message: 'You need an access token for this api.' })
}
exports.api.file = (req, res) => {
	// CHECK TOKEN
	const token = req.body.token || req.query.token || req.headers['x-access-token']

	if (token) {
		
		const auth = jwt.verify(token, process.env.ACCLAB_PLATFORM_KEY)

		if (auth?.authorization?.includes('api')) {
			const { filepath } = req.query || {}

			if (filepath) res.sendFile(filepath)
			else res.status(400).json({ message: 'Missing file path.' })
		} else res.status(403).json({ message: 'It seems you do not have the authorization to use the api.' })

		// return DB.conn.any(`
		// 	SELECT uuid FROM mappers
		// ;`).then(results => {
		// 	results = results.map(d => d.uuid)
		// 	// ADD PLATFORM REQUEST KEYS
		// 	results.push(process.env.ACCLAB_PLATFORM_KEY)
			
		// 	const auth = results.map(d => {
		// 		try {
		// 			return jwt.verify(token, d)
		// 		} catch (err) {
		// 			return null
		// 		}
		// 	}).filter(d => d)?.[0]
			
		// }).catch(err => console.log(err))
	} else res.status(403).json({ message: 'You need an access token for this api.' })
}


exports.notfound = (req, res) => {
	res.send('This is not the route that you are looking for')
}



String.prototype.simplify = function () {
	return this.valueOf().replace(/[^\w\s]/gi, '').replace(/\s/g, '').toLowerCase()
}
String.prototype.capitalize = function () {
	return this.valueOf().charAt(0).toUpperCase() + this.valueOf().slice(1)
}
String.prototype.removeAccents = function () {
	// CREDIT TO https://stackoverflow.com/questions/990904/remove-accents-diacritics-in-a-string-in-javascript
	return this.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}
String.prototype.replacePunctuation = function (replacement) {
	return this.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, replacement).replace(/\s{2,}/g, ' ') // THIS KEEPS COMMAS
}