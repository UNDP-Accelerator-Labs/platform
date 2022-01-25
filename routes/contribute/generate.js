const config = require('../../config.js')
const DB = require('../../db-config.js')
const path = require('path')
const fs = require('fs')
const PDFDocument = require('pdfkit')
// DOCUMENTATION HERE: https://pdfkit.org/docs/getting_started.html
const { v4: uuidv4 } = require('uuid')

exports.main = (req, res) => {
	// CHECK THE PAD EXISTS
	const { uuid } = req.session || {}
	const { format } = req.params || {}
	const { id } = req.body || {}

	if (!format) format = 'pdf'
	if (!id) res.send('No id submitted')
	
	const rem_size = 12 // THIS IS THE BASIC FONT SIZE FOR THE PDF DOCUMENT
	const colors = {
		dark_blue: '#0A4C73',
		mid_blue: '#0468B1',
		light_blue: '#32BEE1',

		dark_red: '#A51E41',
		mid_red: '#FA1C26',
		light_red: '#F03C8C',

		dark_green: '#418246',
		mid_green: '#61B233',
		light_green: '#B4DC28',

		dark_yellow: '#FA7814',
		mid_yellow: '#FFC10E',
		light_yellow: '#FFF32A',

		dark_grey: '#000000',
		mid_grey: '#646464',
		light_grey: '#969696'
	}

	DB.conn.one(`
		SELECT * FROM pads WHERE id = $1
	;`, [+id]).then(result => {
		console.log('data to generate pdf with')
		// console.log(result)
		
		const dir = path.join(__dirname, `../../public/generated/`)
		if (!fs.existsSync(dir)) fs.mkdirSync(dir)

		const target = path.join(dir, `p-${id}.${format}`)
		const doc = new PDFDocument({ 
			// font: 'Noto Sans', 
			info: { 
				'Title': result.title || 'Unnamed pad',
				'Author': `${ 'author' } name via ${config.title}`,
				'Subject': 'This document was created using PDFKit: https://pdfkit.org/docs/getting_started.html',
				'ModDate': Date.now()
			},
			size: 'A4'
		})
		// CREATE THE WRITE STREAM
		doc.pipe(fs.createWriteStream(target))
		doc.pipe(res)

		result.sections.forEach(d => {
			addSection({ data: d, lang: 'en', doc: doc }) // CHANGE en TO CURRENT LANGUAGE // ALTHOUGH THIS SHOULD NOT BE NEEDED HERE
		})

		doc.end() // FINALIZE THE STREAM FOR THE PDF FILE
	}).catch(err => console.log(err))


	function addSection (kwargs) {
		const { data, lang, doc } = kwargs || {}
		let { title, lead, structure, items, group, instruction } = data || {}
		if (!title) title = ''
		if (!lead) lead = ''
		if (!structure) structure = []
		if (!items) items = []

		if (title) {
			doc.text(title)
		}
		if (lead) {
			doc.save()
			doc.fontSize(rem_size * 1.25)
			doc.text(lead)
			doc.fontSize(rem_size)
			doc.restore()
		}
		// const header = section.addElems('div', 'section-header')
		// 	.addElems('label')
		// 	.attrs({ 
		// 		'data-placeholder': d => 'Section header', // TO DO: TRANSLATION
		// 		'contenteditable': editing && !templated ? true : null 
		// 	}).html(d => d.title)

		// if (templated && lead) {
		// 	const medialead = new Media({
		// 		parent: section.node(), 
		// 		type: 'lead', 
		// 		datum: { type: 'lead', lead: lead },
		// 		lang: lang
		// 	})
		
		items.forEach(d => {
			populateSection(d, lang, doc)
		})
	}

	function populateSection (data, lang = 'en', doc) {
		if (data.instruction) {
			doc.save()
			doc.fillColor(colors.mid_blue)
			doc.strokeColor(colors.mid_blue)
			doc.moveTo(doc.page.margins.left, doc.y - 1)
				.lineTo(doc.page.margins.left, doc.y - 1 + doc.heightOfString(data.instruction))
				.dash(1, { space: 2 })
				.stroke()
			doc.text(data.instruction, { indent: 10 })
		
			// RESET THE FONT OF THE DOC
			// doc.fillColor('#000')

			// heightOfString(text, options)
			doc.restore()
		}
		
		// MEDIA
		if (data.type === 'img') addImg({ data: data, lang: lang, doc: doc })
		// if (data.type === 'mosaic') addMosaic({ data: data, lang: lang, doc: doc })
		// // if (data.type === 'video') addVideo({ data: data, lang: lang, doc: doc }) // CANNOT ADD VIDEO TO PDF
		// if (data.type === 'drawing') addDrawing({ data: data, lang: lang, doc: doc })
		if (data.type === 'txt') addTxt({ data: data, lang: lang, doc: doc })
		if (data.type === 'embed') addEmbed({ data: data, lang: lang, doc: doc })
		if (data.type === 'checklist') addChecklist({ data: data, lang: lang, doc: doc })
		// if (data.type === 'radiolist') addRadiolist({ data: data, lang: lang, doc: doc })
		
		// // META
		// // if (data.type === 'location') {
		// // 	// THIS COMPLEX STATEMENT IS LEGACY (ORIGINALLY ONLY ONE centerpoint COULD BE PLACED)
		// // 	if ((!c.centerpoint && !c.centerpoints) || 
		// // 		(c.centerpoint && (!c.centerpoint.lat || !c.centerpoint.lng)) || 
		// // 		!c.centerpoints.length
		// // 	) {
		// // 		c.centerpoints = [<%- JSON.stringify(locals.centerpoint) %>]
		// // 	} else if (c.centerpoint && !c.centerpoints) c.centerpoints = [c.centerpoint]
		// // 	addMap({ data: data, lang: lang, doc: doc })
		// // }
		
		// if (data.type === 'sdgs') addSDGs({ data: data, lang: lang, doc: doc })
		// if (data.type === 'tags') addTags({ data: data, lang: lang, doc: doc })
		// if (data.type === 'skills') addSkills({ data: data, lang: lang, doc: doc })
		// if (data.type === 'datasources') addDataSources({ data: data, lang: lang, doc: doc })
		// // GROUP
		if (data.type === 'group') addGroup({ data: data, lang: lang, doc: doc })
		// MOVE DOWN THE DOC
		doc.moveDown()
		// RESET THE FONT OF THE DOC
		// doc.font('Helvetica')
		// doc.fillColor('#000')
	}


	// TO DO: FINISH THE PDF GENERATOR FOR PADS
	// THEN MOVE TO consent APP AND FINALIZE SLIDESHOWS WITH POSSIBILITY TO EXPORT TO PDF
	// THEN CHANGE ALL 'published' PADS TO PDFs IN consent APP


	function addImg (kwargs) { 
		const { data, lang, doc } = kwargs || {}
		let { type, src, textalign, scale } = data || {}
		if (!type) type = 'img'
		if (!src) src = null
		if (!textalign) textalign = 'left'
		if (!scale) scale = 'original'
		
		console.log('looking for image')
		if (src) {
			const img = doc.openImage(path.join(__dirname, `../../public/${src}`))
			doc.image(img, { width: Math.min(doc.page.width - doc.x - doc.page.margins.right, img.width) })
		}
		// const media = new Media({ 
		// 	parent: section || d3.select('.group-container.focus').node() || d3.select('.media-layout.focus').node() || d3.selectAll('.media-layout').last().node(), 
		// 	container: container,
		// 	type: type, 
		// 	datum: { type: type, textalign: textalign, scale: scale, src: src, instruction: instruction, required: required },
		// 	focus: focus || false,
		// 	lang: lang
		// })
				
		// if (src) {
		// 	const img = new Image()
		// 	img.onload = function () { 
		// 		media.media.addElems('img').attrs({ 'class': d => d.scale, 'src': d => this.src })
		// 	}
		// 	img.onerror = function (err) {
		// 		if (err) console.log(err)
		// 		// if (img.src !== src) img.src = src
		// 		// else console.log(err)
		// 	}
		// 	img.src = `/${src}`
		// }
	}
	function addTxt (kwargs) {
		const { data, lang, doc } = kwargs || {}
		let { fontsize, fontweight, fontstyle, textalign, txt, instruction } = data || {}
		if (!fontsize) fontsize = 1
		if (!fontweight) fontweight = 'normal'
		if (!fontstyle) fontstyle = 'normal'
		if (!textalign) textalign = 'left'
		if (!txt) txt = ''

		doc.save()
		doc.fontSize(rem_size / fontsize)
		if (fontweight === 'bold' && fontstyle === 'italic') doc.font('Helvetica-BoldOblique')
		else if (fontweight === 'bold' && fontstyle !== 'italic') doc.font('Helvetica-Bold')
		else if (fontweight !== 'bold' && fontstyle === 'italic') doc.font('Helvetica-Oblique')
		doc.text(txt, {
			align: textalign
		})
		doc.fontSize(rem_size)
		doc.restore()
		return null
	}
	function addEmbed (kwargs) {
		const { data, lang, doc } = kwargs || {}
		let { fontsize, fontweight, fontstyle, textalign, html, instruction } = data || {}
		if (!textalign) textalign = 'left'
		if (!html) html = ''

		doc.save()
		doc.font('Courier')
		doc.text(html, {
			align: textalign
		})
		doc.restore()
		return null
	}
	function addChecklist (kwargs) { 
		const { data, lang, doc } = kwargs || {}
		let { fontsize, fontweight, fontstyle, options, instruction } = data || {}
		if (!fontsize) fontsize = 1
		if (!fontweight) fontweight = 'normal'
		if (!fontstyle) fontstyle = 'normal'
		if (!options) options = []
		else {
			// THIS IS SO THAT ANY NULL OPTION (THAT MIIGHT COME FROM AN EXCEL SHEET) GETS PUSHED TO THE END
			options.sort((a, b) => {
				if (a.name === b.name) return 0
				else if (!a.name || !a.name.trim().length) return 1
				else if (!b.name || !b.name.trim().length) return -1
				else return a.id < b.id ? -1 : 1
			})
		}
		options = options.filter(d => d.name)

		doc.save()
		doc.fontSize(rem_size / fontsize)
		if (fontweight === 'bold' && fontstyle === 'italic') doc.font('Helvetica-BoldOblique')
		else if (fontweight === 'bold' && fontstyle !== 'italic') doc.font('Helvetica-Bold')
		else if (fontweight !== 'bold' && fontstyle === 'italic') doc.font('Helvetica-Oblique')
		options.forEach(d => {
			console.log(d)
			if (!d.checked) doc.fillColor('#999')
			else doc.fillColor('#000')
			doc.list([d.name])
		})
		doc.restore()
	}

	function addGroup (kwargs) {
		console.log('found a group')
		const { data, lang, doc } = kwargs || {}
		let { type, structure, items, instruction, repeat } = data || {}
		if (!type) type = 'group'
		if (!structure) structure = []
		if (!items) items = []

		doc.moveDown()
		doc.save()
		doc.translate(20, 0)
		for (let i = 0; i < items.length; i ++) {
			items[i].forEach(d => populateSection(d, lang, doc))
			doc.moveDown()
		}
		doc.restore()
	}
}

