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
				console.log(item)
				partialSave(item)
			}
		}
	}, 100)
})
// MEDIA PROTOTYPE
const Media = function (kwargs) {
	let { parent, container, type, datum, focus, lang } = kwargs || {}
	parent = d3.select(parent).classed('focus', focus)

	if (container) console.log(container.node())
	// NOTE: CHANGE HERE: .container USED TO BE .media >> NEED TO UPDATE EVERYWHERE
	this.container = (container || parent.insertElem('.repeat-container', 'div', `media-container ${type}-container template`)) // MAYBE ADD ACTIVITY AS CLASS HERE
		.classed('focus', focus)
		.datum(datum)
	.each(d => d.level = 'media')
		.style('text-align', d => d.textalign)
	.on('click.focus', function () { 
		const sel = d3.select(this)
		sel.classed('focus', editing)
		sel.findAncestor('layout').classed('focus', editing)
	}) // TO DO: CHANGE EDITING VAR HERE > PLACE IT IN BACK END, LIKE FOR THE browse VIEW
	if (editing || activity === 'preview') this.input = this.container.addElems('div', 'input-group fixed')
	if (editing) {
		this.opts = this.container.addElems('div', 'opts', d => [d], d => d.type)
		this.opts.addElems('div', 'opt-group', [vocabulary['write instruction'][lang]])
			.addElems('label')
				.html(d => d)
	}
	this.media = this.container.addElems('div', 'media template', d => [d], d => d.type)
		.classed(`media-${type}`, true)
	if (editing || activity === 'preview') {
		this.placement = this.container.addElems('div', 'placement-opts', d => [d], d => d.type)
		this.placement.addElems('div', 'opt', [
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
	}
	// THE FOLLOWING IS DIFFERENT FROM THE Media CONSTRUCTOR IN pads.js
	this.response = this.container.addElems('div', 'response template', [type])
		.html(d => vocabulary[`expect ${d}`][lang])

	if (editing) observer.observe(this.container.node(), obsvars)
}
Media.prototype.rmMedia = function () {
	const datum = this.container.datum()
	const level = datum.level
	const type = datum.type

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
			if (target 
				&& target.classList !== undefined 
				&& !target.classList.contains('title-container') 
				&& !target.classList.contains('lead-container')
			) {
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

const Meta = function (kwargs) {
	const { type, maxheight, focus, lang } = kwargs
	// Meta IS AN INSTANCE OF Media WITH AN INSET
	Media.call(this, kwargs)
	// TWEAK THE Media INSTANCES
	this.container.classed('media-container', false).classed('meta-container', true)
		.each(d => d.level = 'meta')
		.on('click.expand', _ => this.expand({ forceopen: true }))
	this.media.classed(`media media-${type}`, false).classed(`meta meta-${type}`, true)
	if (editing) this.inset = this.container.insertElems('.response', 'div', `inset ${type}-inset-container template`)
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

function autofillTitle () {
	if (!(head.select('.title').node().innerText || head.select('.title').node().innerText.trim().length)) {
		let firstText = main.select('.description-layout .txt-container .media-txt').node()
		if (!firstText.innerText || !firstText.innerText.length) firstText = main.selectAll('.media, .meta').filter(function () { return this.innerText && this.innerText.length }).node()
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
	const { data, lang, focus } = kwargs || {}
	const { title, lead, repeat, instruction } = data || {}

	d3.selectAll('.media-layout').classed('focus', false)

	const section = d3.select('main#template div.inner div.body')
		.insertElem('.media-input-group', 'section', `media-layout layout ${activity}`)
		.classed('repeat', repeat || false)
		.classed('focus', focus || false)
		.datum({ type: 'section', title: title, lead: lead, repeat: repeat })
	.on('click.focus', function () { d3.select(this).classed('focus', editing) })


	// DETERMINE ID TO KNOW WHETHER SECTION CAN BE REMOVED
	let section_id = 0
	d3.selectAll('.media-layout').each(function (d, i) {
		if (this === section.node()) section_id = i
	})
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
			if (editing) partialSave('media')
		}
	}

	const header = section.addElems('div', 'section-header')
		.addElems('label')
		.attrs({ 
			// 'data-placeholder': d => vocabulary[`request ${type}`][lang],
			'data-placeholder': d => 'Section header', // TO DO: TRANSLATION
			'contenteditable': editing ? true : null 
		}).html(d => d.title)
	.on('keydown', function () {
		const evt = d3.event
		if (evt.code === 'Enter' || evt.keyCode === 13) {
			evt.preventDefault()
			this.blur()
		}
	}).on('blur', _ => partialSave('media'))

	const medialead = new Media({
		parent: section.node(), 
		type: 'lead', 
		datum: { type: 'lead', lead: lead },
		lang: lang
	})
	// REMOVE THE PLACEMENT OPTIONS: TITLES CANNOT BE MOVED
	medialead.opts.remove()
	medialead.placement.remove()
	medialead.response.remove()

	medialead.media.attrs({ 
		'data-placeholder': d => 'Lead paragraph', // TO DO: TRANSLATION
		'contenteditable': editing ? true : null 
	}).html(d => d.lead)

	if (repeat) {
		const mediarepeat = new Media({
			parent: section.node(), 
			type: 'repeat', 
			datum: { type: 'repeat', instruction: instruction },
			lang: lang
		})
		// REMOVE THE PLACEMENT OPTIONS: TITLES CANNOT BE MOVED
		mediarepeat.opts.remove()
		mediarepeat.placement.remove()
		mediarepeat.response.remove()

		mediarepeat.media.addElems('button')
		.addElems('div').attrs({ 
			'data-placeholder': d => 'Repeat section', // TO DO: TRANSLATION
			'contenteditable': editing ? true : null 
		}).html(d => d.instruction)
	}

	// if (focus) header.node().focus()
	// if (editing) observer.observe(section.node(), obsvars)

	return section.node()
}

function addTitle (kwargs) {
	const { data, lang, section, focus } = kwargs || {}
	let { type, instruction } = data || {}
	if (!type) type = 'title'
	if (!instruction) instruction = ''

	const media = new Media({
		parent: section || d3.select('.media-layout.focus').node() || d3.selectAll('.media-layout').last().node(), 
		type: type, 
		datum: { type: type, instruction: instruction },
		focus: focus || false,
		lang: lang
	})
	// REMOVE THE PLACEMENT OPTIONS: TITLES CANNOT BE MOVED
	media.container.select('div.placement-opts').remove()

	media.media.attrs({ 
		'data-placeholder': d => vocabulary[`request ${type}`][lang],
		'contenteditable': editing ? true : null 
	}).html(d => d.instruction)

	if (focus) media.media.node().focus()
}
function addImg (kwargs) {
	const { data, lang, section, focus } = kwargs || {}
	let { type, instruction } = data || {}
	if (!type) type = 'img'
	if (!instruction) instruction = ''

	const media = new Media({
		parent: section || d3.select('.media-layout.focus').node() || d3.selectAll('.media-layout').last().node(), 
		type: type, 
		datum: { type: type, instruction: instruction },
		focus: focus || false,
		lang: lang
	})
	
	media.media.attrs({ 
		'data-placeholder': d => vocabulary[`request ${type}`][lang],
		'contenteditable': editing ? true : null 
	}).html(d => d.instruction)

	if (focus) media.media.node().focus()
}
function addTxt (kwargs) {
	const { data, lang, section, focus } = kwargs || {}
	let { type, instruction } = data || {}
	if (!type) type = 'txt'
	if (!instruction) instruction = ''

	const media = new Media({
		parent: section || d3.select('.media-layout.focus').node() || d3.selectAll('.media-layout').last().node(), 
		type: type, 
		datum: { type: type, instruction: instruction },
		focus: focus || false,
		lang: lang
	})

	media.media.attrs({ 
		'data-placeholder': d => vocabulary[`request ${type}`][lang],
		'contenteditable': editing ? true : null 
	}).html(d => d.instruction)

	if (focus) media.media.node().focus()
}
function addEmbed (kwargs) {
	const { data, lang, section, focus } = kwargs || {}
	let { type, instruction } = data || {}
	if (!type) type = 'embed'
	if (!instruction) instruction = ''

	const media = new Media({
		parent: section || d3.select('.media-layout.focus').node() || d3.selectAll('.media-layout').last().node(), 
		type: type, 
		datum: { type: type, instruction: instruction },
		focus: focus || false,
		lang: lang
	})

	media.media.attrs({ 
		'data-placeholder': d => vocabulary[`request ${type}`][lang],
		'contenteditable': editing ? true : null 
	}).classed('padded', true)
	.html(d => d.instruction)

	if (focus) media.media.node().focus()
}
function addChecklist (kwargs) { 
	const { data, lang, section, focus } = kwargs || {}
	let { type, options, instruction } = data || {}
	if (!type) type = 'checklist'
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

	if (editing && !options.find(d => !d.name)) options.push({ checked: false })
	if (!editing) options = options.filter(d => d.name)

	const media = new Media({
		parent: section || d3.select('.media-layout.focus').node() || d3.selectAll('.media-layout').last().node(), 
		type: type, 
		datum: { type: type, options: options, instruction: instruction },
		focus: focus || false,
		lang: lang
	})
	
	// DETERMINE ID FOR THE INPUT NAME
	let checklist_id = 0
	d3.selectAll('.media-container.checklist-container').each(function (d, i) {
		if (this === media.container.node()) checklist_id = i
	})

	media.media.addElem('div', 'instruction')
		.attrs({ 
			'data-placeholder': d => vocabulary[`request ${type}`][lang],
			'contenteditable': editing ? true : null 
		}).html(d => d.instruction)

	const list = media.media.addElem('ol')
	list.call(addItem)	

	if (editing) {
		media.media.addElems('div', 'add-opt')
			.addElems('i', 'material-icons')
			.html('add_circle')
		.on('click', function () {
			media.container.each(d => {
				d.options = d.options.filter(c => c.name && c.name.length)
				d.options.push({ checked: false })
			})
			list.call(addItem)
		})
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
				'disabled': true
			})
		// .on('change', function (d) {
		// 	d.checked = this.checked
		// 	const sel = d3.select(this)
		// 	sel.findAncestor('opt').select('.checkbox label i')
		// 		.html(d => d.checked ? 'check_box' : 'check_box_outline_blank')

		// 	if (editing) switchButtons(lang)
		// })
		opts.addElems('div', 'checkbox')
			.addElems('label')
			.attr('for', d => `check-item-${checklist_id}-${d.id}`)
		.addElems('i', 'material-icons')
			.html(d => d.checked ? 'check_box' : 'check_box_outline_blank')
		opts.addElems('div', 'grow')
			.addElems('label', 'list-item')
			.attrs({ 
				'for': d => `check-item-${checklist_id}-${d.id}`,
				'data-placeholder': vocabulary['new checklist item'][lang],
				'contenteditable': activity !== 'view' ? true : null
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

		if (editing) {
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
	let { type, options, instruction } = data || {}
	if (!type) type = 'radiolist'
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

	if (editing && !options.find(d => !d.name)) options.push({ checked: false })
	if (!editing) options = options.filter(d => d.name)

	const media = new Media({
		parent: section || d3.select('.media-layout.focus').node() || d3.selectAll('.media-layout').last().node(), 
		type: type, 
		datum: { type: type, options: options, instruction: instruction },
		focus: focus || false,
		lang: lang
	})
	
	// DETERMINE ID FOR THE INPUT NAME
	let radiolist_id = 0
	d3.selectAll('.media-container.radiolist-container').each(function (d, i) {
		if (this === media.container.node()) radiolist_id = i
	})

	media.media.addElem('div', 'instruction')
		.attrs({ 
			'data-placeholder': d => vocabulary[`request ${type}`][lang],
			'contenteditable': editing ? true : null 
		}).html(d => d.instruction)

	const list = media.media.addElem('ol')
	list.call(addItem)	

	if (editing) {
		media.media.addElems('div', 'add-opt')
			.addElems('i', 'material-icons')
			.html('add_circle')
		.on('click', function () {
			media.container.each(d => {
				d.options = d.options.filter(c => c.name && c.name.length)
				d.options.push({ checked: false })
			})
			list.call(addItem)
		})
	}

	function addItem (sel) {
		const opts = sel.addElems('li', 'opt', d => d.options)
			.classed('valid', d => d.name && d.name.length)
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
		// .on('change', function (d) {
		// 	d.checked = this.checked
		// 	const sel = d3.select(this)
		// 	sel.findAncestor('opt').select('.checkbox label i')
		// 		.html(d => d.checked ? 'radio_button_checked' : 'radio_button_unchecked')

		// 	if (editing) switchButtons(lang)
		// })
		opts.addElems('div', 'checkbox')
			.addElems('label')
			.attr('for', d => `radio-item-${radiolist_id}-${d.id}`)
		.addElems('i', 'material-icons')
			.html(d => d.checked ? 'radio_button_checked' : 'radio_button_unchecked')
		opts.addElems('div', 'grow')
			.addElems('label', 'list-item')
			.attrs({ 
				'for': d => `radio-item-${radiolist_id}-${d.id}`,
				'data-placeholder': vocabulary['new checklist item'][lang],
				'contenteditable': activity !== 'view' ? true : null
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

		if (editing) {
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
	let { type, instruction } = data || {}
	if (!type) type = 'location'
	if (!instruction) instruction = ''

	// const input = d3.select('.meta-input-group #input-meta-location').node()
	const input = d3.select('.media-input-group #input-meta-location').node()
	if (input) input.disabled = true

	const meta = new Meta({ 
		// parent: d3.select('.meta-layout'), 
		parent: d3.select('.media-layout.focus').node() || d3.selectAll('.media-layout').last().node(), 
		type: type, 
		datum: { type: type, instruction: instruction },
		focus: focus,
		lang: lang
	})

	meta.media.attrs({ 
		'data-placeholder': d => vocabulary[`request ${type}`][lang],
		'contenteditable': editing ? true : null 
	}).html(d => d.instruction)

	if (meta.inset) {
		meta.inset.addElems('div', `inset-${type}`)
			.addElems('ul', 'panel')
			.addElems('li', 'instruction', [{ value: vocabulary['location instruction'][lang] }])
			.html(d => `* ${d.value}`) // TO DO: CHECK { value : } DATA STRUCTURE IS NECESSARY IN BACK END FOR SMS DEPLOYMENT
	}
}
function addSDGs (kwargs) {
	const { data, lang, section, focus } = kwargs || {}
	let { type, instruction } = data || {}
	if (!type) type = 'sdgs'
	if (!instruction) instruction = ''

	// GET(`http://localhost:3000/api/sdgs?lang=${lang}`)
	GET(`https://undphqexoacclabsapp01.azurewebsites.net/api/sdgs?lang=${lang}`)
	.then(sdgs => {
		// const input = d3.select('.meta-input-group #input-meta-sdgs').node()
		const input = d3.select('.media-input-group #input-meta-sdgs').node()
		if (input) input.disabled = true

		const meta = new Meta({ 
			parent: section || d3.select('.media-layout.focus').node() || d3.selectAll('.media-layout').last().node(), 
			type: type, 
			datum: { type: type, sdgs: sdgs, instruction: instruction },
			focus: focus || false,
			lang: lang
		})

		meta.media.attrs({ 
			'data-placeholder': d => vocabulary[`request ${type}`][lang],
			'contenteditable': editing ? true : null 
		}).html(d => d.instruction)

		if (meta.inset) {
			const panel = meta.inset.addElems('div', `inset-${type}`)
				.addElems('ul', 'panel')
			panel.addElems('li', 'instruction', [{ value: vocabulary['sdgs instruction'][lang] }])
				.html(d => `* ${d.value}`) // TO DO: CHECK { value : } DATA STRUCTURE IS NECESSARY IN BACK END
			panel.addElems('li', 'opt', d => d.sdgs)
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
	})
}
function addTags (kwargs) {
	const { data, lang, section, focus } = kwargs || {}
	let { type, themes, instruction } = data || {}
	if (!type) type = 'tags'
	if (!themes) themes = []
	if (!instruction) instruction = ''

	// GET(`http://localhost:3000/api/thematic_areas?lang=${lang}`)
	GET(`https://undphqexoacclabsapp01.azurewebsites.net/api/thematic_areas?lang=${lang}`)
	.then(themes => {
		// const input = d3.select('.meta-input-group #input-meta-tags').node()
		const input = d3.select('.media-input-group #input-meta-tags').node()
		if (input) input.disabled = true

		const meta = new Meta({ 
			parent: section || d3.select('.media-layout.focus').node() || d3.selectAll('.media-layout').last().node(), 
			type: type, 
			datum: { type: type, themes: themes, instruction: instruction },
			focus: focus || false,
			lang: lang
		})

		meta.media.attrs({ 
			'data-placeholder': d => vocabulary[`request ${type}`][lang],
			'contenteditable': editing ? true : null 
		}).html(d => d.instruction)

		if (meta.inset) {
			const panel = meta.inset.addElems('div', `inset-${type}`)
				.addElems('ul', 'panel')
			panel.addElems('li', 'instruction', [{ value: vocabulary['tags instruction'][lang] }])
				.html(d => `* ${d.value}`) // TO DO: CHECK { value : } DATA STRUCTURE IS NECESSARY IN BACK END
			panel.addElems('li', 'opt', d => d.themes)
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
	})
}

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