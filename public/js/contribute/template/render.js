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
	setTimeout(async _ => {
		if (evt.unique('type', true).includes('attributes') 
			&& evt.unique('attributeName', true).includes('class') 
			&& evt.map(d => d.oldValue).join(' ').includes('focus')
			// && (evt.map(d => d.oldValue).join(' ').includes('focus') && !evt.map(d => d.target.className).join(' ').includes('focus'))
			// && !evt.map(d => d.target.className).filter(d => d.includes('focus')).length
			&& evt.find(d => d.oldValue.includes('focus')) !== evt.find(d => d.target.className.includes('focus'))
		) {
			const changedContent = window.sessionStorage.getItem('changed-content')
			if (changedContent) {
				// SAVE
				let item = evt.find(d => d.oldValue.includes('focus'))
				item = item.oldValue.split(' ').find(d => d.includes('-container') && !['media-container', 'meta-container'].includes(d)).replace('-container', '').trim()
				await partialSave(item)
			}
		}
	}, 100)
})
// MEDIA PROTOTYPE
const Media = function (kwargs) {
	const { activity } = JSON.parse(d3.select('data[name="page"]').node()?.value)

	let { parent, container, sibling, type, datum, focus, lang } = kwargs || {}
	let { id, level, name, editable } = datum
	if (!id) id = datum.id = uuidv4()
	if (!level) level = 'media'
	parent = d3.select(parent).classed('focus', focus)

	const _self = this

	this.type = type
	this.name = name
	this.lang = lang
	this.constraint = datum.constraint
	this.editable = editable

	this.id = id
	// NOTE: CHANGE HERE: .container USED TO BE .media >> NEED TO UPDATE EVERYWHERE
	// this.container = (container || parent.insertElem('.repeat-container', 'div', `media-container ${type}-container template`)) // MAYBE ADD ACTIVITY AS CLASS HERE
	this.container = (container || parent.insertElem(function () { 
		if (this.contains(sibling)) return sibling
		else return parent.select('.repeat-container').node()
	}, 'div', `${level}-container ${type}-container template`))
		.classed('focus', focus)
	// .each(d => d.level = 'media')
	.each(function (d) {
		if (name) d3.select(this).classed(`${name}-container`, true)
	}).datum(datum)
		.style('text-align', d => d.textalign)
	.on('click.focus', function () { 
		const sel = d3.select(this)
		sel.classed('focus', _self.editable)
		// sel.findAncestor('layout').classed('focus', editing)
	})
	if (this.editable) {
		this.opts = this.container.addElems('div', 'opts', d => [d], d => d.type)
		this.opts.addElems('div', 'opt-group', [vocabulary['write instruction']])
			.addElems('label')
				.html(d => d)
	}
	if (this.editable || activity === 'preview') this.input = this.container.addElems('div', 'input-group fixed')
	this.media = this.container.addElems('div', `${level} template`, d => [d], d => d.type)
		.classed(`${level}-${type}`, true)
	.each(function (d) {
		if (name) d3.select(this).classed(`${level}-${name}`, true)
	})
	if (this.editable || activity === 'preview') {
		this.placement = this.container.addElems('div', 'placement-opts', d => [d], d => d.type)
		this.placement.addElems('div', 'opt', [
			{ label: 'north', value: 'move-up', fn: _ => this.move('move-up') }, 
			{ label: 'close', value: 'delete', fn: _ => this.rmMedia() }, 
			{ label: 'south', value: 'move-down', fn: _ => this.move('move-down') }
		]).on('click', d => {
			d3.event.stopPropagation()
			d.fn()
			if (_self.editable) switchButtons(lang)
		}).on('mouseup', _ => d3.event.stopPropagation())
			.addElems('i', 'material-icons google-translate-attr')
			.html(d => d.label)
	}
	if (this.editable) {
		const requirement_id = uuidv4()
		this.required = this.container.addElems('div', 'required', d => !['repeat', 'group', 'lead'].includes(d.type) ? [d] : [], d => d.type)
		this.required.addElems('input')
			.attrs({ 
				'id': requirement_id, 
				'type': 'checkbox', 
				'checked': d => d.required ? true : null,
				'disabled': level === 'meta' ? true : null })
		.on('change', async function (d) { 
			d.required = this.checked
			await partialSave(d.level)
		})
		this.required.addElems('label')
			.attr('for', requirement_id)
			.html('*')
	}
	// THE FOLLOWING IS DIFFERENT FROM THE Media CONSTRUCTOR IN pads.js
	this.response = this.container.addElems('div', 'response template', [type])
		.html(d => vocabulary['expect'][d])

	if (this.editable) observer.observe(this.container.node(), obsvars)
}
Media.prototype.rmMedia = async function () {
	const datum = this.container.datum()
	const { level, type, name } = datum

	this.container.remove()
	// FOR META INPUT
	if (name) {
		const input = d3.select(`#input-meta-${name}`).node()
		if (input) input.disabled = false
	}
	if (this.editable) await (level)
}
Media.prototype.move = function (dir) {
	const _self = this
	let sourceTop = this.container.node().offsetTop
	let sourceHeight = this.container.node().offsetHeight
	let sourceMargin = parseInt(getComputedStyle(this.container.node()).marginBottom)
	const level = this.container.datum().level

	const layout = this.container.findAncestor('layout')
	const openInset = layout.selectAll('.inset').filter(function () { return this.style.maxHeight.length })
	// CHECK WHETHER AN INSET IS OPEN
	new Promise(resolve => {
		if (openInset.node()) {
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
			if (
				(target && target.classList !== undefined) && 
				(target.classList.contains('media-container') || target.classList.contains('meta-container')) &&
				(!target.classList.contains('title-container') && !target.classList.contains('lead-container') && !target.classList.contains('media-group'))
			) {
				const targetTop = target.offsetTop
				const moveSource = targetTop - sourceTop
				const moveTarget = sourceHeight + sourceMargin
				this.container.classed('move', true).style('transform', `translateY(${moveSource}px)`)
				d3.select(target).classed('move', true).style('transform', `translateY(${moveTarget}px)`)
				window.setTimeout(async _ => {
					this.container.classed('move', false).style('transform', null)
					d3.select(target).classed('move', false).style('transform', null)
					this.container.node().parentNode.insertBefore(this.container.node(), target)
					
					if (_self.editable) await partialSave(level)
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
				window.setTimeout(async _ => {
					this.container.classed('move', false).style('transform', null)
					d3.select(target).classed('move', false).style('transform', null)
					this.container.node().parentNode.insertBefore(target, this.container.node())
					if (openInset.node()) openInset.node().style.maxHeight = `${openInset.node().scrollHeight}px`

					if (_self.editable) await partialSave(level)
				}, 1000)
				if (openInset.node()) window.setTimeout(_ => openInset.node().style.maxHeight = `${openInset.node().scrollHeight}px`, 1250)
			}
		}
	})
}

const Meta = function (kwargs) {
	const { type, maxheight, focus, lang } = kwargs
	// Meta IS AN INSTANCE OF Media WITH AN INSET
	Media.call(this, kwargs)
	// TWEAK THE Media INSTANCES
	this.container.classed('media-container', false).classed('meta-container', true)
		.each(d => d.level = 'meta')
		.on('click.expand', _ => this.expand({ forceopen: true }))
	this.media.classed(`media media-${type}`, false).classed(`meta meta-${type}`, true)
	if (this.editable) this.inset = this.container.insertElems('.response', 'div', `inset ${type}-inset-container template`)
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
			if (input) input.focus()
		}
	}, timeout)
}
const Taglist = function (kwargs) {
	const { type, list, url, datum, lang } = kwargs || {}
	const { constraint, name } = datum || {}
	// Taglist IS AN INSTANCE OF Meta
	Meta.call(this, kwargs)
	const _self = this

	if (_self.opts) {
		const opts = _self.opts.addElems('div', 'opt-group', [
			[], // THIS IS EMPTY, AND FOR THE PROPER DISPLAY OF THE paragraph-opts
			[{ key: 'constraint', label: 'block', value: constraint }]
		]).addElems('button', 'opt', d => d)
		.classed('active', d => {
			if (d.key === 'constraint') return constraint ? true : false
		}).attr('type', 'button')
			.each(function (d) { d3.select(this).classed(d.value, true) })
		.on('click', async function (d) {
			const sel = d3.select(this)
			const datum = _self.container.datum()
			
			if (d.key === 'constraint') {
				if (!sel.classed('active')) {
					const message = `${vocabulary['limit input']['tags']} <input type='number' name='length' value=${datum.constraint || list.length || 5} min=1> ${vocabulary['input type']['tags']}`
					const opts = [{ node: 'button', type: 'button', label: vocabulary['limit length'], resolve: _ => d3.select('.modal input[name="length"]').node().value }]
					const new_constraint = await renderPromiseModal({ message, opts })

					datum.constraint = +new_constraint
					sel.addElems('span', 'constraint').html(new_constraint)
				} else {
					datum.constraint = null
					sel.select('span', 'constraint').remove()
				}
				toggleClass(this, 'active')
			}

			if (_self.editable) await partialSave('media')
		})
		opts.addElems('i', 'material-icons google-translate-attr')
			.html(d => d.label)
		opts.addElems('span', 'constraint', d => d.key === 'constraint' ? [d] : [])
			.html(d => d.value)
	}

	_self.media.attrs({ 
		'data-placeholder': d => vocabulary['request'][name] || vocabulary['request'][type],
		'contenteditable': _self.editable ? true : null 
	})
	// .html(d => d.instruction.replace(/\r?\n/g, '<br/>'))
	.addElems('p', null, d => d.instruction.split('\n').filter(c => c))
	.html(d => d)
	
	// POPULATE THE INSET
	if (_self.inset) {
		const panel = _self.inset.addElems('div', `inset-${type}`)
			.addElems('ul', 'panel')
		panel.addElems('li', 'instruction', [{ value: vocabulary['tag instruction'] }])
			.html(d => `* ${d.value}`)
		panel.addElems('li', 'opt', list)
		.each(function (d, i) {
			const sel = d3.select(this)
			sel.addElems('div')
				.addElems('label')
				.html(`<strong>${i + 1}.</strong>`)
			sel.addElems('div', 'grow')
				.addElems('label')
				.html(d.name.capitalize())
		})
	}
}
Taglist.prototype = Object.create(Meta.prototype) // THIS IS IMPORTANT TO HAVE ACCESS TO THE prototype FUNCTIONS move AND rmMedia
Taglist.prototype.constructor = Taglist

async function populateSection (data, lang = 'en', section) {
	// MEDIA
	if (data.type === 'title') addTitle({ data, lang, section })
	if (data.type === 'img') addImg({ data, lang, section })
	if (data.type === 'drawing') addDrawing({ data, lang, section })
	if (data.type === 'txt') addTxt({ data, lang, section })
	if (data.type === 'embed') addEmbed({ data, lang, section })
	if (data.type === 'checklist') addChecklist({ data, lang, section })
	if (data.type === 'radiolist') addRadiolist({ data, lang, section })
	// META
	if (data.type === 'location') addLocations({ data, lang, section })
	if (data.type === 'index') await addIndexes({ data, lang, section })
	if (data.type === 'tag') await addTags({ data, lang, section })
	if (data.type === 'attachment') addAttachment({ data, lang, section })
	// if (!metafields.find(d => d.label === 'skills') && data.type === 'skills') addTags({ data, lang, section }) // skills IS LEGACY FOR THE ACTION PLANS PLATFORM
	// GROUP
	if (data.type === 'group') await addGroup({ data, lang, section })
}
async function autofillTitle () {
	const { activity } = JSON.parse(d3.select('data[name="page"]').node()?.value)
	const editing = activity === 'edit'

	const main = d3.select('main')
	const head = main.select('.head')

	if (!(head.select('.title').node().innerText || head.select('.title').node().innerText.trim().length)) {
		let firstText = main.select('.description-layout .txt-container .media-txt').node()
		if (!firstText.innerText || !firstText.innerText.length) firstText = main.selectAll('.media, .meta').filter(function () { return this.innerText && this.innerText.length }).node()
		if (firstText && firstText.innerText) {
			head.select('.title')
			.html(_ => {
				const cutoff = 75
				if (firstText.innerText.split('\n').length > 1) {
					if (firstText.innerText.split('\n')[0].length > cutoff) return `${firstText.innerText.split('\n')[0].slice(0, cutoff)}…`
					else return `${firstText.innerText.split('\n')[0]}`
				} else {
					if (firstText.innerText.length > cutoff) return `${firstText.innerText.split('\n')[0].slice(0, cutoff)}…`
					else return `${firstText.innerText}`
				}
			})
			if (editing) { await partialSave('title'); }
		}
	}
}

async function addSection (kwargs) {
	const { activity } = JSON.parse(d3.select('data[name="page"]').node()?.value)
	const editing = activity === 'edit'

	const { data, lang, sibling, focus } = kwargs || {}
	let { title, lead, structure, repeat, group, instruction } = data || {}

	d3.selectAll('.media-layout').classed('focus', false)

	// DETERMINE THE GROUP IF REPEAT SECTION
	if (repeat && !group) group = (d3.max(d3.selectAll('.layout.repeat').data().map(d => d ? d.group || 0 : 0)) + 1) || 0

	const section = d3.select('main#template div.inner div.body')
		// .insertElem('.media-input-group', 'section', `media-layout layout ${activity}`)
		// .insertElem(function () { return sibling || d3.select('main#template div.inner div.body .media-input-group').node() }, 'section', `media-layout layout ${activity}`)
		.insertElem(function () { return sibling }, 'section', `media-layout layout ${activity}`)
		.classed('repeat', repeat || false)
		.classed('focus', focus || false)
		.datum({ type: 'section', title, lead, structure, repeat, group })
	.on('click.focus', function () { d3.select(this).classed('focus', editing) })

	// DETERMINE ID TO KNOW WHETHER SECTION CAN BE REMOVED
	const section_id = [].indexOf.call(d3.selectAll('section.media-layout').nodes(), section.node())

	// NOTE THIS FOLLOWS A LOT OF THE Media OBJECT CONSTRUCTOR: MAYBE LATER HOMOGENIZE WITH A SUPER OBJECT
	if ((editing || activity === 'preview') && section_id !== 0) {
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
			.addElems('i', 'material-icons google-translate-attr')
			.html(d => d.label)

		async function rmSection () {
			// FOR META INPUT
			section.selectAll('.media-container, .meta-container').data()
			.forEach(d => {
				if (d.name) {
					const input = d3.select(`#input-meta-${d.name}`).node()
					if (input) input.disabled = false
				}
			})

			section.remove()
			if (editing) await partialSave('media')
		}
	}

	const header = section.addElems('div', 'section-header')
		.addElems('h1')
		.attrs({ 
			'data-placeholder': d => vocabulary['section header'],
			'contenteditable': editing ? true : null 
		}).html(d => d.title)
	.on('keydown', function () {
		const evt = d3.event
		if (evt.code === 'Enter' || evt.keyCode === 13) {
			evt.preventDefault()
			this.blur()
		}
	}).on('blur', async _ => { if (editing) { await partialSave('media') } })

	const medialead = new Media({
		parent: section.node(), 
		type: 'lead', 
		datum: { type: 'lead', level: 'media', lead, editable: editing },
		lang
	})

	// REMOVE THE PLACEMENT OPTIONS: TITLES CANNOT BE MOVED
	if (medialead.opts) medialead.opts.remove()
	if (medialead.placement) medialead.placement.remove()
	if (medialead.response) medialead.response.remove()

	medialead.media.attrs({ 
		'data-placeholder': d => vocabulary['lead paragraph'],
		'contenteditable': editing ? true : null 
	}).html(d => d.lead)

	if (repeat) {
		const mediarepeat = new Media({
			parent: section.node(), 
			type: 'repeat',
			datum: { type: 'repeat', level: 'media', instruction, editable: editing },
			lang
		})
		// REMOVE THE PLACEMENT OPTIONS: TITLES CANNOT BE MOVED
		if (mediarepeat.opts) mediarepeat.opts.remove()
		if (mediarepeat.placement) mediarepeat.placement.remove()
		if (mediarepeat.response) mediarepeat.response.remove()

		mediarepeat.media.addElems('button')
		.addElems('div').attrs({ 
			'data-placeholder': d => vocabulary['repeat section'],
			'contenteditable': editing ? true : null 
		}).html(d => d.instruction)
		.on('blur', async _ => { if (editing) { await partialSave('media') } })
	}

	if (structure) {
		// await section.each(async function (d) {
		// await Promise.all(pagestructure.map(d => populateSection(d, lang, section.node())))
		// })

		// THE PROMISES DO NOT SEEM TO WORK PROPERLY
		// WITH ASYNC CONTENT GETTING RENDERED OUT OF ORDER
		const { structure: pagestructure } = section.datum()
		for (let s = 0; s < structure.length; s++) {
			await populateSection(structure[s], lang, section.node())
		}
	}

	return section.node()
}
function addTitle (kwargs) {
	const { activity } = JSON.parse(d3.select('data[name="page"]').node()?.value)
	const editing = activity === 'edit'

	const { data, lang, section, sibling, focus } = kwargs || {}
	let { id, level, type, name, instruction, required, editable } = data || {}
	if (!level) level = 'media'
	if (!type) type = 'title'
	if (!name) name = null
	if (!instruction) instruction = ''
	required = required ?? true
	if ([null, undefined].includes(editable)) editable = editing

	const media = new Media({
		parent: section || d3.select('.media-layout.focus').node() || d3.selectAll('.media-layout').last().node(), 
		sibling,
		type, 
		datum: { id, level, type, name, instruction, required, editable },
		focus: focus || false,
		lang
	})
	// REMOVE THE PLACEMENT OPTIONS: TITLES CANNOT BE MOVED
	if (media.placement) media.placement.remove()
	if (media.input) media.input.remove()

	media.media.attrs({ 
		'data-placeholder': d => vocabulary['request'][type],
		'contenteditable': editing ? true : null 
	})
	// .html(d => d.instruction.replace(/\r?\n/g, '<br/>'))
	.addElems('p', null, d => d.instruction.split('\n').filter(c => c))
	.html(d => d)

	if (focus) media.media.node().focus()
}
function addImg (kwargs) {
	const { activity } = JSON.parse(d3.select('data[name="page"]').node()?.value)
	const editing = activity === 'edit'

	const { data, lang, section, sibling, focus } = kwargs || {}
	let { id, level, type, name, instruction, required, editable } = data || {}
	if (!level) level = 'media'
	if (!type) type = 'img'
	if (!name) name = null
	if (!instruction) instruction = ''
	required = required ?? true
	if ([null, undefined].includes(editable)) editable = editing

	if (level === 'meta' && name) {
		const input = d3.select(`.media-input-group #input-meta-${name}`).node()
		if (input) input.disabled = true
	}

	const media = new Media({
		parent: section || d3.select('.group-container.focus .media-group-items').node() || d3.select('.media-layout.focus').node() || d3.selectAll('.media-layout').last().node(),
		sibling,
		type, 
		datum: { id, level, type, name, instruction, required, editable },
		focus: focus || false,
		lang
	})
	
	media.media.attrs({ 
		'data-placeholder': d => vocabulary['request'][type],
		'contenteditable': editing ? true : null 
	})
	// .html(d => d.instruction.replace(/\r?\n/g, '<br/>'))
	.addElems('p', null, d => d.instruction.split('\n').filter(c => c))
	.html(d => d)

	if (focus) media.media.node().focus()
}
function addDrawing (kwargs) {
	const { activity } = JSON.parse(d3.select('data[name="page"]').node()?.value)
	const editing = activity === 'edit'

	const { data, lang, section, sibling, focus } = kwargs || {}
	let { id, level, type, name, instruction, required, editable } = data || {}
	if (!level) level = 'media'
	if (!type) type = 'drawing'
	if (!name) name = null
	if (!instruction) instruction = ''
	required = required ?? true
	if ([null, undefined].includes(editable)) editable = editing

	if (level === 'meta' && name) {
		const input = d3.select(`.media-input-group #input-meta-${name}`).node()
		if (input) input.disabled = true
	}

	const media = new Media({
		parent: section || d3.select('.group-container.focus .media-group-items').node() || d3.select('.media-layout.focus').node() || d3.selectAll('.media-layout').last().node(), 
		sibling,
		type, 
		datum: { id, level, type, name, instruction, required, editable },
		focus: focus || false,
		lang
	})

	media.media.attrs({ 
		'data-placeholder': d => vocabulary['request'][type],
		'contenteditable': editing ? true : null 
	})
	// .html(d => d.instruction.replace(/\r?\n/g, '<br/>'))
	.addElems('p', null, d => d.instruction.split('\n').filter(c => c))
	.html(d => d)

	if (focus) media.media.node().focus()
}
function addTxt (kwargs) {
	const { activity } = JSON.parse(d3.select('data[name="page"]').node()?.value)
	const editing = activity === 'edit'

	const { data, lang, section, sibling, focus } = kwargs || {}
	let { id, level, type, name, instruction, constraint, is_excerpt, required, editable } = data || {}
	if (!level) level = 'media'
	if (!type) type = 'txt'
	if (!instruction) instruction = ''
	if (!name) name = null
	if (!is_excerpt) is_excerpt = false
	required = required ?? true
	if ([null, undefined].includes(editable)) editable = editing

	if (level === 'meta' && name) {
		const input = d3.select(`.media-input-group #input-meta-${name}`).node()
		if (input) input.disabled = true
	}

	const media = new Media({
		parent: section || d3.select('.group-container.focus .media-group-items').node() || d3.select('.media-layout.focus').node() || d3.selectAll('.media-layout').last().node(), 
		sibling,
		type, 
		datum: { id, level, type, name, instruction, constraint, is_excerpt, required, editable },
		focus: focus || false,
		lang
	})

	if (media.opts) {
		const opts = media.opts.addElems('div', 'opt-group', [
			[], // THIS IS EMPTY, AND FOR THE PROPER DISPLAY OF THE paragraph-opts
			[
				{ key: 'excerpt', label: 'bookmark', value: is_excerpt },
				{ key: 'constraint', label: 'block', value: constraint }
			]
		]).addElems('button', 'opt', d => d)
		.classed('active', d => {
			if (d.key === 'excerpt') return d.value
			else if (d.key === 'constraint') return constraint ? true : false
		}).attr('type', 'button')
			.each(function (d) { 
				d3.select(this).classed(d.key, true) 
				d3.select(this).classed(d.value, true) 
			})
		.on('click', async function (d) {
			const sel = d3.select(this)
			const datum = media.container.datum()
			
			if (d.key === 'excerpt') {
				if (!sel.classed('active')) {
					d3.selectAll('.txt-container').each(c => { if (c) c.is_excerpt = false })
						.selectAll('.opt.excerpt').classed('active', false)
					datum.is_excerpt = true
				} else {
					datum.is_excerpt = false
				}
				sel.classed('active', datum.is_excerpt)
			} else if (d.key === 'constraint') {
				if (!sel.classed('active')) {
					const message = `${vocabulary['limit input']['characters']} <input type='number' name='length' value=${datum.constraint || 9999} min=1> ${vocabulary['input type']['characters']}`
					const opts = [{ node: 'button', type: 'button', label: vocabulary['limit length'], resolve: _ => d3.select('.modal input[name="length"]').node().value }]
					const new_constraint = await renderPromiseModal({ message, opts })

					datum.constraint = +new_constraint
					sel.addElems('span', 'constraint').html(new_constraint)
				} else {
					datum.constraint = null
					sel.select('span', 'constraint').remove()
				}
				sel.classed('active', datum.constraint ? true : false)
			}

			// toggleClass(this, 'active')
			if (editable) await partialSave('media')
		})
		opts.addElems('i', 'material-icons google-translate-attr')
			.html(d => d.label)
		opts.addElems('span', 'constraint', d => d.key === 'constraint' ? [d] : [])
			.html(d => d.value)
	}

	media.media.attrs({ 
		'data-placeholder': d => vocabulary['request'][type],
		'contenteditable': editing ? true : null 
	})
	// .html(d => d.instruction.replace(/\r?\n/g, '<br/>'))
	.addElems('p', null, d => d.instruction.split('\n').filter(c => c))
	.html(d => d.URLsToLinks())

	if (focus) media.media.node().focus()
}
function addEmbed (kwargs) {
	const { activity } = JSON.parse(d3.select('data[name="page"]').node()?.value)
	const editing = activity === 'edit'

	const { data, lang, section, sibling, focus } = kwargs || {}
	let { id, level, type, name, instruction, required, editable } = data || {}
	if (!level) level = 'media'
	if (!type) type = 'embed'
	if (!name) name = null
	if (!instruction) instruction = ''
	required = required ?? true
	if ([null, undefined].includes(editable)) editable = editing
	
	if (level === 'meta' && name) {
		const input = d3.select(`.media-input-group #input-meta-${name}`).node()
		if (input) input.disabled = true
	}

	const media = new Media({
		parent: section || d3.select('.group-container.focus .media-group-items').node() || d3.select('.media-layout.focus').node() || d3.selectAll('.media-layout').last().node(), 
		sibling,
		type, 
		datum: { id, level, type, name, instruction, required, editable },
		focus: focus || false,
		lang
	})

	media.media.attrs({ 
		'data-placeholder': d => vocabulary['request'][type],
		'contenteditable': editing ? true : null 
	}).classed('padded', true)
	// .html(d => d.instruction.replace(/\r?\n/g, '<br/>'))
	.addElems('p', null, d => d.instruction.split('\n').filter(c => c))
	.html(d => d)

	if (focus) media.media.node().focus()
}
function addChecklist (kwargs) { 
	const { activity } = JSON.parse(d3.select('data[name="page"]').node()?.value)
	const editing = activity === 'edit'

	const { data, lang, section, sibling, focus } = kwargs || {}
	let { id, level, type, name, options, instruction, required, editable } = data || {}
	if (!level) level = 'media'
	if (!type) type = 'checklist'
	if (!name) name = null
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
	if (!instruction) instruction = ''
	required = required ?? true
	if ([null, undefined].includes(editable)) editable = editing && level !== 'meta'

	if (editable && !options.find(d => !d.name)) options.push({ checked: false })
	if (!editable) options = options.filter(d => d.name)

	if (level === 'meta' && name) {
		const input = d3.select(`.media-input-group #input-meta-${name}`).node()
		if (input) input.disabled = true
	}

	const media = new Media({
		parent: section || d3.select('.group-container.focus .media-group-items').node() || d3.select('.media-layout.focus').node() || d3.selectAll('.media-layout').last().node(), 
		sibling,
		type, 
		datum: { id, level, type, name, options, instruction, required, editable },
		focus: focus || false,
		lang
	})
	
	// DETERMINE ID FOR THE INPUT NAME
	let checklist_id = media.id

	// TO DO: CHANGE THIS INSTRUCTION TO MEDIA TEXT
	media.media.addElem('div', 'instruction')
		.attrs({ 
			'data-placeholder': d => vocabulary['request'][type],
			'contenteditable': editing ? true : null 
		}).on('keydown', _ => { if (editing) switchButtons(lang) })
		// .html(d => d.instruction.replace(/\r?\n/g, '<br/>'))
		.addElems('p', null, d => d.instruction.split('\n').filter(c => c))
		.html(d => d)

	const list = media.media.addElem('ol')
	list.call(addItem)	

	if (editable) {
		media.media.addElems('div', 'add-opt')
			.on('click', function () {
				media.container.each(d => {
					d.options = d.options.filter(c => c.name?.length)
					d.options.push({ checked: false })
				})
				list.call(addItem)
			})	
		.addElems('i', 'material-icons google-translate-attr')
			.html('add_circle')
	}

	function addItem (sel, focus) {
		const opts = sel.addElems('li', 'opt', d => d.options)
			.classed('valid', d => d.name?.length)
			.each((d, i) => d.id = i)
		opts.addElems('div', 'hide')
			.addElems('input')
			.attrs({ 
				'type': 'checkbox', 
				'id': d => `check-item-${checklist_id}-${d.id}`, 
				'value': d => d.name,
				'name': `checklist-${checklist_id}`, 
				'checked': d => d.checked || null,
				'disabled': true
			})
		opts.addElems('div', 'checkbox')
			.addElems('label')
			.attr('for', d => `check-item-${checklist_id}-${d.id}`)
		.addElems('i', 'material-icons google-translate-attr')
			.html(d => d.checked ? 'check_box' : 'check_box_outline_blank')
		opts.addElems('div', 'grow')
			.addElems('label', 'list-item')
			.attrs({ 
				'for': d => `check-item-${checklist_id}-${d.id}`,
				'data-placeholder': vocabulary['new checklist item'],
				'contenteditable': editable ? true : null
			})
		.on('keydown', function (d) {
			const evt = d3.event
			if ((evt.code === 'Enter' || evt.keyCode === 13) && !evt.shiftKey) {
				evt.preventDefault()
				this.blur()
				
				media.container.each(c => {
					c.options = c.options.filter(b => b.name?.length)
					c.options.push({ checked: false })
				})
				list.call(addItem, true)
			}
		}).on('blur', function (d) {
			d.name = this.innerText.trim()
			d3.select(this).findAncestor('opt').classed('valid', d => d.name?.length)

			if (editable) switchButtons(lang)
		}).html(d => d.name)

		if (editable) {
			opts.addElems('div', 'rm')
				.addElems('i', 'material-icons google-translate-attr')
				.html('clear')
			.on('click', function (d) {
				media.container.each(c => c.options = c.options.filter(b => b.id !== d.id))
				list.call(addItem)
				
				if (editable) switchButtons(lang)
			})
		}

		const emptyOpts = opts.filter(d => !d.name)
		if (emptyOpts.node() && focus) emptyOpts.filter((d, i) => i === emptyOpts.size() - 1).select('.list-item').node().focus()
	}

	if (focus) media.media.select('.instruction').node().focus()
}
function addRadiolist (kwargs) { 
	const { activity } = JSON.parse(d3.select('data[name="page"]').node()?.value)
	const editing = activity === 'edit'

	const { data, lang, section, sibling, focus } = kwargs || {}
	let { id, level, type, name, options, instruction, required, editable } = data || {}
	if (!level) level = 'media'
	if (!type) type = 'radiolist'
	if (!name) name = null
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
	if (!instruction) instruction = ''
	required = required ?? true
	if ([null, undefined].includes(editable)) editable = editing && level !== 'meta'

	if (editable && !options.find(d => !d.name)) options.push({ checked: false })
	if (!editable) options = options.filter(d => d.name)

	if (level === 'meta' && name) {
		const input = d3.select(`.media-input-group #input-meta-${name}`).node()
		if (input) input.disabled = true
	}

	const media = new Media({
		parent: section || d3.select('.group-container.focus .media-group-items').node() || d3.select('.media-layout.focus').node() || d3.selectAll('.media-layout').last().node(), 
		sibling,
		type, 
		datum: { id, level, type, name, options, instruction, required, editable },
		focus: focus || false,
		lang
	})
	
	// DETERMINE ID FOR THE INPUT NAME
	let radiolist_id = media.id//uuidv4()

	media.media.addElem('div', 'instruction')
		.attrs({ 
			'data-placeholder': d => vocabulary['request'][type],
			'contenteditable': editing ? true : null // NOTE HERE THE editing (INSTEAD OF editable) IS IMPORTANT: WE CAN SET A PREDEFINED INSTRUCTION, BUT THE INTENTION IS TO ALWAYS ALLOW THE EDITOR TO TAILOR WORDING TO THEIR LIKING
		}).on('keydown', _ => { if (editing) switchButtons(lang) })
		// .html(d => d.instruction.replace(/\r?\n/g, '<br/>'))
		.addElems('p', null, d => d.instruction.split('\n').filter(c => c))
		.html(d => d)

	const list = media.media.addElem('ol')
	list.call(addItem)	

	if (editable) {
		media.media.addElems('div', 'add-opt')
			.on('click', function () {
				media.container.each(d => {
					d.options = d.options.filter(c => c.name?.length)
					d.options.push({ checked: false })
				})
				list.call(addItem)
			})
		.addElems('i', 'material-icons google-translate-attr')
			.html('add_circle')
	}

	function addItem (sel) {
		const opts = sel.addElems('li', 'opt', d => d.options)
			.classed('valid', d => d.name?.length)
			.each((d, i) => d.id = i)
		opts.addElems('div', 'hide')
			.addElems('input')
			.attrs({ 
				'type': 'checkbox', 
				'id': d => `radio-item-${radiolist_id}-${d.id}`, 
				'value': d => d.name,
				'name': `radiolist-${radiolist_id}`, 
				'checked': d => d.checked || null,
				'disabled': true
			})
		opts.addElems('div', 'checkbox')
			.addElems('label')
			.attr('for', d => `radio-item-${radiolist_id}-${d.id}`)
		.addElems('i', 'material-icons google-translate-attr')
			.html(d => d.checked ? 'radio_button_checked' : 'radio_button_unchecked')
		opts.addElems('div', 'grow')
			.addElems('label', 'list-item')
			.attrs({ 
				'for': d => `radio-item-${radiolist_id}-${d.id}`,
				'data-placeholder': vocabulary['new checklist item'],
				'contenteditable': editable ? true : null
			})
		.on('keydown', function (d) {
			const evt = d3.event
			d.name = this.innerText.trim()
			if ((evt.code === 'Enter' || evt.keyCode === 13) && !evt.shiftKey) {
				evt.preventDefault()
				this.blur()
				
				media.container.each(d => {
					d.options = d.options.filter(c => c.name?.length)
					d.options.push({ checked: false })
				})
				list.call(addItem)
			}
		}).on('blur', function (d) {
			d.name = this.innerText.trim()
			d3.select(this).findAncestor('opt').classed('valid', d => d.name?.length)

			if (editable) switchButtons(lang)
		}).html(d => d.name)

		if (editable) {
			opts.addElems('div', 'rm')
				.addElems('i', 'material-icons google-translate-attr')
				.html('clear')
			.on('click', function (d) {
				media.container.each(c => c.options = c.options.filter(b => b.id !== d.id))
				list.call(addItem)
				
				if (editable) switchButtons(lang)
			})
		}

		// const emptyOpts = opts.filter(d => !d.name)
		// if (emptyOpts.node() && focus) emptyOpts.filter((d, i) => i === emptyOpts.size() - 1).select('.list-item').node().focus()
	}

	// if (!editable) media.placement?.remove()
	if (focus) media.media.select('.instruction').node().focus()
}
// META ELEMENTS
function addLocations (kwargs) {
	const { activity } = JSON.parse(d3.select('data[name="page"]').node()?.value)
	const editing = activity === 'edit'

	const { data, lang, section, sibling, focus } = kwargs || {}
	let { id, level, type, name, instruction, constraint, required, editable } = data || {}
	if (!level) level = 'meta'
	if (!type) type = 'location'
	if (!name) name = null
	if (!instruction) instruction = ''
	required = required ?? true
	if ([null, undefined].includes(editable)) editable = editing

	const input = d3.select(`.media-input-group #input-meta-${name}`).node()
	if (input) input.disabled = true

	const meta = new Meta({ 
		// parent: d3.select('.meta-layout'), 
		parent: d3.select('.media-layout.focus').node() || d3.selectAll('.media-layout').last().node(), 
		sibling,
		type, 
		datum: { id, level, type, name, instruction, constraint, required, editable },
		focus: focus,
		lang
	})

	if (meta.opts) {
		const opts = meta.opts.addElems('div', 'opt-group', [
			[], // THIS IS EMPTY, AND FOR THE PROPER DISPLAY OF THE paragraph-opts
			[{ key: 'constraint', label: 'block', value: constraint }]
		]).addElems('button', 'opt', d => d)
		.classed('active', d => {
			if (d.key === 'constraint') return constraint ? true : false
		}).attr('type', 'button')
			.each(function (d) { d3.select(this).classed(d.value, true) })
		.on('click', async function (d) {
			const sel = d3.select(this)
			const datum = meta.container.datum()
			
			if (d.key === 'constraint') {
				if (!sel.classed('active')) {
					const message = `${vocabulary['limit input']['locations']} <input type='number' name='length' value=${datum.constraint || 10} min=1> ${vocabulary['input type']['locations']}`
					const opts = [{ node: 'button', type: 'button', label: vocabulary['limit length'], resolve: _ => d3.select('.modal input[name="length"]').node().value }]
					const new_constraint = await renderPromiseModal({ message, opts })

					datum.constraint = +new_constraint
					sel.addElems('span', 'constraint').html(new_constraint)
				} else {
					datum.constraint = null
					sel.select('span', 'constraint').remove()
				}
				toggleClass(this, 'active')
			}

			if (editable) await partialSave('media')
		})
		opts.addElems('i', 'material-icons google-translate-attr')
			.html(d => d.label)
		opts.addElems('span', 'constraint', d => d.key === 'constraint' ? [d] : [])
			.html(d => d.value)
	}

	meta.media.attrs({ 
		'data-placeholder': d => vocabulary['request'][type],
		'contenteditable': editing ? true : null 
	})
	// .html(d => d.instruction.replace(/\r?\n/g, '<br/>'))
	.addElems('p', null, d => d.instruction.split('\n').filter(c => c))
	.html(d => d)

	if (meta.inset) {
		meta.inset.addElems('div', `inset-${type}`)
			.addElems('ul', 'panel')
			.addElems('li', 'instruction', [{ value: vocabulary['location instruction'] }])
			.html(d => `* ${d.value}`) // TO DO: CHECK { value : } DATA STRUCTURE IS NECESSARY IN BACK END FOR SMS DEPLOYMENT
	}

	if (focus) meta.media.node().focus()
}
async function addIndexes (kwargs) {
	const { activity } = JSON.parse(d3.select('data[name="page"]').node()?.value)
	const editing = activity === 'edit'

	const { data, lang, section, sibling, focus } = kwargs || {}
	let { id, level, type, name, instruction, constraint, required, editable } = data || {}
	if (!level) level = 'meta'
	if (!type) type = 'index'
	if (!name) name = null
	if (!instruction) instruction = ''
	required = required ?? true
	if ([null, undefined].includes(editable)) editable = editing

	const input = d3.select(`.media-input-group #input-meta-${name}`).node()
	if (input) input.disabled = true

	const options = await POST('/apis/fetch/tags', { type: name, language })
	options.sort((a, b) => a.key - b.key)

	const taglist = new Taglist({ 
		parent: section || d3.select('.media-layout.focus').node() || d3.selectAll('.media-layout').last().node(), 
		sibling,
		type, 
		datum: { id, level, type, name, instruction, constraint, required, editable },
		focus: focus || false,
		lang,
		list: options
	})

	if (focus) taglist.media.node().focus()
}
async function addTags (kwargs) {
	const { activity } = JSON.parse(d3.select('data[name="page"]').node()?.value)
	const editing = activity === 'edit'

	const { data, lang, section, sibling, focus } = kwargs || {}
	let { id, level, type, name, instruction, constraint, required, editable } = data || {}
	if (!level) level = 'meta'
	if (!type) type = 'tag'
	if (!name) name = null
	if (!instruction) instruction = ''
	required = required ?? true
	if ([null, undefined].includes(editable)) editable = editing

	const input = d3.select(`.media-input-group #input-meta-${name}`).node()
	if (input) input.disabled = true

	const options = await POST('/apis/fetch/tags', { type: name })
	options.sort((a, b) => a.name?.localeCompare(b.name))

	const taglist = new Taglist({ 
		parent: section || d3.select('.media-layout.focus').node() || d3.selectAll('.media-layout').last().node(), 
		sibling,
		type, 
		datum: { id, level, type, name, instruction, constraint, required, editable },
		focus: focus || false,
		lang,
		list: options
	})

	if (focus) taglist.media.node().focus()
}
function addAttachment (kwargs) {
	const { activity } = JSON.parse(d3.select('data[name="page"]').node()?.value)
	const editing = activity === 'edit'

	const { data, lang, section, sibling, focus } = kwargs || {}
	let { id, level, type, name, instruction, constraint, required, editable } = data || {}
	if (!level) level = 'meta'
	if (!type) type = 'attachment'
	if (!name) name = null
	if (!instruction) instruction = ''
	required = required ?? true
	if ([null, undefined].includes(editable)) editable = editing

	const input = d3.select(`.media-input-group #input-meta-${name}`).node()
	if (input) input.disabled = true

	const meta = new Meta({
		parent: section || d3.select('.media-layout.focus').node() || d3.selectAll('.media-layout').last().node(), 
		sibling,
		type, 
		datum: { id, level, type, name, instruction, constraint, required, editable },
		focus: focus || false,
		lang
	})

	meta.media.attrs({ 
		'data-placeholder': d => vocabulary['request'][type],
		'contenteditable': editing ? true : null 
	}).classed('padded', true)
	// .html(d => d.instruction.replace(/\r?\n/g, '<br/>'))
	.addElems('p', null, d => d.instruction.split('\n').filter(c => c))
	.html(d => d)

	if (focus) meta.media.node().focus()
}
// GROUPS
async function addGroup (kwargs) {
	const { activity } = JSON.parse(d3.select('data[name="page"]').node()?.value)
	const editing = activity === 'edit'

	const { data, lang, section, sibling, focus } = kwargs || {}
	let { id, level, type, name, structure, instruction, repeat, editable } = data || {}
	if (!level) level = 'media'
	if (!type) type = 'group'
	if (!name) name = null
	if (!structure) structure = []
	if (!instruction) instruction = ''
	if ([null, undefined].includes(editable)) editable = editing

	const media = new Media({
		parent: section || d3.select('.media-layout.focus').node() || d3.selectAll('.media-layout').last().node(), 
		sibling,
		type, 
		datum: { id, level, type, name, structure, instruction, repeat, editable },
		focus: focus || false,
		lang
	})

	if (media.opts) {
		const opts = media.opts.addElems('div', 'opt-group', [
			[], // THIS IS EMPTY, AND FOR THE PROPER DISPLAY OF THE paragraph-opts
			[{ key: 'repeat', label: 'loop', value: repeat }]
		]).addElems('button', 'opt', d => d)
		.classed('active', d => {
			if (d.key === 'repeat') return repeat ? true : false
		}).attr('type', 'button')
			.each(function (d) { d3.select(this).classed(d.value, true) })
		.on('click', async function (d) {
			const sel = d3.select(this)
			const datum = media.container.datum()
			
			if (d.key === 'repeat') {
				if (!sel.classed('active')) {
					const message = `${vocabulary['limit input']['groups']} <input type='number' name='length' value=${datum.constraint || 5} min=1> ${vocabulary['input type']['groups']}`
					const opts = [{ node: 'button', type: 'button', label: vocabulary['repeat group'], resolve: _ => d3.select('.modal input[name="length"]').node().value }]
					const new_repeat = await renderPromiseModal({ message, opts })

					datum.repeat = +new_repeat
					sel.addElems('span', 'repeat').html(new_repeat)
				} else {
					datum.repeat = null
					sel.select('span', 'repeat').remove()
				}
				toggleClass(this, 'active')
			}

			if (editable) await partialSave('media')
		})
		opts.addElems('i', 'material-icons google-translate-attr')
			.html(d => d.label)
		opts.addElems('span', 'repeat', d => d.key === 'repeat' ? [d] : [])
			.html(d => d.value)
	}

	if (media.input) media.input.remove()
	if (media.response) media.response.remove()

	media.media.attrs({ 
		'data-placeholder': d => vocabulary['request'][type],
		'contenteditable': editing ? true : null 
	})
	// .html(d => d.instruction.replace(/\r?\n/g, '<br/>'))
	.addElems('p', null, d => d.instruction.split('\n').filter(c => c))
	.html(d => d)

	if (focus) media.media.node().focus()

	// items.forEach(async c => await populateSection(c, lang, media.container.node()))
	await addItems(media.container)

	async function addItems (sel) {
		// THE PROMISES DO NOT SEEM TO WORK PROPERLY
		// WITH ASYNC CONTENT GETTING RENDERED OUT OF ORDER
		const { structure } = sel.datum()
		const group = sel.addElems('div', 'media media-group-items')
			.datum(structure)

		for (let s = 0; s < structure.length; s++) {
			await populateSection(structure[s], lang, group.node())
		}
		// await Promise.all(group.datum().map(d => populateSection(d, lang, group.node())))
		// .each(function (c) { 
		// 	console.log(c)
		// 	c.forEach(async b => await populateSection(b, lang, this))
		// })
	}

}

// SAVING BUTTON
function switchButtons (lang = 'en') {
	if (!mediaSize) var mediaSize = getMediaSize()
	window.sessionStorage.setItem('changed-content', true)
	// PROVIDE FEEDBACK: UNSAVED CHANGES
	if (mediaSize === 'xs') {
		d3.select('.meta-status .btn-group .save button')
		.each(function () { this.disabled = false })
			.html(vocabulary['save changes'])
	} else {
		const menu_logo = d3.select('nav#site-title .inner')
		window.sessionStorage.setItem('changed-content', true)
		menu_logo.selectAll('div.create, h1, h2').classed('hide', true)
		menu_logo.selectAll('div.save').classed('hide saved', false)
			.select('button')
		.on('click', async _ => await partialSave())
			.html(vocabulary['save changes'])
	}
}

async function renderTemplate () {
	// POPULATE THE PAGE
	const object = d3.select('data[name="object"]').node()?.value
	const template = JSON.parse(d3.select('data[name="template"]').node()?.value)
	const { activity } = JSON.parse(d3.select('data[name="page"]').node()?.value)
	const editing = activity === 'edit'

	if (template.id) {
		const data = await POST('/load/template', { id: template.id })

		if (data.sections) {
			data.sections.forEach(async d => {
				await addSection({ data: d, lang: language })
			})
		}
		// CLEAR CHANGES
		window.sessionStorage.removeItem('changed-content')
	} else if (template.source) {
		const data = await POST('/load/template', { id: template.source })

		if (data.sections) {
			data.sections.forEach(async d => {
				await addSection({ data: d, lang: language })
			})
		}
		// CLEAR CHANGES
		window.sessionStorage.removeItem('changed-content')
	} else {
		await addSection({ lang: language })
		
		if (template.category === 'review') {
			const radiodata = {
				level: 'meta',
				type: 'radiolist',
				name: 'review_score',
				options: [{ name: vocabulary['accept'], value: 1 }, { name: vocabulary['reject'], value: 0 }],
				instruction: vocabulary['accept or reject pad'],
				required: true,
				editable: false
			}
			addRadiolist({ data: radiodata, lang: language, focus: false })
		} else {
			addTitle({ lang: language })
		}
		// CLEAR CHANGES
		window.sessionStorage.removeItem('changed-content')
	}
}