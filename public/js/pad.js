const obsvars = {
	attributes: true, 
	attributeFilter: ['class'],
	attributeOldValue: true,
	subtree: false, 
	childList: false,
	characterData: false,
	characterDataOldValue: false
}
const observer = new MutationObserver(evt => {
	const header = d3.select('header ul.primary') 

	setTimeout(_ => {
		if (evt.unique('type', true).includes('attributes') 
			&& evt.unique('attributeName', true).includes('class') 
			&& (evt.map(d => d.oldValue).join(' ').includes('focus') && !evt.map(d => d.target.className).join(' ').includes('focus'))
			&& !evt.map(d => d.target.className).filter(d => d.includes('focus')).length
		) {
			const changedContent = window.sessionStorage.getItem('changed-content')
			if (changedContent) {
				window.sessionStorage.removeItem('changed-content')
				// SAVE
				let item = evt.find(d => d.oldValue.includes('focus'))
				item = item.oldValue.split(' ').find(d => d.includes('-container') && !['media-container', 'meta-container'].includes(d)).replace('-container', '').trim()
				// console.log(item)
				partialSave(item)
			}
		}
	}, 100)
})
// MEDIA PROTOTYPE
const Media = function (kwargs) {
	let { parent, container, type, datum, focus, lang } = kwargs || {}
	parent = d3.select(parent).classed('focus', focus)
	
	// if (container) console.log(container.node())
	// NOTE: CHANGE HERE: .container USED TO BE .media >> NEED TO UPDATE EVERYWHERE
	this.type = type
	this.lang = lang
	this.constraint = datum.constraint

	this.container = (container || parent.insertElem('.repeat-container', 'div', `media-container ${type}-container`)) // MAYBE ADD ACTIVITY AS CLASS HERE
		.classed('focus', focus)
		.datum(datum)
	.each(d => d.level = 'media')
		.style('text-align', d => d.textalign)
	.on('click.focus', function () { d3.select(this).classed('focus', editing) }) // TO DO: CHANGE EDITING VAR HERE > PLACE IT IN BACK END, LIKE FOR THE browse VIEW
	if (editing || activity === 'preview') this.input = this.container.addElems('div', 'input-group fixed')
	if (editing) this.opts = this.container.addElems('div', 'opts', d => [d], d => d.type)
	if (templated) this.instruction = this.container.addElems('div', 'instruction', d => [d], d => d.type)
		.attr('data-placeholder', d => d.instruction)
		.text(d => d.instruction)
	this.media = this.container.addElems('div', 'media', d => [d], d => d.type)
		.classed(`media-${type}`, true)
	if ((editing && !templated) || activity === 'preview') this.placement = this.container.addElems('div', 'placement-opts', d => [d], d => d.type)
		// .classed('hide', instruction && activity !== 'preview')
	.addElems('div', 'opt', [
		{ label: 'north', value: 'move-up', fn: _ => this.move('move-up') }, 
		{ label: 'close', value: 'delete', fn: _ => this.rmMedia() }, 
		{ label: 'south', value: 'move-down', fn: _ => this.move('move-down') }
	]).on('click', d => {
		d3.event.stopPropagation()
		d.fn()
		if (editing) switchButtons(lang)
	}).on('mouseup', _ => d3.event.stopPropagation())
		.addElems('i', 'material-icons')
		.html(d => d.label)

	if (editing) observer.observe(this.container.node(), obsvars)
}
Media.prototype.rmMedia = function () {
	const datum = this.container.datum()
	const level = datum.level
	const type = datum.type

	if (activity !== 'preview') {
		if (type === 'img') {
			const deleted = JSON.parse(window.sessionStorage.getItem('deleted')) || []
			deleted.push(datum.src)
			window.sessionStorage.setItem('deleted', JSON.stringify(deleted))
		} else if (type === 'mosaic') {
			const deleted = JSON.parse(window.sessionStorage.getItem('deleted')) || []
			datum.srcs.forEach(d => deleted.push(d))
			window.sessionStorage.setItem('deleted', JSON.stringify(deleted))
		} else if (type === 'video') {
			// TO DO
		} 
	}
	this.container.remove()
	// FOR META INPUT
	const input = d3.select(`#input-meta-${type}`).node()
	if (input) input.disabled = false
	if (editing) partialSave(level)
}
Media.prototype.move = function (dir) {
	let sourceTop = this.container.node().offsetTop
	let sourceHeight = this.container.node().offsetHeight
	let sourceMargin = parseInt(getComputedStyle(this.container.node()).marginBottom)
	const level = this.container.datum().level

	const metaLayout = d3.select('.meta-layout')
	const openInset = metaLayout.selectAll('.inset').filter(function () { return this.style.maxHeight.length })
	// CHECK WHETHER AN INSET IS OPEN
	new Promise(resolve => {
		if (openInset.node() && this.container.classed('meta-container')) {
			openInset.node().style.maxHeight = null
			window.setTimeout(_ => { 
				sourceTop = this.container.node().offsetTop
				sourceHeight = this.container.node().offsetHeight
				sourceMargin = parseInt(getComputedStyle(this.container.node()).marginBottom)
				resolve()
			}, 500)
		} else resolve()
	}).then(_ => {
		if (dir.includes('up')) { // THE SOURCE IS MOVING UP AND THE TARGET IS MOVING DOWN
			const target = this.container.node().previousSibling
			if (target) {
				const targetTop = target.offsetTop
				const moveSource = targetTop - sourceTop
				const moveTarget = sourceHeight + sourceMargin
				this.container.classed('move', true).style('transform', `translateY(${moveSource}px)`)
				d3.select(target).classed('move', true).style('transform', `translateY(${moveTarget}px)`)
				window.setTimeout(_ => {
					this.container.classed('move', false).style('transform', null)
					d3.select(target).classed('move', false).style('transform', null)
					this.container.node().parentNode.insertBefore(this.container.node(), target)
					
					if (editing) partialSave(level)
				}, 1000)
				if (openInset.node()) window.setTimeout(_ => openInset.node().style.maxHeight = `${openInset.node().scrollHeight}px`, 1250)
			}
		} else {
			const target = this.container.node().nextSibling
			if (target) {
				const targetTop = target.offsetTop
				const targetHeight = target.offsetHeight
				const targetMargin = parseInt(getComputedStyle(target).marginBottom)
				const moveSource = targetHeight + targetMargin
				const moveTarget = sourceTop - targetTop
				this.container.classed('move', true).style('transform', `translateY(${moveSource}px)`)
				d3.select(target).classed('move', true).style('transform', `translateY(${moveTarget}px)`)
				window.setTimeout(_ => {
					this.container.classed('move', false).style('transform', null)
					d3.select(target).classed('move', false).style('transform', null)
					this.container.node().parentNode.insertBefore(target, this.container.node())
					if (openInset.node()) openInset.node().style.maxHeight = `${openInset.node().scrollHeight}px`

					if (editing) partialSave(level)
				}, 1000)
				if (openInset.node()) window.setTimeout(_ => openInset.node().style.maxHeight = `${openInset.node().scrollHeight}px`, 1250)
			}
		}
	})
}
// META PROTOTYPE
const Meta = function (kwargs) {
	const { type, maxheight, focus } = kwargs
	// Meta IS AN INSTANCE OF Media WITH AN INSET
	Media.call(this, kwargs)
	// TWEAK THE Media INSTANCES
	this.container.classed('media-container', false).classed('meta-container', true)
		.each(d => d.level = 'meta')
		.on('click.expand', _ => this.expand({ forceopen: true }))
	this.media.classed(`media media-${type}`, false).classed(`meta meta-${type}`, true)
	if (editing) this.inset = this.container.addElems('div', `inset ${type}-inset-container`)
	// OPEN THE INSET
	if (focus) this.expand({ timeout: 250, maxheight: maxheight })
}
Meta.prototype = Object.create(Media.prototype) // THIS IS IMPORTANT TO HAVE ACCESS TO THE prototype FUNCTIONS move AND rmMedia
Meta.prototype.constructor = Meta
Meta.prototype.expand = function (kwargs) {
	let { timeout, maxheight, forceopen } = kwargs
	if (!timeout) timeout = 0

	window.setTimeout(_ => {
		if (this.inset.node().style.maxHeight && !forceopen) this.inset.node().style.maxHeight = null
		else {
			this.inset.node().style.maxHeight = `${maxheight ? Math.min(this.inset.node().scrollHeight, maxheight) : this.inset.node().scrollHeight}px`
			const input = this.inset.select('input[type=text]').node()
			// if (input) input.focus()
		}
	}, timeout)
}
const Taglist = function (kwargs) {
	const { type, url, datum, opencode, lang } = kwargs || {}
	const { tags, constraint } = datum || {}
	// Taglist IS AN INSTANCE OF Meta
	Meta.call(this, kwargs)
	const meta = this

	meta.media.attr('data-placeholder', vocabulary['missing tag'][lang])
	.addElems('div', 'tag', c => c.tags, c => c)
	.addElems('label')
		.html(c => c.name ? c.name.capitalize() : '') // KEPT THIS, BUT IT SHOULD NOT HAPPEN
	// POPULATE THE INSET
	return new Promise(resolve => {
		if (meta.inset) {
			GET(`${url}?lang=${lang}`)
			.then(data => {
				meta.tags = meta.inset.addElem('div', `inset-${type}`)
					.addElems('div', 'tag', data)
					.classed('selected', d => tags.map(c => c.name.simplify()).includes(d.name.simplify()))
				meta.tags.addElem('input')
					.attrs({ 
						'id': d => `${type.slice(0, -1)}-${d.name.simplify()}`, 
						'type': 'checkbox', 
						'name': type.slice(0, -1), 
						'value': d => d.name, 
						'checked': d => tags.map(c => c.name.simplify()).includes(d.name.simplify()) || null,
						'disabled': function (d) {
							const checked = meta.inset.selectAll(`.inset-${type} .tag input:checked`).data()
							return (constraint && checked.length >= constraint) && !(this.checked) ? true : null
						}
					})
				.on('change', function (d) { 
					const checked = meta.inset.selectAll(`.inset-${type} .tag input:checked`).data()

					if (constraint && checked.length >= constraint) {
						meta.inset.selectAll(`.inset-${type} .tag input:not(:checked)`)
						.each(function () { 
							this.disabled = true 
							d3.select(this.parentNode).classed('disabled', true)
						})
					} else {
						meta.inset.selectAll(`.inset-${type} .tag input`)
						.each(function () { 
							this.disabled = false 
							d3.select(this.parentNode).classed('disabled', false)
						})
					}
					if (!constraint || checked.length <= constraint) {
						toggleClass(this.parentNode, 'selected')
						// const sel = d3.select(this)

						meta.container.each(c => c.tags = checked)
							.select(`.meta-${type}`)
							.addElems('div', 'tag', c => c.tags, c => c)
						.addElems('label')
							.html(c => c.name.capitalize())
						
						meta.inset.selectAll(`.inset-${type} .tag`).classed('hide', false)
						meta.inset.select('input[type=text]').node().value = ''

						if (meta.opts) {
							meta.opts.selectAll('.opt-group .opt .constraint').html(d => {
								return d.value - checked.length
							})
						}
						
						if (editing) switchButtons(lang)
					}
				})

				meta.tags.addElem('label')
					.attrs({ 'for': d => `${type.slice(0, -1)}-${d.name.simplify()}` })
					.html(d => d.name.capitalize())

				meta.filter = meta.inset.addElem('div', 'filter-or-add')
				meta.filter.addElem('input')
					.attrs({ 'type': 'text', 'name': type.slice(0, -1), 'id': `filter-${type}-field` })
				.on('keyup', function () {
					const evt = d3.event
					const sel = d3.select(this)
					const val = this.value.trim().toLowerCase()
					const parent = meta.inset.select(`.inset-${type}`)

					if (val.length) {
						parent.selectAll('.tag input').each(function () { 
							if (!this.value.toLowerCase().includes(val)) {
								d3.select(this.parentNode).classed('hide', true)
							}
						})
						if (evt.code === 'Enter' || evt.keyCode === 13) meta.recode(opencode)
					}
				}).on('input', function () {
					const evt = d3.event
					const sel = d3.select(this)
					const val = this.value.trim().toLowerCase()
					const parent = meta.inset.select(`.inset-${type}`)

					if (evt.inputType === 'deleteContentBackward') {
						parent.selectAll('.tag input').each(function () { 
							if (this.value.toLowerCase().includes(val) || !(val && val.length)) {
								d3.select(this.parentNode).classed('hide', false)
							}
						})
						// UPDATE THE MAX HEIGHT OF THE INSET
						meta.expand({ forceopen: true })
					}
				}).on('blur', function () { fixLabel(this) })

				meta.filter.addElem('label')
					.attr('for', `filter-${type}-field`)
					.html(opencode ? vocabulary['looking for something or add'][lang] : vocabulary['looking for something'][lang])

				meta.filter.addElems('button',  'add')
					.on('click', _ => meta.recode(opencode))
				.addElems('i', 'material-icons')
					.html('add_circle_outline')
			})
		} 
		resolve(meta)
	})
}
Taglist.prototype = Object.create(Meta.prototype) // THIS IS IMPORTANT TO HAVE ACCESS TO THE prototype FUNCTIONS move AND rmMedia
Taglist.prototype.constructor = Taglist
Taglist.prototype.recode = function (opencode = true) {
	const meta = this
	const filter = meta.filter.select(`input#filter-${meta.type}-field`)
	const val = filter.node().value.trim().toLowerCase()
	const prechecked = meta.inset.selectAll(`.inset-${meta.type} .tag input:checked`).data()

	const existingTags = [] // THIS HELPS FILTER OUT TAGS AS THE USER IS TYPING
	meta.inset.selectAll(`.inset-${meta.type} .tag input`).each(function () { 
		existingTags.push(this.value.toLowerCase())
	})

	if (!existingTags.includes(val) && opencode) { 
		const opt = meta.inset.select(`.inset-${meta.type}`).insertElem('input[type=text]', 'div', 'tag')
			.datum({ name: val })
			.classed('selected', !meta.constraint || prechecked.length < meta.constraint)
		opt.addElem('input')
		.attrs({ 
			'id': c => `${meta.type.slice(0, -1)}-${c.name.simplify()}`, 
			'type': 'checkbox', 
			'name': meta.type.slice(0, -1), 
			'value': c => c.name
		}).each(function () {
			const sel = d3.select(this)
			if (meta.constraint && prechecked.length >= meta.constraint) {
				meta.inset.selectAll(`.inset-${meta.type} .tag input:not(:checked)`)
				.each(function () { 
					this.disabled = true 
					d3.select(this.parentNode).classed('disabled', true)
				})
			} else {
				sel.attr('checked', true)
				meta.inset.selectAll(`.inset-${meta.type} .tag input`)
				.each(function () { 
					this.disabled = false 
					d3.select(this.parentNode).classed('disabled', false)
				})
			}
		}).on('change', function () { 
			const checked = meta.inset.selectAll(`.inset-${meta.type} .tag input:checked`).data()

			if (meta.constraint && checked.length >= meta.constraint) {
				meta.inset.selectAll(`.inset-${meta.type} .tag input:not(:checked)`)
				.each(function () { 
					this.disabled = true 
					d3.select(this.parentNode).classed('disabled', true)
				})
			} else {
				meta.inset.selectAll(`.inset-${meta.type} .tag input`)
				.each(function () { 
					this.disabled = false 
					d3.select(this.parentNode).classed('disabled', false)
				})
			}
			if (!meta.constraint || checked.length <= meta.constraint) {
				toggleClass(this.parentNode, 'selected')
				const sel = d3.select(this)

				meta.container.each(c => c.tags = checked)
					.select(`.meta-${meta.type}`)
					.addElems('div', 'tag', c => c.tags, c => c)
				.addElems('label')
					.html(c => c.name.capitalize())
				
				meta.inset.selectAll(`.inset-${meta.type} .tag`).classed('hide', false)
				meta.inset.select('input[type=text]').node().value = ''

				if (meta.opts && meta.constraint) {
					meta.opts.selectAll('.opt-group .opt .constraint').html(d => {
						return d.value - checked.length
					})
				}
				
				if (editing) switchButtons(meta.lang)
			}
		})

		opt.addElem('label')
			.attr('for', c => `${meta.type.slice(0, -1)}-${c.name.simplify()}`)
			.html(c => c.name.capitalize())
	} else {
		if (!meta.constraint || prechecked.length < meta.constraint) {
			meta.inset.selectAll(`.inset-${meta.type} .tag input[type=checkbox]`)
				.filter(function () { return this.value.simplify() === val.simplify() })
				.attr('checked', true)
			.each(function () { d3.select(this.parentNode).classed('selected', true) })
		}
	}
	// UPDATE THE CHIPS THAT ARE DISPLAYED
	const checked = meta.inset.selectAll(`.inset-${meta.type} .tag input:checked`).data()
	meta.container.each(c => c.tags = checked)
		.select(`.meta-${meta.type}`)
		.addElems('div', 'tag', c => c.tags, c => c)
	.addElems('label')
		.html(c => c.name.capitalize())
	// UPDATE THE MAX HEIGHT OF THE INSET
	meta.expand({ timeout: 250, forceopen: true })

	filter.node().value = ''
	meta.inset.selectAll(`.inset-${meta.type} .tag`).classed('hide', false)

	if (meta.opts && meta.constraint) {
		const checked = meta.inset.selectAll(`.inset-${meta.type} .tag input:checked`).data()
		meta.opts.selectAll('.opt-group .opt .constraint').html(d => {
			return d.value - checked.length
		})
	}

	if (editing) switchButtons(meta.lang)
}


function addLoader (sel) {
	const loader = sel.addElems('div', 'lds-ellipsis')
	loader.addElem('div')
	loader.addElem('div')
	loader.addElem('div')
	loader.addElem('div')
	return loader
}

function populateSection (data, lang = 'en', section) {
	// MEDIA
	if (data.type === 'img') addImg({ data: data, lang: lang, section: section })
	if (data.type === 'mosaic') addMosaic({ data: data, lang: lang, section: section })
	if (data.type === 'video') addVideo({ data: data, lang: lang, section: section })
	if (data.type === 'txt') addTxt({ data: data, lang: lang, section: section })
	if (data.type === 'embed') addEmbed({ data: data, lang: lang, section: section })
	if (data.type === 'checklist') addChecklist({ data: data, lang: lang, section: section })
	if (data.type === 'radiolist') addRadiolist({ data: data, lang: lang, section: section })
	// META
	// if (data.type === 'location') {
	// 	// THIS COMPLEX STATEMENT IS LEGACY (ORIGINALLY ONLY ONE centerpoint COULD BE PLACED)
	// 	if ((!c.centerpoint && !c.centerpoints) || 
	// 		(c.centerpoint && (!c.centerpoint.lat || !c.centerpoint.lng)) || 
	// 		!c.centerpoints.length
	// 	) {
	// 		c.centerpoints = [<%- JSON.stringify(locals.centerpoint) %>]
	// 	} else if (c.centerpoint && !c.centerpoints) c.centerpoints = [c.centerpoint]
	// 	addMap({ data: data, lang: lang, section: section })
	// }
	if (data.type === 'sdgs') addSDGs({ data: data, lang: lang, section: section })
	if (data.type === 'tags') addTags({ data: data, lang: lang, section: section })
	if (data.type === 'skills') addSkills({ data: data, lang: lang, section: section })
	if (data.type === 'datasources') addDataSources({ data: data, lang: lang, section: section })
	// GROUP
	if (data.type === 'group') addGroup({ data: data, lang: lang, section: section })
}
function uploadImg (form, lang = 'en', container = null, focus = true) {
	fetch(form.action, {
		method: form.method,
		body: new FormData(form)
	}).then(res => res.json())
	.then(json => {
		const notification = d3.select('body').addElem('div', 'notification')
			.addElem('div')
			.html('Image successfully uploaded.<i class="material-icons">done</i>') // TO DO: TRANSLATION
		setTimeout(_ => notification.remove(), 4000)
		switchButtons(lang)
		return json
	}).then(data => addImgs(data, lang, container, focus))
	.catch(err => { if (err) throw err })
}
function deleteImg (sel, lang = 'en') {
	const deleted = JSON.parse(window.sessionStorage.getItem('deleted')) || []
	const container = sel.findAncestor('media-container')
	const datum = container.datum()
	
	if (datum.type === 'img') {
		deleted.push(datum.src)
		window.sessionStorage.setItem('deleted', JSON.stringify(deleted))
	} else if (datum.type === 'mosaic') {
		const src = sel.datum()
		const mosaicItem = sel.findAncestor('mosaic-item')
		const mosaic = sel.findAncestor('media-mosaic')
		container.each(d => d.srcs = d.srcs.filter(c => c !== src))
		// DELETE AND STORE
		deleted.push(sel.datum())
		window.sessionStorage.setItem('deleted', JSON.stringify(deleted))
		mosaicItem.remove()
		// UPDATE DISPLAY
		const items = mosaic.selectAll('.mosaic-item')
		if (items.size() === 0) container.remove()
		else if (items.size() === 1) {
			// REPLACE THE MOSAIC WITH A SINGLE IMAGE
			addImg({ data: { src: items.select('img').datum() }, lang: lang, container: container, focus: true })
		}
		else mosaic.classed('x2', items.size() < 3)
		switchButtons(lang)
	}
}
function addImgs (array, lang = 'en', container = null, focus = false) {
	const fls = array.filter(d => d.status === 200)
	if (fls.length === 1) fls.forEach(f => addImg({ data: { src: f.src }, lang: lang, container: container, focus: focus })) // ONLY ONE IMAGE SO NO MOSAIC
	else addMosaic({ data: { srcs: fls.map(f => f.src) }, lang: lang, container: container, focus: focus })
}
function uploadVideo (form, lang = 'en', container = null, focus = true) {
	const ellipsis = d3.select('.media-layout').addElems('div', 'lds-ellipsis')
	ellipsis.addElem('div')
	ellipsis.addElem('div')
	ellipsis.addElem('div')
	ellipsis.addElem('div')

	fetch(form.action, {
		method: form.method,
		body: new FormData(form)
	}).then(res => res.json())
	.then(json => {
		ellipsis.remove()
		const notification = d3.select('body').addElem('div', 'notification')
			.addElem('div')
			.html('Video successfully uploaded.<i class="material-icons">done</i>') // TO DO: TRANSLATION
		setTimeout(_ => notification.remove(), 4000)
		switchButtons(lang)
		return json
	}).then(data => {
		const fls = data.filter(d => d.status === 200)
		if (fls.length === 1) fls.forEach(f => addVideo({ data: { src: f.src }, lang: lang, container: container, focus: focus }))
	})
	.catch(err => { if (err) throw err })
}
function autofillTitle () {
	if (!(head.select('.title').node().innerText || head.select('.title').node().innerText.trim().length)) {
		const firstText = main.select('.layout:not(.description-layout) .media-txt').node()
		if (firstText && firstText.innerText) head.select('.title').html(_ => {
			const cutoff = 75
			if (firstText.innerText.split('\n').length > 1) {
				if (firstText.innerText.split('\n')[0].length > cutoff) return `${firstText.innerText.split('\n')[0].slice(0, cutoff)}…`
				else return `${firstText.innerText.split('\n')[0]}`
			} else {
				if (firstText.innerText.length > cutoff) return `${firstText.innerText.split('\n')[0].slice(0, cutoff)}…`
				else return `${firstText.innerText}`
			}
			partialSave('title')
		})
	}
}

function addSection (kwargs) {
	const { data, lang, sibling, focus } = kwargs || {}
	let { title, lead, structure, items, repeat, group, instruction } = data || {}
	if (!title) title = ''
	if (!lead) lead = ''
	if (!structure) structure = []
	if (!items) items = []

	if (editing && !items.length && templated) items = JSON.parse(JSON.stringify(structure)) // TO DO: THIS IS NOT OPTIMAL, BUT DEEP COPY IS NEEDED

	d3.selectAll('.media-layout').classed('focus', false)

	// if (sibling) console.log(d3.select(`main#pad div.inner div.body section${sibling}`))

	const section = d3.select('main#pad div.inner div.body')
		.insertElem(sibling || '.media-input-group', 'section', `media-layout layout ${activity}`)
		.classed('repeat', repeat || false)
		.classed('focus', focus && !templated)
		.datum({ type: 'section', title: title, lead: lead, structure: structure, items: items, repeat: repeat, group: group })
	.on('click.focus', function () { d3.select(this).classed('focus', editing && !templated) })

	// DETERMINE ID TO KNOW WHETHER SECTION CAN BE REMOVED
	let section_id = uuidv4()
	// let section_id = 0
	// d3.selectAll('.media-layout').each(function (d, i) {
	// 	if (this === section.node()) section_id = i
	// })
	// NOTE THIS FOLLOWS A LOT OF THE Media OBJECT CONSTRUCTOR: MAYBE LATER HOMOGENIZE WITH A SUPER OBJECT
	if (
		((editing || activity === 'preview') && section_id !== 0 && !templated)
		|| (templated 
			&& repeat 
			&& d3.selectAll('.layout.repeat').filter(d => d.group === group)
				.filter((d, i) => i === 0).node() !== section.node()
		)
	) {
		const placement = section.addElems('div', 'placement-opts', d => [d], d => d.type)
		placement.addElems('div', 'opt', [
			// { label: 'north', value: 'move-up', fn: _ => this.move('move-up') }, 
			{ label: 'close', value: 'delete', fn: _ => rmSection() }, 
			// { label: 'south', value: 'move-down', fn: _ => this.move('move-down') }
		]).on('click', d => {
			d3.event.stopPropagation()
			d.fn()
			if (editing) switchButtons(lang)
		}).on('mouseup', _ => d3.event.stopPropagation())
			.addElems('i', 'material-icons')
			.html(d => d.label)

		function rmSection () {
			// FOR META INPUT
			section.selectAll('.media-container, .meta-container').data()
			.forEach(d => {
				const input = d3.select(`#input-meta-${d.type}`).node()
				if (input) input.disabled = false
			})

			section.remove()
			// MAKE SURE THE OPTION TO REPEAT IS DISPLAYED
			const section_group = d3.selectAll('.layout.repeat').filter(d => d.group === group)
			section_group.filter((d, i) => i === section_group.size() - 1)
				.select('.repeat-container').classed('hide', false)

			if (editing) partialSave('media')
		}
	}

	const header = section.addElems('div', 'section-header')
		.addElems('label')
		.attrs({ 
			'data-placeholder': d => 'Section header', // TO DO: TRANSLATION
			'contenteditable': editing && !templated ? true : null 
		}).html(d => d.title)
	.on('keydown', function () {
		const evt = d3.event
		if (evt.code === 'Enter' || evt.keyCode === 13) {
			evt.preventDefault()
			this.blur()
		}
	}).on('blur', _ => partialSave('media'))

	if (templated && lead) {
		const medialead = new Media({
			parent: section.node(), 
			type: 'lead', 
			datum: { type: 'lead', lead: lead },
			lang: lang
		})
		// REMOVE THE PLACEMENT OPTIONS: TITLES CANNOT BE MOVED
		medialead.opts.remove()

		medialead.media.attrs({ 
			'data-placeholder': d => 'Lead paragraph', // TO DO: TRANSLATION
			'contenteditable': editing && !templated ? true : null 
		}).html(d => d.lead)
	}
	if (templated && repeat) {
		// HIDE THE PREVIOUS REPEAT BUTTONS FOR THE GROUP
		d3.selectAll('.layout.repeat').filter(d => d.group === group)
			.select('.repeat-container').classed('hide', true)

		const mediarepeat = new Media({
			parent: section.node(), 
			type: 'repeat', 
			datum: { type: 'repeat', instruction: instruction },
			lang: lang
		})
		// REMOVE THE PLACEMENT OPTIONS: TITLES CANNOT BE MOVED
		mediarepeat.opts.remove()
		mediarepeat.instruction.remove()

		mediarepeat.media.addElems('button')
		.on('click', function () {
			const sel = d3.select(this)
			
			section.findAncestor('pad').selectAll('.body>*')
			.each(function (d, i) {
				if (this === section.node()) {
					kwargs.sibling = `section:nth-child(${i + 2})`
					kwargs.focus = true
					
					const new_section = addSection(kwargs)
					d3.select(new_section).classed('animate-in', true)
					.each(function (c) {
						c.structure.forEach(b => populateSection (b, lang, this))
					})
					
					partialSave('media')
				}
			})
		}).addElems('div').attrs({ 
			'data-placeholder': d => 'Repeat section' // TO DO: TRANSLATION
		}).html(d => d.instruction)
	}

	if (items.length) section.each(function (d) {
		d.items.forEach(c => populateSection (c, lang, this))	
	})

	return section.node()
}

function addImg (kwargs) { 
	const { data, lang, section, container, focus } = kwargs || {}
	let { type, src, textalign, scale, instruction } = data
	if (!type) type = 'img'
	if (!src) src = null
	if (!textalign) textalign = 'left'
	if (!scale) scale = 'original'
	
	const media = new Media({ 
		parent: section || d3.select('.group-container.focus').node() || d3.select('.media-layout.focus').node() || d3.selectAll('.media-layout').last().node(), 
		container: container,
		type: type, 
		datum: { type: type, textalign: textalign, scale: scale, src: src, instruction: instruction },
		focus: focus || false,
		lang: lang
	})
	
	if (media.opts) {
		media.opts.addElems('div', 'opt-group', [
			[{ key: 'scale', label: 'photo_size_select_large', value: 'original' }, { key: 'scale', label: 'photo_size_select_actual', value: 'cover' }],
			[{ key: 'h-align', label: 'format_align_left', value: 'left' }, { key: 'h-align', label: 'format_align_center', value: 'center' }, { key: 'h-align', label: 'format_align_right', value: 'right' }]
		]).addElems('button', 'opt', d => d)
			.classed('active', d => {
				if (d.key === 'scale') return scale ? d.value === scale : d.value === 'original'
				else if (d.key === 'h-align') return textalign ? d.value === textalign : d.value === 'left'
			}).attr('type', 'button')
		.each(function (d) { d3.select(this).classed(d.value, true) })
		.on('click', function (d) {
			const sel = d3.select(this)
			sel.findAncestor('opt-group').selectAll('.opt').classed('active', function () { return this == sel.node() })
			if (d.key === 'scale') media.container.select('img').attr('class', c => c.scale = d.value)
			else if (d.key === 'h-align') media.media.style('text-align', c => c.textalign = d.value)
			
			if (editing) switchButtons(lang)
		}).addElems('i', 'material-icons')
			.html(d => d.label)
	}

	media.media.attr('data-placeholder', d => vocabulary['missing image'][lang])
	
	if (src) {
		const img = new Image()
		img.onload = function () { 
			media.media.addElems('img').attrs({ 'class': d => d.scale, 'src': d => this.src })
		}
		img.onerror = function (err) {
			if (img.src !== src) img.src = src
			else console.log(err)
		}
		img.src = `/${src}`
	}

	// WE NEED THE ICON IF
	// THE PAD IS BASED ON A TEMPLATE: templated
	// THE PAD IS IN create, preview MODE
	// THERE IS NOT IMAGE YET
	if (templated && (activity !== 'view' || (activity === 'preview' && !src))) { 		
		let form_id = uuidv4()
		// let form_id = 0
		// d3.selectAll('.media-container.img-container').each(function (d, i) {
		// 	if (this === media.container.node()) form_id = i
		// })
		
		if (media.input) {
			const form = media.input.addElems('form')
				.attrs({ 'action': '/upload/img', 'method': 'POST', 'enctype': 'multipart/form-data' })
			form.addElems('input')
			.attrs({
				'type': 'file', 
				'id': `input-media-img-${form_id}`, 
				'name': 'img', 
				'accept': 'image/*, .pdf', 
				'multiple': true, 
				'disabled': activity === 'preview' ? true : null 
			}).on('change', function () { 
				// REMOVE IMAGES HERE
				uploadImg(this.form, lang, media.container)
				form.select('label').classed('highlight', this.value && this.value.length)
			})
			form.addElems('label')
				.classed('highlight', src ? true : false)
				.attr('for', `input-media-img-${form_id}`)
			.on('mousedown', function () {
				d3.select(this).classed('highlight', activity !== 'preview')
			}).on('mouseup', function () {
				d3.select(this).classed('highlight', false)
			}).addElems('i', 'material-icons')
				.html('add_photo_alternate')
		}
	}
}
function addMosaic (kwargs) {
	const { data, lang, section, container, focus } = kwargs || {}
	let { type, srcs, verticalalign, instruction } = data
	if (!type) type = 'mosaic'
	if (!srcs) srcs = []
	if (!verticalalign) verticalalign = 'center'

	const media = new Media({ 
		parent: section || d3.select('.group-container.focus').node() || d3.select('.media-layout.focus').node() || d3.selectAll('.media-layout').last().node(), 
		container: container,
		type: type, 
		datum: { type: type, verticalalign: verticalalign, srcs: srcs, instruction: instruction },
		focus: focus || false,
		lang: lang
	})

	if (media.opts) {
		media.opts.addElems('div', 'opt-group align-opts', [
			[],
			[{ key: 'v-align', label: 'format_align_left', value: 'start' }, { key: 'v-align', label: 'format_align_center', value: 'center' }, { key: 'v-align', label: 'format_align_right', value: 'end' }]
		]).addElems('button', 'opt', d => d)
			.classed('active', d => {
				if (d.key === 'v-align') return verticalalign ? d.value === verticalalign : d.value === 'center'
			}).attr('type', 'button')
		.each(function (d) { d3.select(this).classed(d.value, true) })
		.on('click', function (d) {
			const sel = d3.select(this)
			if (d.key === 'v-align') {
				sel.findAncestor('opt-group').selectAll('.opt').classed('active', function () { return this == sel.node() })
				media.media.style('align-items', c => c.verticalalign = d.value)
			}
			
			if (editing) switchButtons(lang)
		}).addElems('i', 'material-icons')
			.html(d => d.label)
	}

	media.media.attr('data-placeholder', d => d.instruction)
		.classed('x2', d => d.srcs.length < 3)
		.style('align-items', d => d.verticalalign)
	.addElems('div', 'mosaic-item', d => d.srcs)
	.each(function (d) {
		const sel = d3.select(this)
		const img = new Image()
		img.onload = function () { 
			sel.addElem('img')
				.attr('src', this.src)

			if (editing) {
				sel.addElems('div', 'opts index-opts')
					.addElems('div', 'opt', [{ label: 'west', value: 'move-up' }, { label: 'close', value: 'delete' }, { label: 'east', value: 'move-down' }])
					.each(function (d) { d3.select(this).classed(d.value, true) })
				.on('click', function (d) {
					const sel = d3.select(this)
					const source = sel.findAncestor('mosaic-item').node()
					const parent = media.media.node()

					if (d.value === 'delete') deleteImg(sel.findAncestor('mosaic-item').select('img'), lang)
					if (d.value === 'move-up') {
						const prev = source.previousSibling
						parent.insertBefore(source, prev)
						// RESET THE DATA SO THAT IT IS SAVED PROPERLY
						media.media.each(function (d) { d.srcs = d3.select(this).selectAll('.mosaic-item').data() })
					} 
					else if (d.value === 'move-down') {
						let next
						if (source.nextSibling) {
							if (source.nextSibling.nextSibling) next = source.nextSibling.nextSibling
							else next = null
						} else next = parent.children[0]
						parent.insertBefore(source, next)
						// RESET THE DATA SO THAT IT IS SAVED PROPERLY
						media.media.each(function (d) { d.srcs = d3.select(this).selectAll('.mosaic-item').data() })
					}

					if (editing) switchButtons(lang)
				}).addElems('i', 'material-icons')
					.html(d => d.label)
			}
		}
		img.onerror = function (err) {
			if (img.src !== d) img.src = d
			else console.log(err)
		}
		img.src = `/${d}`
	})
}
function addVideo (kwargs) { 
	const { data, lang, section, container, focus } = kwargs || {}
	let { type, src, textalign, instruction } = data
	if (!type) type = 'video'
	if (!src) src = null
	if (!textalign) textalign = 'left'
	
	const media = new Media({ 
		parent: section || d3.select('.group-container.focus').node() || d3.select('.media-layout.focus').node() || d3.selectAll('.media-layout').last().node(), 
		container: container,
		type: type, 
		datum: { type: type, textalign: textalign, src: src, instruction: instruction },
		focus: focus || false,
		lang: lang
	})

	if (media.opts) {
		media.opts.addElems('div', 'opt-group', [
			[], // THIS IS EMPTY, AND FOR THE PROPER DISPLAY OF THE paragraph-opts
			[{ key: 'h-align', label: 'format_align_left', value: 'left' }, { key: 'h-align', label: 'format_align_center', value: 'center' }, { key: 'h-align', label: 'format_align_right', value: 'right' }]
		]).addElems('button', 'opt', d => d)
		.classed('active', d => {
			if (d.key === 'h-align') return textalign ? d.value === textalign : d.value === 'left'
		}).attr('type', 'button')
			.each(function (d) { d3.select(this).classed(d.value, true) })
		.on('click', function (d) {
			const sel = d3.select(this)
			if (d.key === 'h-align') {
				sel.findAncestor('opt-group').selectAll('.opt').classed('active', function () { return this == sel.node() })
				media.media.style('text-align', c => c.textalign = d.value)
			}

			if (editing) switchButtons(lang)
		}).addElems('i', 'material-icons')
			.html(d => d.label)
	}

	media.media.attr('data-placeholder', d => d.instruction)

	if (src) {
		media.media.addElems('video')
			.attrs({ 'src': d => `/${src}`, 'controls': true })
			.node().load()
	}

	if (templated && (activity !== 'view' || (activity === 'preview' && !src))) { 
		let form_id = uuidv4()
		// let form_id = 0
		// d3.selectAll('.media-container.video-container').each(function (d, i) {
		// 	if (this === container.node()) form_id = i
		// })

		if (media.input) {
			const form = media.input.addElems('form')
				.attrs({ 'action': '/upload/video', 'method': 'POST', 'enctype': 'multipart/form-data' })
			form.addElems('input')
			.attrs({
				'type': 'file', 
				'id': `input-media-video-${form_id}`, 
				'name': 'video', 
				'accept': 'video/mp4,video/x-m4v,video/webm,video/*', 
				'disabled': activity !== 'preview' ? true : null 
			}).on('change', function () { 
				uploadVideo(this.form, lang, container)
				form.select('label').classed('highlight', this.value && this.value.length)
			})
			form.addElems('label')
				.classed('highlight', src ? true : false)
				.attrs({ 'for': `input-media-video-${form_id}`, 'title': 'Add a video.' })
			.on('mousedown', function () {
				d3.select(this).classed('highlight', activity !== 'preview')
			}).on('mouseup', function () {
				d3.select(this).classed('highlight', false)
			}).addElems('i', 'material-icons')
				.html('ondemand_video')
		}
	}
}
function addTxt (kwargs) {
	const { data, lang, section, focus } = kwargs || {}
	let { type, fontsize, fontweight, fontstyle, textalign, txt, instruction, constraint } = data || {}
	if (!type) type = 'txt'
	if (!fontsize) fontsize = 1
	if (!fontweight) fontweight = 'normal'
	if (!fontstyle) fontstyle = 'normal'
	if (!textalign) textalign = 'left'
	if (!txt) txt = ''

	const media = new Media({
		parent: section || d3.select('.group-container.focus').node() || d3.select('.media-layout.focus').node() || d3.selectAll('.media-layout').last().node(), 
		type: type, 
		datum: { type: type, fontsize: fontsize, fontweight: fontweight, fontstyle: fontstyle, textalign: textalign, txt: txt, instruction: instruction, constraint: constraint },
		focus: focus || false,
		lang: lang
	})

	if (media.opts) {
		const opts = media.opts.addElems('div', 'opt-group', _ => {
			const font_styles = [ { key: 'font-properties', label: 'add', value: 'scale-up' }, { key: 'font-properties', label: 'remove', value: 'scale-down' }, { key: 'font-properties', label: 'format_bold', value: 'bold' }, { key: 'font-properties', label: 'format_italic', value: 'italic' } ]
			const para_styles = [ { key: 'h-align', label: 'format_align_left', value: 'left' }, { key: 'h-align', label: 'format_align_center', value: 'center' }, { key: 'h-align', label: 'format_align_right', value: 'right' } ]
			if (constraint) para_styles.push({ key: 'constraint', label: 'block', value: constraint })
			return [font_styles, para_styles]
		}).addElems('button', 'opt', d => d)
			.classed('active', d => {
				if (d.key === 'font-properties') {
					if (d.value.includes('scale')) return true
					if (fontweight && d.value === fontweight) return true
					if (fontstyle && d.value === fontstyle) return true
				} else if (d.key === 'h-align') return textalign ? d.value === textalign : d.value === 'left'
				else if (d.key === 'constraint') return constraint ? true : false
			}).attr('type', 'button')
		.each(function (d) { d3.select(this).classed(d.value, true) })
		.on('click', function (d) {
			const sel = d3.select(this)
			if (d.key === 'font-properties') {
				sel.classed('active', d.value.includes('scale') || !sel.classed('active'))

				media.media.each(c => {
					if (d.value === 'scale-up') c.fontsize += .1	
					if (d.value === 'scale-down') c.fontsize -= .1	
					if (d.value === 'bold') c.fontweight = sel.classed('active') ? d.value : 'normal'
					if (d.value === 'italic') c.fontstyle = sel.classed('active') ? d.value : 'normal'
				}).styles({	
					'min-height': c => `${c.fontsize}rem`, 
					'font-size': c => `${c.fontsize}rem`, 
					'line-height': c => `${c.fontsize * 1.35}rem`,
					'font-weight': c => c.fontweight,
					'font-style': c => c.fontstyle,
					'text-align': c => c.textalign
				}).node().focus()
			} else if (d.key === 'h-align') {
				sel.findAncestor('opt-group').selectAll('.opt').classed('active', function () { return this == sel.node() })
				media.media.style('text-align', c => c.textalign = d.value).node().focus()
			}
			
			if (editing && d.key !== 'constraint') switchButtons(lang)
		})
		opts.addElems('i', 'material-icons')
			.html(d => d.label)
		opts.addElems('span', 'constraint', d => d.key === 'constraint' ? [d] : [])
			.html(d => d.value - txt.length)
	}
	
	media.media.attrs({ 
		// 'data-placeholder': d => d.instruction || vocabulary['empty txt'][lang], 
		'data-placeholder': vocabulary['empty txt'][lang], 
		'contenteditable': editing ? true : null 
	}).styles({	
		'min-height': d => `${d.fontsize}rem`, 
		'font-size': d => `${d.fontsize}rem`, 
		'line-height': d => `${d.fontsize * 1.35}rem`,
		'font-weight': d => d.fontweight,
		'font-style': d => d.fontstyle,
		'text-align': d => d.textalign 
	}).text(d => d.txt)
	.on('keydown', function (d) {
		const evt = d3.event
		if ((d.constraint && this.innerText.length >= d.constraint) && !(evt.key === 'Backspace' || evt.keycode === 8)) {
			d3.event.preventDefault()
		}
	}).on('keyup', function () {
		if (media.opts) {
			media.opts.selectAll('.opt-group .opt .constraint').html(d => {
				return d.value - this.innerText.length
			})
		}
	})

	if (focus) media.media.node().focus()
}
function addEmbed (kwargs) {
	const { data, lang, section, focus } = kwargs || {}
	let { type, textalign, html, src, instruction } = data || {}
	if (!type) type = 'embed'
	if (!textalign) textalign = 'left'
	if (!html) html = ''
	if (!src) src = null

	const media = new Media({
		parent: section || d3.select('.group-container.focus').node() || d3.select('.media-layout.focus').node() || d3.selectAll('.media-layout').last().node(), 
		type: type, 
		datum: { type: type, src: src, textalign: textalign, html: html, instruction: instruction },
		focus: focus || false,
		lang: lang
	})

	if (media.opts) {
		media.opts.addElems('div', 'opt-group', [
				[], // THIS IS EMPTY, AND FOR THE PROPER DISPLAY OF THE paragraph-opts
				[{ key: 'h-align', label: 'format_align_left', value: 'left' }, { key: 'h-align', label: 'format_align_center', value: 'center' }, { key: 'h-align', label: 'format_align_right', value: 'right' }]
			]).addElems('button', 'opt', d => d)
		.classed('active', d => {
			if (d.key === 'h-align') return textalign ? d.value === textalign : d.value === 'left'
		}).attr('type', 'button')
			.each(function (d) { d3.select(this).classed(d.value, true) })
		.on('click', function (d) {
			const sel = d3.select(this)
			if (d.key === 'h-align') {
				sel.findAncestor('opt-group').selectAll('.opt').classed('active', function () { return this == sel.node() })
				media.media.style('text-align', c => c.textalign = d.value)
			}
			if (editing) switchButtons(lang)
		}).addElems('i', 'material-icons')
			.html(d => d.label)
	}

	media.media.attrs({
		// 'data-placeholder': d => d.instruction || vocabulary['empty embed'][lang], 
		'data-placeholder': vocabulary['empty embed'][lang], 
		'contenteditable': editing
	}).classed('padded', true)
	.style('text-align', d => d.textalign)
		.html(d => d.html)
	.on('focus', function () {
		setTimeout(_ => d3.select(this).classed('padded', true).style('text-align', 'left').text(this.innerHTML), 250)
	}).on('blur', async function (d) {
		const sel = d3.select(this)
		const isURL = this.innerText.trim().match(/^(((http|https):\/\/)|(www\.))(?!.*\<)(?!.*\>)/gi)

		if (isURL) {
			const url = this.innerText.trim()
			const isYoutube = url.match(/^(((http|https):\/\/)|(www\.))(?=.*youtube)/gi)
			const isMSStream = url.match(/^(((http|https):\/\/))(?=.*microsoftstream)/gi)

			if (isYoutube) {
				d.src = url.replace('watch?v=', 'embed/')
				this.innerText = null
				sel.addElems('iframe')
					.attrs({
						'width': 560, 'height': 315, 'src': d.src, 'frameborder': 0, 
						'allow': 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture'
					})
				.each(function () { this.allowfullscreen })
			} else if (isMSStream) {
				d.src = url.replace(/\?(.*)/gi, '?autoplay=false&amp;showinfo=true')
				this.innerText = null
				sel.addElems('iframe')
					.attrs({ 'width': 560, 'height': 315, 'src': d.src })
					.style('border', 'none')
				.each(function () { this.allowfullscreen })
			} else {
				const screenshot = await POST('/screenshot', { src: this.innerText.trim() })
				// console.log(screenshot.message)
				if (screenshot.src) {
					d.src = screenshot.src
					this.innerText = null
					const img = new Image()
					img.onload = function () { 
						sel.style('text-align', d.textalign)
							.addElems('a')
						.attrs({ 'href': url, 'target': '_blank' })
							.addElems('img', 'cover')
							.attr('src', this.src)
					}
					img.src = `/${d.src}`
				}
			}
		} else {
			sel.style('text-align', d.textalign)
				.html(this.innerText)
		}
		sel.classed('padded', !this.children.length)
		
		if (editing) switchButtons(lang)
	})
	// media.addElems('img', 'cover', d => d.src ? [d] : [])
	//	.attr('src', d => d.src)

	if (focus) media.media.node().focus()
}
function addChecklist (kwargs) { 
	const { data, lang, section, focus } = kwargs || {}
	let { type, fontsize, fontweight, fontstyle, options, instruction } = data || {}
	if (!type) type = 'checklist'
	if (!fontsize) fontsize = 1
	if (!fontweight) fontweight = 'normal'
	if (!fontstyle) fontstyle = 'normal'
	if (!options) options = []
	else {
		// if (!populate) options.forEach(d => d.checked = false)
		// THIS IS SO THAT ANY NULL OPTION (THAT MIIGHT COME FROM AN EXCEL SHEET) GETS PUSHED TO THE END
		options.sort((a, b) => {
			if (a.name === b.name) return 0
			else if (!a.name || !a.name.trim().length) return 1
			else if (!b.name || !b.name.trim().length) return -1
			else return a.id < b.id ? -1 : 1
		})
	}

	if (editing && !options.find(d => !d.name) && !templated) options.push({ checked: false })
	if (!editing) options = options.filter(d => d.name)

	const media = new Media({
		parent: section || d3.select('.group-container.focus').node() || d3.select('.media-layout.focus').node() || d3.selectAll('.media-layout').last().node(), 
		type: type, 
		datum: { type: type, fontsize: fontsize, fontweight: fontweight, fontstyle: fontstyle, options: options, instruction: instruction },
		focus: focus || false,
		lang: lang
	})
	
	if (media.opts) {
		media.opts.addElems('div', 'opt-group', [
			[ { key: 'font-properties', label: 'add', value: 'scale-up' }, { key: 'font-properties', label: 'remove', value: 'scale-down' }, { key: 'font-properties', label: 'format_bold', value: 'bold' }, { key: 'font-properties', label: 'format_italic', value: 'italic' } ]
		]).addElems('button', 'opt', d => d)
			.classed('active', d => {
				if (d.value.includes('scale')) return true
				if (fontweight && d.value === fontweight) return true
				if (fontstyle && d.value === fontstyle) return true
			}).attr('type', 'button')
		.each(function (d) { d3.select(this).classed(d.value, true) })
		.on('click', function (d) {
			const sel = d3.select(this)
			sel.classed('active', d.value.includes('scale') || !sel.classed('active'))

			media.media.each(c => {
				if (d.value === 'scale-up') c.fontsize += .1	
				if (d.value === 'scale-down') c.fontsize -= .1	
				if (d.value === 'bold') c.fontweight = sel.classed('active') ? d.value : 'normal'
				if (d.value === 'italic') c.fontstyle = sel.classed('active') ? d.value : 'normal'
			}).select('ol')
			.styles({	
				'min-height': c => `${c.fontsize}rem`, 
				'font-size': c => `${c.fontsize}rem`, 
				'line-height': c => `${c.fontsize * 1.35}rem`,
				'font-weight': c => c.fontweight,
				'font-style': c => c.fontstyle,
				'text-align': c => c.textalign
			}).node().focus()
		
			if (editing) switchButtons(lang)
		}).addElems('i', 'material-icons')
			.html(d => d.label)
	}

	// DETERMINE ID FOR THE INPUT NAME
	let checklist_id = uuidv4()
	// let checklist_id = 0
	// d3.selectAll('.media-container.checklist-container').each(function (d, i) {
	// 	if (this === media.container.node()) checklist_id = i
	// })

	// media.media.attr('data-placeholder', d => d.instruction)
	// if (instruction) {
	// 	media.instruction.addElem('div', 'instruction')
	// 		.attr('data-placeholder', d => d.instruction)
	// 		.text(d => d.instruction)
	// }

	const list = media.media.addElem('ol')
		.styles({	
			'min-height': c => `${c.fontsize}rem`, 
			'font-size': c => `${c.fontsize}rem`, 
			'line-height': c => `${c.fontsize * 1.35}rem`,
			'font-weight': c => c.fontweight,
			'font-style': c => c.fontstyle,
			'text-align': c => c.textalign
		})
	list.call(addItem)	

	if (editing && !templated) {
		media.media.addElems('div', 'add-opt')
			.on('click', function () {
				media.container.each(d => {
					d.options = d.options.filter(c => c.name && c.name.length)
					d.options.push({ checked: false })
				})
				list.call(addItem)
			})
		.addElems('i', 'material-icons')
			.html('add_circle')
	}

	function addItem (sel) {
		const opts = sel.addElems('li', 'opt', d => d.options)
			.classed('valid', d => d.name && d.name.length)
			.each((d, i) => d.id = i)
		opts.addElems('div', 'hide')
			.addElems('input')
			.attrs({ 
				'type': 'checkbox', 
				'id': d => `check-item-${checklist_id}-${d.id}`, 
				'value': d => d.name,
				'name': `checklist-${checklist_id}`, 
				'checked': d => d.checked || null,
				'disabled': editing ? null : true
			})
		.on('change', function (d) {
			d.checked = this.checked
			const sel = d3.select(this)
			sel.findAncestor('opt').select('.checkbox label i')
				.html(d => d.checked ? 'check_box' : 'check_box_outline_blank')

			// if (editing) switchButtons(lang)
			if (editing) partialSave('media')
		})
		opts.addElems('div', 'checkbox')
			.addElems('label')
			.attr('for', d => `check-item-${checklist_id}-${d.id}`)
		.addElems('i', 'material-icons')
			.html(d => d.checked ? 'check_box' : 'check_box_outline_blank')
		opts.addElems('div', 'grow')
			.addElems('label',  'list-item')
			.attrs({ 
				'for': d => `check-item-${checklist_id}-${d.id}`,
				'data-placeholder': vocabulary['new checklist item'][lang],
				'contenteditable': activity !== 'view' && !templated ? true : null
			})
		.on('keydown', function () {
			const evt = d3.event
			if ((evt.code === 'Enter' || evt.keyCode === 13) && !evt.shiftKey) {
				evt.preventDefault()
				this.blur()
				
				media.container.each(d => {
					d.options = d.options.filter(c => c.name && c.name.length)
					d.options.push({ checked: false })
				})
				list.call(addItem)
			}
		}).on('blur', function (d) {
			d.name = this.innerText.trim()
			d3.select(this).findAncestor('opt').classed('valid', d => d.name && d.name.length)

			if (editing) switchButtons(lang)
		}).html(d => d.name)

		if (editing && !templated) {
			opts.addElems('div', 'rm')
				.addElems('i', 'material-icons')
				.html('clear')
			.on('click', function (d) {
				media.container.each(c => c.options = c.options.filter(b => b.id !== d.id))
				list.call(addItem)
				
				if (editing) switchButtons(lang)
			})
		}

		const emptyOpts = opts.filter(d => !d.name)
		if (emptyOpts.node() && focus) emptyOpts.filter((d, i) => i === emptyOpts.size() - 1).select('.list-item').node().focus()
	}
}
function addRadiolist (kwargs) { 
	const { data, lang, section, focus } = kwargs || {}
	let { type, fontsize, fontweight, fontstyle, options, instruction } = data || {}
	if (!type) type = 'radiolist'
	if (!fontsize) fontsize = 1
	if (!fontweight) fontweight = 'normal'
	if (!fontstyle) fontstyle = 'normal'
	if (!options) options = []
	else {
		// if (!populate) options.forEach(d => d.checked = false)
		// THIS IS SO THAT ANY NULL OPTION (THAT MIIGHT COME FROM AN EXCEL SHEET) GETS PUSHED TO THE END
		options.sort((a, b) => {
			if (a.name === b.name) return 0
			else if (!a.name || !a.name.trim().length) return 1
			else if (!b.name || !b.name.trim().length) return -1
			else return a.id < b.id ? -1 : 1
		})
	}

	if (editing && !options.find(d => !d.name) && !templated) options.push({ checked: false })
	if (!editing) options = options.filter(d => d.name)

	const media = new Media({
		parent: section || d3.select('.group-container.focus').node() || d3.select('.media-layout.focus').node() || d3.selectAll('.media-layout').last().node(), 
		type: type, 
		datum: { type: type, fontsize: fontsize, fontweight: fontweight, fontstyle: fontstyle, options: options, instruction: instruction },
		focus: focus || false,
		lang: lang
	})
	
	if (media.opts) {
		media.opts.addElems('div', 'opt-group', [
			[ { key: 'font-properties', label: 'add', value: 'scale-up' }, { key: 'font-properties', label: 'remove', value: 'scale-down' }, { key: 'font-properties', label: 'format_bold', value: 'bold' }, { key: 'font-properties', label: 'format_italic', value: 'italic' } ]
		]).addElems('button', 'opt', d => d)
			.classed('active', d => {
				if (d.value.includes('scale')) return true
				if (fontweight && d.value === fontweight) return true
				if (fontstyle && d.value === fontstyle) return true
			}).attr('type', 'button')
		.each(function (d) { d3.select(this).classed(d.value, true) })
		.on('click', function (d) {
			const sel = d3.select(this)
			sel.classed('active', d.value.includes('scale') || !sel.classed('active'))

			media.media.each(c => {
				if (d.value === 'scale-up') c.fontsize += .1	
				if (d.value === 'scale-down') c.fontsize -= .1	
				if (d.value === 'bold') c.fontweight = sel.classed('active') ? d.value : 'normal'
				if (d.value === 'italic') c.fontstyle = sel.classed('active') ? d.value : 'normal'
			}).select('ol')
			.styles({	
				'min-height': c => `${c.fontsize}rem`, 
				'font-size': c => `${c.fontsize}rem`, 
				'line-height': c => `${c.fontsize * 1.35}rem`,
				'font-weight': c => c.fontweight,
				'font-style': c => c.fontstyle,
				'text-align': c => c.textalign
			}).node().focus()
		
			if (editing) switchButtons(lang)
		}).addElems('i', 'material-icons')
			.html(d => d.label)
	}

	// DETERMINE ID FOR THE INPUT NAME
	let radiolist_id = uuidv4()
	// let radiolist_id = 0
	// d3.selectAll('.media-container.radiolist-container').each(function (d, i) {
	// 	if (this === media.container.node()) radiolist_id = i
	// })

	// media.media.attr('data-placeholder', d => d.instruction)
	// if (instruction) {
	// 	media.media.addElem('div', 'instruction')
	// 		.attr('data-placeholder', d => d.instruction)
	// 		.text(d => d.instruction)
	// }

	const list = media.media.addElem('ol')
		.styles({	
			'min-height': c => `${c.fontsize}rem`, 
			'font-size': c => `${c.fontsize}rem`, 
			'line-height': c => `${c.fontsize * 1.35}rem`,
			'font-weight': c => c.fontweight,
			'font-style': c => c.fontstyle,
			'text-align': c => c.textalign
		})
	list.call(addItem)	

	if (editing && !templated) {
		media.media.addElems('div', 'add-opt')
			.on('click', function () {
				media.container.each(d => {
					d.options = d.options.filter(c => c.name && c.name.length)
					d.options.push({ checked: false })
				})
				list.call(addItem)
			})
		.addElems('i', 'material-icons')
			.html('add_circle')
	}

	function addItem (sel) {
		const opts = sel.addElems('li', 'opt', d => d.options)
			.classed('valid', d => d.name && d.name.length)
			.each((d, i) => d.id = i)
		opts.addElems('div', 'hide')
			.addElems('input')
			.attrs({ 
				'type': 'radio', 
				'id': d => `radio-item-${radiolist_id}-${d.id}`, 
				'value': d => d.name,
				'name': `radiolist-${radiolist_id}`, 
				'checked': d => d.checked || null,
				'disabled': editing ? null : true
			})
		.on('change', _ => {
			opts.selectAll('input[type=radio]').each(function (d) { d.checked = this.checked })
			opts.selectAll('label i').html(d => d.checked ? 'radio_button_checked' : 'radio_button_unchecked')
			// if (editing) switchButtons(lang)
			if (editing) partialSave('media')
		})
		opts.addElems('div', 'radio')
			.addElems('label')
			.attr('for', d => `radio-item-${radiolist_id}-${d.id}`)
		.addElems('i', 'material-icons')
			.html(d => d.checked ? 'radio_button_checked' : 'radio_button_unchecked')
		opts.addElems('div', 'grow')
			.addElems('label', 'list-item')
			.attrs({ 
				'for': d => `radio-item-${radiolist_id}-${d.id}`,
				'data-placeholder': vocabulary['new checklist item'][lang],
				'contenteditable': activity !== 'view' && !templated ? true : null
			})
		.on('keydown', function () {
			const evt = d3.event
			if ((evt.code === 'Enter' || evt.keyCode === 13) && !evt.shiftKey) {
				evt.preventDefault()
				this.blur()
				
				media.container.each(d => {
					d.options = d.options.filter(c => c.name && c.name.length)
					d.options.push({ checked: false })
				})
				list.call(addItem)
			}
		}).on('blur', function (d) {
			d.name = this.innerText.trim()
			d3.select(this).findAncestor('opt').classed('valid', d => d.name && d.name.length)

			if (editing) switchButtons(lang)
		}).html(d => d.name)

		if (editing && !templated) {
			opts.addElems('div', 'rm')
				.addElems('i', 'material-icons')
				.html('clear')
			.on('click', function (d) {
				media.container.each(c => c.options = c.options.filter(b => b.id !== d.id))
				list.call(addItem)
				
				if (editing) switchButtons(lang)
			})
		}

		const emptyOpts = opts.filter(d => !d.name)
		if (emptyOpts.node() && focus) emptyOpts.filter((d, i) => i === emptyOpts.size() - 1).select('.list-item').node().focus()
	}
}
// META ELEMENTS
function addMap (data, lang = 'en', focus = false) { // TO DO
	let { type, instruction, centerpoints, caption } = data || {}
	if (!type) type = 'location'
	let dragging = false

	// const input = d3.select('.meta-input-group #input-meta-location').node()
	const input = d3.select('.media-input-group #input-meta-location').node()
	if (input) input.disabled = true

	const meta = new Meta({ 
		// parent: d3.select('.meta-layout'), 
		parent: d3.select('.media-layout.focus').node() || d3.selectAll('.media-layout').last().node(), 
		type: type, 
		datum: { type: type, centerpoints: centerpoints, caption: caption, instruction: instruction },
		focus: focus,
		maxheight: 300,
		lang: lang
	})

	if (meta.opts) {
		meta.opts.addElems('div', 'opt-group', [vocabulary['click to search or add location'][lang]])
			.addElems('label')
			.html(d => d)
	}

	// THE LEAFLET CODE
	meta.media.addElem('div').attr('id', 'map')

	const singlepin = L.divIcon({
		className: 'single-pin',
		iconAnchor: [0, 24],
		labelAnchor: [-6, 0],
		popupAnchor: [0, -36],
		html: '<i class="material-icons">place</i>'
	})

	function rmPin (marker, container) {
		const btn = document.createElement('BUTTON')
		btn.innerHTML = vocabulary['remove pin'][lang]
		btn.addEventListener('click', _ => {
			group.removeLayer(marker)
			markers = markers.filter(m => m !== marker)
			const centerpoints = []
			group.eachLayer(l => {
				const latlng = l.getLatLng()
				centerpoints.push({ lat: latlng.lat, lng: latlng.lng })
			})
			if (container.node()) container.each(d => d.centerpoints = centerpoints)
			if (editing) switchButtons(lang)
		})
		return btn
	}

	const markers = centerpoints.filter(d => d).map((d, i) => {
		const marker = L.marker([d.lat, d.lng], { icon: singlepin, draggable: editing })
		if (editing) {
			marker.bindPopup(rmPin(marker, meta.container))
			marker.on('mousedown', function () {
				dragging = true
			}).on('click', function () {
				marker.openPopup()
				dragging = false
			}).on('dragend', function (evt) {
				dragging = false
				const latlng = evt.target.getLatLng()
				meta.container.each(c => c.centerpoints[i] = { lat: latlng.lat, lng: latlng.lng })
				
				if (editing) switchButtons(lang)
			})
		}
		return marker
	})

	let group = L.featureGroup(markers)

	const map = L.map('map').fitBounds(group.getBounds())//.setView([centerpoint.lat, centerpoint.lng], 13)
	if (markers.length < 2) map.setZoom(10)
	
	L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
		attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap contributors</a>',
		maxZoom: 19,
	}).addTo(map)

	let pins = group.addTo(map)

	meta.container.addElem('figcaption').html(d => d.caption)

	if (meta.inset) {
		const filter = meta.inset.addElem('div', 'search')
		filter.addElem('input')
			.attrs({ 'type': 'text', 'name': 'theme', 'id': 'search-field' })
		.on('keypress', async function () {
			const evt = d3.event
			if (evt.code === 'Enter' || evt.keyCode === 13) searchLocation()
		}).on('blur', function () {
			fixLabel(this)
		})

		filter.addElem('label')
			.attr('for', 'search-field')
			// .html(d => d.instruction || vocabulary['search place'][lang])
			.html(vocabulary['search place'][lang])

		filter.addElems('button',  'search')
			.on('click', searchLocation)
		.addElems('i', 'material-icons')
			.html('search')

		async function searchLocation () {
			const sel = d3.select('input#search-field')
			const inset = sel.findAncestor('inset')
			const location = sel.node().value.trim()

			const listContainer = inset.addElem('div', 'inset-location')
			addLoader(listContainer)
			// UPDATE THE MAX HEIGHT OF THE INSET
			meta.expand({ maxheight: 300, forceopen: true })

			const [results] = await POST('/forwardGeocoding', { locations: [location], list: true })
			listContainer.select('.lds-ellipsis').remove()

			listContainer.addElems('ul', 'panel')
			.addElems('li', 'opt location', results.locations)
				.html(d => d.formatted)
			.on('click', function (d) {
				d3.select(this.parentNode).selectAll('.opt').classed('selected', false)
				d3.select(this).classed('selected', true)

				// ADD THE LOCATION TO THE MAP
				addLocation(d.geometry)

				sel.node().value = d.formatted
				meta.container.each(c => c.centerpoint = { lat: d.geometry.lat, lng: d.geometry.lng })
				if (map) {
					map.panTo(new L.LatLng(d.geometry.lat, +d.geometry.lng)).setZoom(10)
					// CHANGE CAPTION
					meta.container.select('figcaption')
					.html(c => c.caption = `<strong>${d.formatted}</strong> found using <a href='https://opencagedata.com/credits' target='_blank'>OpenCage Geocoder</a> | &copy; <a href='https://www.openstreetmap.org/copyright' target='_blank'>OpenStreetMap contributors</a>`)
					
					if (editing) switchButtons(lang)
				}
			})
			// UPDATE THE MAX HEIGHT OF THE INSET
			meta.expand({ maxheight: 300, forceopen: true })
		}

		// ADD PINS MANUALLY
		let timer
		let offset = [[], []]
		map.on('mouseup', e => {
			window.clearTimeout(timer)
			offset = [[], []]
		})
		.on('touchend', e => {
				window.clearTimeout(timer)
				offset = [[], []]
			})
		.on('mousedown', e => {
			offset[0] = [e.containerPoint.x, e.containerPoint.x]
			if (!dragging) timer = window.setTimeout(_ => addLocation(e.latlng), 500)
		})
		.on('touchstart', e => {
			offset[0] = [e.containerPoint.x, e.containerPoint.x]
			if (!dragging) timer = window.setTimeout(_ => addLocation(e.latlng), 500)
		})
		.on('mousemove', e => offset[1] = [e.containerPoint.x, e.containerPoint.x])
		.on('touchmove', e => offset[1] = [e.containerPoint.x, e.containerPoint.x])

		function addLocation (latlng) {
			const delta = Math.sqrt(Math.pow(offset[1][0] - offset[0][0], 2) + Math.pow(offset[1][1] - offset[0][1], 2)) || 0
			if (delta < 25) {
				const marker = new L.marker([latlng.lat, latlng.lng], { icon: singlepin, draggable: true })
				markers.push(marker)
				markers.forEach((marker, i) => {
					if (editing) {
						marker.bindPopup(rmPin(marker, meta.container))
						marker.on('mousedown', function () {
							dragging = true
						}).on('click', function () {
							marker.openPopup()
							dragging = false
						}).on('dragend', function (evt) {
							dragging = false
							const latlng = evt.target.getLatLng()
							meta.container.each(d => d.centerpoints[i] = { lat: latlng.lat, lng: latlng.lng })
							
							if (editing) switchButtons(lang)
						})
					}
				})
				group = L.featureGroup(markers)
				if (pins) map.removeLayer(pins)
				pins = group.addTo(map)
				
				meta.container.each(d => d.centerpoints.push({ lat: latlng.lat, lng: latlng.lng }))
				if (editing) switchButtons(lang)
			}
		}
	}
}
function addSDGs (kwargs) {
	const { data, lang, section, focus } = kwargs || {}
	let { type, instruction, sdgs, constraint } = data || {}
	if (!type) type = 'sdgs'
	if (!sdgs) sdgs = []

	// const input = d3.select('.meta-input-group #input-meta-sdgs').node()
	const input = d3.select('.media-input-group #input-meta-sdgs').node()
	if (input) input.disabled = true

	const meta = new Meta({ 
		parent: section || d3.select('.media-layout.focus').node() || d3.selectAll('.media-layout').last().node(), 
		type: type, 
		datum: { type: type, sdgs: sdgs, instruction: instruction, constraint: constraint },
		focus: focus || false,
		lang: lang
	})

	if (meta.opts) {
		meta.opts.addElem('div', 'opt-group')
			.datum(vocabulary['click to see options'][lang])
		.addElems('label', 'instruction')
			.html(d => d)

		if (constraint) {
			const opt = meta.opts.addElem('div', 'opt-group')
				.datum({ key: 'constraint', label: 'block', value: constraint })
				.addElems('button', 'opt active')
			opt.addElems('i', 'material-icons')
				.html(d => d.label)
			opt.addElems('span', 'constraint', d => d.key === 'constraint' ? [d] : [])
				.html(d => d.value - sdgs.length)
		}
	}

	// meta.media.attr('data-placeholder', d => d.instruction || vocabulary['missing SDG'][lang])
	meta.media.attr('data-placeholder', vocabulary['missing SDG'][lang])
	.addElems('img', 'icon', c => c.sdgs, c => c)
	.each(function (c) {
		const sel = d3.select(this)
		const img = new Image()
		img.onload = function () { 
			sel.attr('src', this.src)
		}
		img.src = `/imgs/sdgs/${lang}/G${c}-c.svg`
	})

	if (meta.inset) {
		const opts = meta.inset.addElem('div', 'inset-sdgs')
			.addElems('div', 'sdg', d3.range(17).map(d => d + 1))
			.classed('selected', d => sdgs.includes(d))
		opts.addElem('input')
			.attrs({ 'id': d => `sdg-${d}`, 'type': 'checkbox', 'name': 'sdg', 'value': d => d })
		.each(function (d) { if (sdgs.includes(d)) this.checked = true })
		.on('change', function (d) { 
			const checked = meta.container.selectAll('.sdgs-inset-container .inset-sdgs .sdg input:checked').data()

			if (constraint && checked.length >= constraint) {
				meta.container.selectAll('.sdgs-inset-container .inset-sdgs .sdg input:not(:checked)')
				.each(function () { 
					this.disabled = true 
					d3.select(this.parentNode).classed('disabled', true)
				})
			} else {
				meta.container.selectAll('.sdgs-inset-container .inset-sdgs .sdg input')
				.each(function () { 
					this.disabled = false 
					d3.select(this.parentNode).classed('disabled', false)
				})
			}
			if (!constraint || checked.length <= constraint) {
				toggleClass(this.parentNode, 'selected')
				const sel = d3.select(this)

				meta.container
					.each(c => c.sdgs = checked)
					.select('.meta-sdgs')
				.addElems('img', 'icon', c => c.sdgs, c => c)
				.each(function (c) {
					const sel = d3.select(this)
					const img = new Image()
					img.onload = function () { 
						sel.attr('src', this.src)
					}
					img.src = `/imgs/sdgs/${lang}/G${c}-c.svg`
				})

				if (meta.opts) {
					meta.opts.selectAll('.opt-group .opt .constraint').html(d => {
						return d.value - checked.length
					})
				}

				if (editing) switchButtons(lang)
			}
		})
		opts.addElem('label')
			.attrs({ 'for': d => `sdg-${d}` })
		.addElem('img')
		.each(function (d) {
			const sel = d3.select(this)
			const img = new Image()
			img.onload = function () { 
				sel.attr('src', this.src)
			}
			img.src = `/imgs/sdgs/${lang}/G${d}.svg`
		})
	}
}
async function addTags (kwargs) {
	const { data, lang, section, focus } = kwargs || {}
	let { type, instruction, tags, themes, constraint } = data || {}
	if (!type) type = 'tags'
	if (!tags) tags = []

	const input = d3.select(`.media-input-group #input-meta-${type}`).node()
	if (input) input.disabled = true

	const list = await new Taglist({ 
		parent: section || d3.select('.media-layout.focus').node() || d3.selectAll('.media-layout').last().node(), 
		type: type, 
		datum: { type: type, tags: tags, instruction: instruction, constraint: constraint },
		opencode: true,
		focus: focus || false,
		lang: lang,
		// url: 'http://localhost:3000/api/thematic_areas'
		url: 'https://undphqexoacclabsapp01.azurewebsites.net/api/thematic_areas'
	})

	if (list.opts) {
		list.opts.addElem('div', 'opt-group')
			.datum(vocabulary['click to see options'][lang])
		.addElems('label', 'instruction')
			.html(d => d)

		if (constraint) {
			const opt = list.opts.addElem('div', 'opt-group')
				.datum({ key: 'constraint', label: 'block', value: constraint })
				.addElems('button', 'opt active')
			opt.addElems('i', 'material-icons')
				.html(d => d.label)
			opt.addElems('span', 'constraint', d => d.key === 'constraint' ? [d] : [])
				.html(d => d.value - tags.length)
		}
	}
}
async function addSkills (kwargs) {
	const { data, lang, section, focus } = kwargs || {}
	let { type, instruction, tags, skills, constraint } = data || {}
	if (!type) type = 'skills'
	if (!tags) tags = []

	const input = d3.select(`.media-input-group #input-meta-${type}`).node()
	if (input) input.disabled = true

	const list = await new Taglist({ 
		parent: section || d3.select('.media-layout.focus').node() || d3.selectAll('.media-layout').last().node(), 
		type: type, 
		datum: { type: type, tags: tags, instruction: instruction, constraint: constraint },
		opencode: false,
		focus: focus || false,
		lang: lang,
		url: '/api/methods'
	})

	if (list.opts) {
		list.opts.addElem('div', 'opt-group')
			.datum(vocabulary['click to see options'][lang])
		.addElems('label', 'instruction')
			.html(d => d)

		if (constraint) {
			const opt = list.opts.addElem('div', 'opt-group')
				.datum({ key: 'constraint', label: 'block', value: constraint })
				.addElems('button', 'opt active')
			opt.addElems('i', 'material-icons')
				.html(d => d.label)
			opt.addElems('span', 'constraint', d => d.key === 'constraint' ? [d] : [])
				.html(d => d.value - tags.length)
		}
	}
}
async function addDataSources (kwargs) {
	const { data, lang, section, focus } = kwargs || {}
	let { type, instruction, tags, datasources, constraint } = data || {}
	if (!type) type = 'datasources'
	if (!tags) tags = []

	const input = d3.select(`.media-input-group #input-meta-${type}`).node()
	if (input) input.disabled = true

	const list = await new Taglist({ 
		parent: section || d3.select('.media-layout.focus').node() || d3.selectAll('.media-layout').last().node(), 
		type: type, 
		datum: { type: type, tags: tags, instruction: instruction, constraint: constraint },
		opencode: true,
		focus: focus || false,
		lang: lang,
		url: '/api/datasources'
	})

	if (list.opts) {
		list.opts.addElem('div', 'opt-group')
			.datum(vocabulary['click to see options'][lang])
		.addElems('label', 'instruction')
			.html(d => d)

		if (constraint) {
			const opt = list.opts.addElem('div', 'opt-group')
				.datum({ key: 'constraint', label: 'block', value: constraint })
				.addElems('button', 'opt active')
			opt.addElems('i', 'material-icons')
				.html(d => d.label)
			opt.addElems('span', 'constraint', d => d.key === 'constraint' ? [d] : [])
				.html(d => d.value - tags.length)
		}
	}
}
// GROUPS
function addGroup (kwargs) {
	const { data, lang, section, focus } = kwargs || {}
	let { type, structure, items, values, instruction, repeat } = data || {}
	if (!type) type = 'group'
	if (!structure) structure = []
	if (!items) items = []
	if (!values) values = []

	if (editing && !items.length && templated) items.push(JSON.parse(JSON.stringify(structure))) // TO DO: NOT OPTIMAL

	const media = new Media({
		parent: section || d3.select('.media-layout.focus').node() || d3.selectAll('.media-layout').last().node(), 
		type: type, 
		datum: { type: type, structure: structure, items: items, instruction: instruction, repeat: repeat },
		focus: focus || false,
		lang: lang
	})

	if (templated && repeat) {
		if (editing) {
			media.media.addElems('div', 'add-opt')
				.on('click', function (d) {
					const sel = d3.select(this)
					media.container.each(d => {
						d.items.push(JSON.parse(JSON.stringify(structure)))  // TO DO: NOT OPTIMAL
					}).call(addItems)
					if (media.container.selectAll('.media-group-items').size() >= repeat) media.media.classed('hide', true)
				})
			.addElems('i', 'material-icons')
				.html('add_circle')
		}
	}
	media.container.call(addItems)


	function addItems (sel) {
		// DETERMINE ID TO KNOW WHETHER SECTION CAN BE REMOVED
		const groups = sel.insertElems('.media-group', 'div', 'media media-group-items', d => d.items)
		.each(function (c) { 
			this.innerHTML = ''
			c.forEach(b => populateSection(b, lang, this))
		})
		// THIS IS THE SAME AS IN MEDIA, BUT IN MEDIA WE PREVENT THESE OPTIONS WHEN TEMPLATED
		// HERE THEY ARE MADE AVAILABLE FOR REMOVING GROUP REPETITIONS
		const placement = groups.addElems('div', 'placement-opts')
		placement.addElems('div', 'opt', [
			{ label: 'close', value: 'delete', fn: sel => rmGroup(sel) }, 
		]).on('click', function (d) {
			d3.event.stopPropagation()
			d.fn(d3.select(this).findAncestor('media-group-items'))
			if (editing) switchButtons(lang)
		}).on('mouseup', _ => d3.event.stopPropagation())
			.addElems('i', 'material-icons')
			.html(d => d.label)

		function rmGroup (sel) {
			console.log(sel)
			// FOR META INPUT
			sel.selectAll('.media-container, .meta-container').data()
			.forEach(d => {
				const input = d3.select(`#input-meta-${d.type}`).node()
				if (input) input.disabled = false
			})

			sel.remove()
			// MAKE SURE THE OPTION TO REPEAT IS DISPLAYED
			if (media.container.selectAll('.media-group-items').size() < repeat) media.media.classed('hide', false)

			if (editing) partialSave('media')
		}
	}
}

// SAVING BUTTON
function switchButtons (lang = 'en') {
	const header = d3.select('header ul.primary') 
	window.sessionStorage.setItem('changed-content', true)
	// PROVIDE FEEDBACK: UNSAVED CHANGES
	header.selectAll('li:not(.placeholder)').classed('hide', true)
	header.select('.placeholder').classed('hide', false)
		.select('a button')
	.on('click', _ => partialSave())
		.html(vocabulary['save changes'][lang])
}