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
	setTimeout(_ => {
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

				if (editing) {
					if (!publicpage) partialSave('media')
					else updateStatus()
				}
			}
		}
	}, 100)
})
// MEDIA PROTOTYPE
const Media = function (kwargs) {
	let { parent, container, sibling, type, datum, focus, lang } = kwargs || {}
	let { id, level, name } = datum
	if (!id) id = datum.id = uuidv4()
	if (!level) level = 'media'
	parent = d3.select(parent).classed('focus', focus)

	this.type = type
	this.name = name
	this.lang = lang
	this.constraint = datum.constraint

	this.id = id
	this.container = (container || parent.insertElem(function () {
		// return sibling || parent.select('.repeat-container').node()
		if (this.contains(sibling)) return sibling
		else return parent.select('.repeat-container').node()
	}, 'div', `${level}-container ${type}-container`))
		.classed('focus', focus)
	.each(function (d) {
		if (name) d3.select(this).classed(`${name}-container`, true)
	}).datum(datum)
		.style('text-align', d => d.textalign)
	.on('click.focus', function () {
		const sel = d3.select(this)
		sel.classed('focus', editing)
	})

	if (editing) this.opts = this.container.addElems('div', 'opts', d => [d], d => d.type)
	if ((templated || level === 'meta') && datum.instruction) {
		this.instruction = this.container.addElems('div', 'instruction', d => [d], d => d.type)
			.attr('data-placeholder', d => d.instruction) // TO DO: IF TRANSLATION IS AVAILABLE TRANSLATE
			.addElems('p', null, d => d.instruction.split('\n').filter(c => c))
			.html(d => d)
	}
	if (editing || activity === 'preview') this.input = this.container.addElems('div', 'input-group fixed')
	this.media = this.container.addElems('div', level, d => [d], d => d.type)
		.classed(`${level}-${type}`, true)
	.each(function (d) {
		if (name) d3.select(this).classed(`${level}-${name}`, true)
	})
	if ((editing && !templated) || activity === 'preview') {
		this.placement = this.container.addElems('div', 'placement-opts', d => [d], d => d.type)
		// .classed('hide', instruction && activity !== 'preview')
		this.placement.addElems('div', 'opt', [
			{ label: 'north', value: 'move-up', fn: _ => this.move('move-up') },
			{ label: 'close', value: 'delete', fn: _ => this.rmMedia() },
			{ label: 'south', value: 'move-down', fn: _ => this.move('move-down') }
		]).each(function (d) { d3.select(this).classed(d.value, true) })
		.on('click', d => {
			d3.event.stopPropagation()
			d.fn()

			if (editing) {
				if (!publicpage) switchButtons(lang)
				else window.sessionStorage.setItem('changed-content', true)
			}
		}).on('mouseup', _ => d3.event.stopPropagation())
			.addElems('i', 'material-icons google-translate-attr')
			.html(d => d.label)
	}
	// ADD REQUIREMENT
	if (editing) {
		// NOTE REQUIREMENTS CAN ONLY COME FROM A TEMPLATE
		const requirement_id = uuidv4()

		this.required = this.container.addElems('div', 'required', d => !['repeat', 'group', 'lead'].includes(d.type) ? [d] : [], d => d.type)
		// ENABLE CHANGE REQUIREMENTS ONLY IF THE USER IS SUDO
		// THIS IS MAINLY FOR DEBUGGING IF THE REQUIREMENT WAS NOT PROPERLY SET IN THE TEMPLATE
		if (rights > 2) {
			this.required.addElems('input')
				.attrs({ 'id': requirement_id, 'type': 'checkbox', 'checked': d => d.required ? true : null })
				.on('change', function (d) {
					d.required = this.checked
					d3.select(this.parentNode).select('label').classed('active', d.required)

					if (editing) {
						if (!publicpage) partialSave(d.level)
						else updateStatus()
					}
				})
		}
		this.required.addElems('label')
			.attr('for', requirement_id)
			.classed('active', d => d.required)
			.classed('hide', d => !d.required)// && rights < 3)
			.html('*')
	}

	if (editing) observer.observe(this.container.node(), obsvars)
}
Media.prototype.rmMedia = function () {
	const datum = this.container.datum()
	const { level, type, name } = datum

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
	if (name) {
		const input = d3.select(`#input-meta-${name}`).node()
		if (input) input.disabled = false
	}
	if (editing) {
		if (!publicpage) partialSave(level)
		else updateStatus()
	}
}
Media.prototype.move = function (dir) {
	let sourceTop = this.container.node().offsetTop
	let sourceHeight = this.container.node().offsetHeight
	let sourceMargin = parseInt(getComputedStyle(this.container.node()).marginBottom)
	const level = this.container.datum().level

	// .meta-layout IS PROBABLY OBSOLETE
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

					if (editing) {
						if (!publicpage) partialSave(level)
						else updateStatus()
					}
				}, 1000)
				if (openInset.node()) window.setTimeout(_ => openInset.node().style.maxHeight = `${openInset.node().scrollHeight}px`, 1250)

				// TO DO: CONTINUE HERE
				// socket.emit('move-up', { id: this.id })
			// MOVE THIS OUT
				// socket.on('move-up', data => {
				// 	console.log(data)
				// })
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

					if (editing) {
						if (!publicpage) partialSave(level)
						else updateStatus()
					}
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
	const { type, list, imglink, altimglink, datum, opencode, lang } = kwargs || {}
	const { tags, constraint } = datum || {}
	// Taglist IS AN INSTANCE OF Meta
	Meta.call(this, kwargs)
	const meta = this

	const initialvalues = meta.media.attr('data-placeholder', vocabulary['missing tag'][language])
	if (imglink) {
		initialvalues
		.addElems('img', 'tag', c => c.tags)
		.each(function (c) {
			const sel = d3.select(this)
			const img = new Image()
			img.onload = function () {
				sel.attr('src', this.src)
			}
			img.src = imglink(c)
		})
	} else {
		initialvalues
		.addElems('div', 'tag', d => d.tags, d => d.name)
		.addElems('label')
			.html(d => d.name?.capitalize() || '') // KEPT THIS, BUT IT SHOULD NOT HAPPEN
	}
	// POPULATE THE INSET
	if (meta.inset) {
		meta.tags = meta.inset.addElem('div', `inset-${type}`)
			.addElems('div', 'tag', list)
			.classed('selected', d => tags.some(c => c.name?.toString().simplify() === d.name.simplify()))
		meta.tags.addElem('input')
			.attrs({
				'id': d => `${meta.id}-${d.name.simplify()}`,
				'type': 'checkbox',
				'name': type, //.slice(0, -1),
				'value': d => d.name,
				'checked': d => tags.map(c => c.name?.toString().simplify()).includes(d.name.simplify()) || null,
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

				const selectedvalues = meta.container.each(c => c.tags = checked)
					.select(`.meta-${type}`)

				if (imglink) {
					selectedvalues
					.addElems('img', 'tag', c => c.tags)
					.each(function (c) {
						const sel = d3.select(this)
						const img = new Image()
						img.onload = function () {
							sel.attr('src', this.src)
						}
						img.src = imglink(c)
					})
				} else {
					selectedvalues
					.addElems('div', 'tag', c => c.tags, c => c)
					.addElems('label')
						.html(c => c.name.capitalize())
				}

				meta.inset.selectAll(`.inset-${type} .tag`).classed('hide', false)
				meta.inset.select('input[type=text]').node().value = ''

				if (meta.opts) {
					meta.opts.selectAll('.opt-group .opt .constraint').html(d => {
						return d.value - checked.length
					})
				}
				if (editing) {
					if (!publicpage) switchButtons(lang)
					else window.sessionStorage.setItem('changed-content', true)
				}
			}
		})

		const possiblevalues = meta.tags.addElem('label')
			.attrs({ 'for': d => `${meta.id}-${d.name.simplify()}` })

		if (imglink) {
			possiblevalues.addElem('img')
			.each(function (d) {
				const sel = d3.select(this)
				const img = new Image()
				img.onload = function () {
					sel.attr('src', this.src)
				}
				img.src = altimglink(d)
			})
		} else possiblevalues.html(d => d.name.capitalize())

		meta.filter = meta.inset.addElem('div', 'filter-or-add')
		meta.filter.addElem('input')
			.attrs({
				'type': 'text',
				'name': type, //.slice(0, -1),
				'id': `filter-${meta.id}`
			})
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
			.attr('for', `filter-${meta.id}`)
			.html(_ => {
				if (opencode) return vocabulary['search or add'][language]
				else return vocabulary['search'][language]['object']
			})

		meta.filter.addElems('button',  'add')
			.on('click', _ => meta.recode(opencode))
		.addElems('i', 'material-icons google-translate-attr')
			.html('add_circle_outline')
	}

	return meta
}
Taglist.prototype = Object.create(Meta.prototype) // THIS IS IMPORTANT TO HAVE ACCESS TO THE prototype FUNCTIONS move AND rmMedia
Taglist.prototype.constructor = Taglist
Taglist.prototype.recode = async function (opencode = true) {
	const meta = this
	const filter = meta.filter.select(`input#filter-${meta.id}`)
	const val = filter.node().value.trim().toLowerCase()
	const prechecked = meta.inset.selectAll(`.inset-${meta.type} .tag input:checked`).data()

	const existingTags = [] // THIS HELPS FILTER OUT TAGS AS THE USER IS TYPING
	meta.inset.selectAll(`.inset-${meta.type} .tag input`).each(function () {
		existingTags.push(this.value.toLowerCase())
	})

	if (!existingTags.includes(val) && opencode) { // ADD THE NEW TAG
		// SEND THE TAG TO THE DB AND GET BACK THE id, name
		// const save = await POST('/save/tag', { name: val, type: meta.type.slice(0, -1) })
		const save = await POST('/save/tag', { name: val, type: meta.name }) // TO DO: THIS PROBABLY NEEDS TO BE NAME
		if (save.status === 200) {
			const { datum } = save
			const opt = meta.inset.select(`.inset-${meta.type}`)
				.insertElem('input[type=text]', 'div', 'tag')
				.datum(datum)
				.classed('selected', !meta.constraint || prechecked.length < meta.constraint)
			opt.addElem('input')
			.attrs({
				'id': c => `${meta.id}-${c.name.simplify()}`,
				'type': 'checkbox',
				'name': meta.type, //.slice(0, -1),
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

					if (editing) {
						if (!publicpage) {
							switchButtons(meta.lang)
							partialSave('media')
						} else {
							window.sessionStorage.setItem('changed-content', true)
							updateStatus()
						}
					}
				}
			})

			opt.addElem('label')
				.attr('for', d => `${meta.id}-${d.name.simplify()}`)
				.html(d => d.name.capitalize())
		}
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
	if (editing) {
		if (!publicpage) switchButtons(meta.lang)
		else window.sessionStorage.setItem('changed-content', true)
	}

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
	return new Promise(async resolve => {
		if (data.type === 'title' && publicpage) addTitle({ data, lang, section })
		if (data.type === 'img') addImg({ data, lang, section })
		if (data.type === 'mosaic') addMosaic({ data, lang, section })
		if (data.type === 'video') addVideo({ data, lang, section })
		if (data.type === 'drawing') addDrawing({ data, lang, section })
		if (data.type === 'txt') addTxt({ data, lang, section })
		if (data.type === 'embed') addEmbed({ data, lang, section })
		if (data.type === 'checklist') addChecklist({ data, lang, section })
		if (data.type === 'radiolist') addRadiolist({ data, lang, section })
		// META
		if (data.type === 'location') addLocations({ data, lang, section })
		if (data.type === 'index') await addIndexes({ data, lang, section })
		if (data.type === 'tag') addTags({ data, lang, section })
		if (data.type === 'attachment') addAttachment({ data, lang, section })
		// if (!metafields.find(d => d.label === 'skills') && data.type === 'skills') addTags({ data, lang, section }) // THE skills IS LEGACY FOR THE ACTION PLANS PLATFORM
		// GROUP
		if (data.type === 'group') addGroup({ data, lang, section })

		resolve()
	})
}
// THIS CAN PROBABLY BE MOVED TO upload.js
function uploadImg (kwargs) {
	const { form, lang, sibling, container, focus } = kwargs
	fetch(form.action, {
		method: form.method,
		body: new FormData(form)
	}).then(res => res.json())
	.then(json => {
		let notification = null
		const uploaderr = json?.filter(msg => msg.status != 200 && msg.message)
		if(uploaderr.length){
			notification = d3.select('body').addElem('div', 'notification')
			.addElem('div')
			.html(uploaderr[0].message  + '<i class="material-icons google-translate-attr">done</i>')
		}
		else {
			notification = d3.select('body').addElem('div', 'notification')
				.addElem('div')
				.html(vocabulary['image upload success'][language])
		}
		setTimeout(_ => notification.remove(), 4000)

		if (editing) {
			if (!publicpage) switchButtons(lang)
			else window.sessionStorage.setItem('changed-content', true)
		}
		return json
	}).then(data => addImgs({ data, lang, sibling, container, focus }))
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
			addImg({ data: { src: items.select('img').datum() }, lang, container, focus: true })
		}
		else mosaic.classed('x2', items.size() < 3)

		if (editing) {
			if (!publicpage) switchButtons(lang)
			else window.sessionStorage.setItem('changed-content', true)
		}
	}
}
function addImgs (kwargs) {
	const { data, lang, sibling, container, focus } = kwargs
	const fls = data.filter(d => d.status === 200)
	// THE CONFIG WITH DATA HERE IS A BIT ANNOYING, BUT IT IS FOR CASES WITH A TEMPLATE, TO MAKE SURE THE VARS SET (e.g. THE INSTRUCTION) ARE MAINTAINED
	if (fls.length === 1) {
		fls.forEach(f => {
			let datum = {}
			if (container) datum = container.datum()
			if (datum.type !== 'img') datum = { instruction: datum.instruction }
			datum['src'] = f.src
			addImg({ data: datum, lang, sibling, container, focus })
		}) // ONLY ONE IMAGE SO NO MOSAIC
	} else {
		let datum = {}
		if (container) datum = container.datum()
		if (datum.type !== 'mosaic') datum = { instruction: datum.instruction }
		datum['srcs'] = fls.map(f => f.src)
		addMosaic({ data: datum, lang, sibling, container, focus })
	}
}
function uploadVideo (kwargs) {
	const { form, lang, sibling, container, focus } = kwargs
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
		let notification = null
		const uploaderr = json?.filter(msg => msg.status != 200 && msg.message)
		if(uploaderr.length){
			notification = d3.select('body').addElem('div', 'notification')
			.addElem('div')
			.html(uploaderr[0].message  + '<i class="material-icons google-translate-attr">done</i>')
		}
		else {
			notification = d3.select('body').addElem('div', 'notification')
			.addElem('div')
			.html(`${vocabulary['successful upload mediatype'][language]["video"]}<i class="material-icons google-translate-attr">done</i>`)
		}
		setTimeout(_ => notification.remove(), 4000)
		if (editing) {
			if (!publicpage) switchButtons(lang)
			else window.sessionStorage.setItem('changed-content', true)
		}
		return json
	}).then(videos => {
		const fls = videos.filter(d => d.status === 200)
		// SAME AS FOR IMAGES: THE CONFIG WITH DATA HERE IS A BIT ANNOYING, BUT IT IS FOR CASES WITH A TEMPLATE, TO MAKE SURE THE VARS SET (e.g. THE INSTRUCTION) ARE MAINTAINED
		if (fls.length === 1) {
			fls.forEach(f => {
				let data = {}
				if (container) data = container.datum()
				data['src'] = f.src
				fls.forEach(f => addVideo({ data, lang, sibling, container, focus }))
			})
		}
	})
	.catch(err => { if (err) throw err })
}
function autofillTitle () {
	if (head.select('.title').node()?.innerText.trim().length === 0) {
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
			if (editing) {
				if (!publicpage) partialSave('title')
				else updateStatus()
			}
		})
	}
}

function addSection (kwargs) {
	return new Promise(async resolve => {
		const { data, lang, sibling, repeated, focus } = kwargs || {}
		let { id, title, lead, structure, items, repeat, group, instruction } = data || {}
		if (!title) title = ''
		if (!lead) lead = ''
		if (!structure) structure = []
		if (!items) items = []

		if (editing && templated && (!items.length || repeated)) items = JSON.parse(JSON.stringify(structure))

		d3.selectAll('.media-layout').classed('focus', false)

		const section = d3.select('main#pad div.inner div.body')
			// .insertElem(function () { return sibling || d3.select('main#pad div.inner div.body .media-input-group').node() }, 'section', `media-layout layout ${activity}`)
			.insertElem(function () { return sibling }, 'section', `media-layout layout ${activity}`)
			.classed('repeat', repeat || false)
			.classed('focus', focus && !templated)
			.datum({ id, type: 'section', title, lead, structure, items, repeat, group })
		// .on('click.focus', function () { d3.select(this).classed('focus', editing && !templated) })
		.on('click.focus', function () { d3.select(this).classed('focus', editing) })

		// DETERMINE ID TO KNOW WHETHER SECTION CAN BE REMOVED
		const section_id = [].indexOf.call(d3.selectAll('section.media-layout').nodes(), section.node())

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

				if (editing) {
					if (!publicpage) switchButtons(lang)
					else window.sessionStorage.setItem('changed-content', true)
				}
			}).on('mouseup', _ => d3.event.stopPropagation())
				.addElems('i', 'material-icons google-translate-attr')
				.html(d => d.label)

			function rmSection () {
				// FOR META INPUT
				section.selectAll('.media-container, .meta-container').data()
				.forEach(d => {
					if (d.name) {
						const input = d3.select(`#input-meta-${d.name}`).node()
						if (input) input.disabled = false
					}
				})

				section.remove()
				// MAKE SURE THE OPTION TO REPEAT IS DISPLAYED
				const section_group = d3.selectAll('.layout.repeat').filter(d => d.group === group)
				section_group.filter((d, i) => i === section_group.size() - 1)
					.select('.repeat-container').classed('hide', false)

				if (editing) {
					if (!publicpage) partialSave('media')
					else updateStatus()
				}
			}
		}

		const header = section.addElems('div', 'section-header', d => {
			if (templated && d.title?.length === 0) return []
			else if (!editing && d.title?.length === 0) return []
			else return [d]
		}).addElems('h1')
			.attrs({
				'data-placeholder': d => vocabulary['section header'][language],
				'contenteditable': editing && !templated ? true : null
			}).html(d => d.title)
		.on('keydown', function () {
			const evt = d3.event
			if (evt.code === 'Enter' || evt.keyCode === 13) {
				evt.preventDefault()
				this.blur()
			}
		}).on('blur', _ => {
			if (editing) {
				if (!publicpage) partialSave('media')
				else updateStatus()
			}
		})

		if (templated && lead) {
			const medialead = new Media({
				parent: section.node(),
				type: 'lead',
				datum: { type: 'lead', level: 'media', lead: lead },
				lang: lang
			})
			// REMOVE THE PLACEMENT OPTIONS: TITLES CANNOT BE MOVED
			if (medialead.opts) medialead.opts.remove()

			medialead.media.attrs({
				'data-placeholder': d => vocabulary['lead paragraph'][language],
				'contenteditable': editing && !templated ? true : null
			}).html(d => d.lead)
		}
		if (editing && templated && repeat) {
			// HIDE THE PREVIOUS REPEAT BUTTONS FOR THE GROUP
			d3.selectAll('.layout.repeat').filter(d => d.group === group)
				.select('.repeat-container').classed('hide', true)

			const mediarepeat = new Media({
				parent: section.node(),
				type: 'repeat',
				datum: { type: 'repeat', level: 'media', instruction: instruction },
				lang: lang
			})
			// REMOVE THE PLACEMENT OPTIONS: TITLES CANNOT BE MOVED
			if (mediarepeat.opts) mediarepeat.opts.remove()
			if (mediarepeat.instruction) mediarepeat.instruction.remove()

			mediarepeat.media.addElems('button')
			.on('click', async function () {
				const sel = d3.select(this)

				kwargs.sibling = section.node().nextSibling
				kwargs.repeated = true
				kwargs.focus = true

				const new_section = await addSection(kwargs)
				d3.select(new_section).classed('animate-in', true)

				if (editing) {
					if (!publicpage) partialSave('media')
					else updateStatus()
				}

			}).addElems('div').attrs({
				'data-placeholder': d => vocabulary['repeat section'][language]
			}).html(d => d.instruction)
		}

		if (items.length) {
			const promises = []
			section.each(function (d) {
				promises.push(d.items.map(async c => await populateSection (c, lang, this)))
			})
			await Promise.all(promises.flat())
		}

		resolve(section.node())
	})
}

function addTitle (kwargs) {
	const { data, lang, section, sibling, focus } = kwargs || {}
	let { id, level, type, name, txt, instruction, constraint, required } = data || {}
	if (!level) level = 'media'
	if (!type) type = 'title'
	if (!name) name = null
	if (!txt) txt = ''
	required = true

	if (!editing && txt?.toString().trim().length === 0) return null

	const media = new Media({
		parent: section || d3.select('.group-container.focus').node() || d3.select('.media-layout.focus').node() || d3.selectAll('.media-layout').last().node(),
		sibling,
		type,
		datum: { id, level, type, name, txt, instruction, constraint, required },
		focus: focus || false,
		lang
	})
	// REMOVE THE PLACEMENT OPTIONS: TITLES CANNOT BE MOVED
	// (PRESUMABLY THIS IS NOT NEEDED BECAUSE addTitle IS ONLY USED IN THE SPECIFIC CASE OF A TEMPLATED PAD THAT IS DEPLOYED IN A PUBLIC MOBILIZATION)
	if (media.placement) media.placement.remove()
	if (media.input) media.input.remove()

	media.media.attrs({
		'data-placeholder': vocabulary['untitled pad'][language],
		'contenteditable': editing ? true : null
	}).html(d => d.txt)
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
function addImg (kwargs) {
	const { data, lang, section, sibling, container, focus } = kwargs || {}
	let { id, level, type, name, src, textalign, scale, instruction, required } = data || {}
	if (!level) level = 'media'
	if (!type) type = 'img'
	if (!name) name = null
	if (!src) src = null
	if (!textalign) textalign = 'left'
	if (!scale) scale = 'original'
	required = required ?? false

	if (!editing && src?.length === 0) return null

	if (level === 'meta' && name) {
		const input = d3.select(`.media-input-group #input-meta-${name}`).node()
		if (input) input.disabled = true
	}

	const media = new Media({
		parent: section || d3.select('.group-container.focus').node() || d3.select('.media-layout.focus').node() || d3.selectAll('.media-layout').last().node(),
		sibling,
		container,
		type,
		datum: { id, level, type, name, textalign, scale, src, instruction, required },
		focus: focus || false,
		lang
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

			if (editing) {
				if (!publicpage) switchButtons(lang)
				else window.sessionStorage.setItem('changed-content', true)
			}
		}).addElems('i', 'material-icons google-translate-attr')
			.html(d => d.label)
	}

	media.media.attr('data-placeholder', d => vocabulary['missing image'][language])

	if (src) {
		const img = new Image()
		img.onload = function () {
			media.media.addElems('img')
			.attrs({
				'class': d => d.scale,
				'src': d => this.src
			}).on('click', d => renderImgZoom({ src: this.src }))
		}
		img.onerror = function (err) {
			if (err) console.log(err)
		}

		if (src.isURL() || src.isBlob()) img.src = src
		else {
			if (d3.select('data[name="app_storage"]').node()) {
				const app_storage = d3.select('data[name="app_storage"]').node().value
				img.src = new URL(`${app_storage}/${src}`).href
			} else {
				img.src = `/${src}`
			}
		}
	}

	// WE NEED THE ICON IF
	// THE PAD IS BASED ON A TEMPLATE: templated
	// THE PAD IS IN create, preview MODE
	// THERE IS NO IMAGE YET
	if (templated && (activity !== 'view' || (activity === 'preview' && !src))) {
		let form_id = media.id//uuidv4()

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
				uploadImg({ form: this.form, lang, container: media.container, focus: true })
				form.select('label').classed('highlight', this.value?.length)
			})
			form.addElems('label')
				.classed('highlight', src ? true : false)
				.attr('for', `input-media-img-${form_id}`)
			.on('mousedown', function () {
				d3.select(this).classed('highlight', activity !== 'preview')
			}).on('mouseup', function () {
				d3.select(this).classed('highlight', false)
			}).addElems('i', 'material-icons google-translate-attr')
				.html('add_photo_alternate')
		}
	}
}
function addMosaic (kwargs) {
	const { data, lang, section, sibling, container, focus } = kwargs || {}
	let { id, level, type, name, srcs, verticalalign, instruction, required } = data || {}
	if (!level) level = 'media'
	if (!type) type = 'mosaic'
	if (!name) name = null
	if (!srcs) srcs = []
	if (!verticalalign) verticalalign = 'center'
	required = required ?? false

	if (!editing && srcs?.length === 0) return null

	if (level === 'meta' && name) {
		const input = d3.select(`.media-input-group #input-meta-${name}`).node()
		if (input) input.disabled = true
	}

	const media = new Media({
		parent: section || d3.select('.group-container.focus').node() || d3.select('.media-layout.focus').node() || d3.selectAll('.media-layout').last().node(),
		sibling,
		container,
		type,
		datum: { id, level, type, name, verticalalign, srcs, instruction, required },
		focus: focus || false,
		lang
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

			if (editing) {
				if (!publicpage) switchButtons(lang)
				else window.sessionStorage.setItem('changed-content', true)
			}
		}).addElems('i', 'material-icons google-translate-attr')
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

					if (editing) {
						if (!publicpage) switchButtons(lang)
						else window.sessionStorage.setItem('changed-content', true)
					}
				}).addElems('i', 'material-icons google-translate-attr')
					.html(d => d.label)
			}
		}
		img.onerror = function (err) {
			// if (img.src !== d) img.src = d
			// else console.log(err)
			if (err) console.log(err)
		}

		if (d.isURL() || d.isBlob()) img.src = d
		// else img.src = `/${d}`
		else {
			if (d3.select('data[name="app_storage"]').node()) {
				const app_storage = d3.select('data[name="app_storage"]').node().value
				img.src = new URL(`${app_storage}/${d}`).href
			} else {
				img.src = `/${d}`
			}
		}
	})

	// WE NEED THE ICON IF
	// THE PAD IS BASED ON A TEMPLATE: templated
	// THE PAD IS IN create, preview MODE
	// THERE IS NO IMAGE YET
	if (templated && (activity !== 'view' || (activity === 'preview' && !src))) {
		let form_id = media.id//uuidv4()

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
				uploadImg({ form: this.form, lang, container: media.container, focus: true })
				form.select('label').classed('highlight', this.value?.length)
			})
			form.addElems('label')
				.classed('highlight', srcs?.length ? true : false)
				.attr('for', `input-media-img-${form_id}`)
			.on('mousedown', function () {
				d3.select(this).classed('highlight', activity !== 'preview')
			}).on('mouseup', function () {
				d3.select(this).classed('highlight', false)
			}).addElems('i', 'material-icons google-translate-attr')
				.html('add_photo_alternate')
		}
	}
}
function addVideo (kwargs) {
	const { data, lang, section, sibling, container, focus } = kwargs || {}
	let { id, level, type, name, src, textalign, instruction, required } = data || {}
	if (!level) level = 'media'
	if (!type) type = 'video'
	if (!name) name = null
	if (!src) src = null
	if (!textalign) textalign = 'left'
	required = required ?? false

	if (!editing && src?.length === 0) return null

	if (level === 'meta' && name) {
		const input = d3.select(`.media-input-group #input-meta-${name}`).node()
		if (input) input.disabled = true
	}

	const media = new Media({
		parent: section || d3.select('.group-container.focus').node() || d3.select('.media-layout.focus').node() || d3.selectAll('.media-layout').last().node(),
		sibling,
		container,
		type,
		datum: { id, level, type, name, textalign, src, instruction, required },
		focus: focus || false,
		lang
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

			if (editing) {
				if (!publicpage) switchButtons(lang)
				else window.sessionStorage.setItem('changed-content', true)
			}
		}).addElems('i', 'material-icons google-translate-attr')
			.html(d => d.label)
	}

	media.media.attr('data-placeholder', d => d.instruction)

	if (src) {
		media.media.addElems('video')
			.attrs({ 'src': d => `/${src}`, 'controls': true })
			.node().load()
	}

	if (templated && (activity !== 'view' || (activity === 'preview' && !src))) {
		let form_id = media.id//uuidv4()

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
				uploadVideo({ form: this.form, lang, container: media.container })
				form.select('label').classed('highlight', this.value?.length)
			})
			form.addElems('label')
				.classed('highlight', src ? true : false)
				.attrs({ 'for': `input-media-video-${form_id}`, 'title': 'Add a video.' })
			.on('mousedown', function () {
				d3.select(this).classed('highlight', activity !== 'preview')
			}).on('mouseup', function () {
				d3.select(this).classed('highlight', false)
			}).addElems('i', 'material-icons google-translate-attr')
				.html('ondemand_video')
		}
	}
}
function addDrawing (kwargs) {
	const { data, lang, section, sibling, focus } = kwargs || {}
	let { id, level, type, name, shapes, size, instruction, required } = data || {}
	if (!level) level = 'media'
	if (!type) type = 'drawing'
	if (!name) name = null
	if (!shapes) shapes = []
	shapes = shapes.filter(d => d.points.length)
	if (!size) size = []
	required = required ?? false

	if (!editing && shapes?.length === 0) return null

	if (level === 'meta' && name) {
		const input = d3.select(`.media-input-group #input-meta-${name}`).node()
		if (input) input.disabled = true
	}

	const media = new Media({
		parent: section || d3.select('.group-container.focus').node() || d3.select('.media-layout.focus').node() || d3.selectAll('.media-layout').last().node(),
		sibling,
		type,
		datum: { id, level, type, name, shapes, size, instruction, required },
		focus: focus || false,
		lang
	})

	if (media.opts) {
		const opt_groups = media.opts.addElems('div', 'opt-group', _ => {
			const brush_size = [ { element: 'input', type: 'range', key: 'brush-size', min: 1, max: 10, value: 2 } ]
			const colors = ['#000000','#646464','#969696','#0A4C73','#0468B1','#32BEE1','#A51E41','#FA1C26','#F03C8C','#418246','#61B233','#B4DC28','#FA7814','#FFC10E','#FFF32A']
				.map(d => { return { element: 'button', type: 'button', key: 'color', label: d, value: d } })
			const clear = [ { element: 'button', type: 'button', key: 'clear', label: 'close', value: null } ]
			// if (constraint) para_styles.push({ element: 'button', type: 'button', key: 'constraint', label: 'block', value: constraint })
			return [brush_size, colors, clear]
		}).each(function (d) {
			const group = d3.select(this)

			d.forEach(c => {
				const opt = group.addElem(c.element, 'opt')
					.datum(c)
					.classed('active', (b, i) => {
						if (b.key === 'color') return b.value === '#000000'
						else return false
					}).attrs({
						'type': b => b.type,
						'min': b => b.type === 'range' ? b.min : null,
						'max': b => b.type === 'range' ? b.max : null,
						'value': b => b.value
					}).style('background-color', b => b.key === 'color' ? b.value : null)
				opt.each(function (b) { d3.select(this).classed(b.key, true) })
				.on('click', function (b) {
					const sel = d3.select(this)
					if (b.element === 'button') {
						if (b.key === 'clear') {
							const canvas = media.media.select('canvas')
							const ctx = canvas.node().getContext('2d')
							ctx.clearRect(0, 0, canvas.node().width, canvas.node().height)
							media.media.datum().shapes = []
						} else if (b.key === 'color') {
							group.selectAll('.opt').classed('active', false)
							sel.classed('active', true)
						}
					} else return false

					if (editing) {
						if (!publicpage) switchButtons(lang)
						else window.sessionStorage.setItem('changed-content', true)
					}
				}).on('input', function (b) {
					if (c.key === 'brush-size') {
						group.select('label span').html(`${this.value}px`)
					}
				})
				if (c.key === 'brush-size') {
					group.addElem('label', c.key).html('Brush size: ')
					.addElems('span', 'size').html(`${opt.node().value}px`)
				}
				opt.addElems('i', 'material-icons google-translate-attr', b => b.element === 'button' && b.key !== 'color' ? [b] : []).html(b => b.label)
				// opt.addElems('span', 'constraint', b => b.key === 'constraint' ? [b] : [])
					// .html(b => b.value - txt.length)
			})
		})
	}

	const canvas = media.media.addElems('canvas')
		.attrs({
			'width': d => d.size[0] = d.size [0] ?? (media.container.node().clientWidth || media.container.node().offsetWidth) - 2, // THE -2 IS FOR THE BORDER
			'height': d => d.size[1] = d.size[1] ?? ((media.container.node().clientWidth || media.container.node().offsetWidth) / 2) - 2
		})

	canvas.node()['__drawing__'] = false
	const ctx = canvas.node().getContext('2d')

	function onCanvas () { return this.target === canvas.node() }

	function draw () {
		let isDrawing = canvas.node()['__drawing__']
		if (isDrawing) render()
		window.requestAnimationFrame(draw)
	}
	function render () {
		ctx.clearRect(0, 0, canvas.node().width, canvas.node().height)

		if (canvas.datum().shapes.length) {
			canvas.datum().shapes.forEach(d => {
				ctx.save()
				if (d.type === 'line') {
					ctx.lineWidth = d.lineWidth
					ctx.strokeStyle = d.color
					ctx.lineCap = 'round'
					ctx.lineJoin = 'round'

					ctx.beginPath()
					d.points.forEach((p, i) => {
						if (i === 0) ctx.moveTo(p[0], p[1])
						else ctx.lineTo(p[0], p[1])
					})
					ctx.stroke()
				}
				ctx.restore()
			})
		} else {
			ctx.save()
			ctx.translate(canvas.node().width / 2, canvas.node().height / 2)
			ctx.textAlign = 'center'
			ctx.font = '18px Noto Sans, Helvetica, Arial, sans-serif'
			ctx.fillStyle = '#969696'
			ctx.fillText('Draw here', 0, 0)
			ctx.restore()
		}
	}

	if (editing) {
		['mousedown', 'ontouchstart'].forEach(evt_handler => {
			window.addEventListener(evt_handler, evt => {
				canvas.node()['__drawing__'] = onCanvas.call(evt)
				if (canvas.node()['__drawing__']) {
					canvas.datum().shapes.push({
						type: 'line',
						points: [],
						lineWidth: media.opts.select('input.brush-size').node().value,
						color: media.opts.select('button.color.active').node().value
					})
				}
			})
		});
		['mousemove', 'ontouchmove'].forEach(evt_handler => {
			canvas.node().addEventListener(evt_handler, function (evt) {
				const currentShape = this['__data__'].shapes.last()
				if (this['__drawing__']) currentShape.points.push([evt.offsetX, evt.offsetY])
			})
		});
		['mouseup', 'ontouchend'].forEach(evt_handler => {
			window.addEventListener(evt_handler, evt => {
				if (canvas.node()['__drawing__']) {
					canvas.node()['__drawing__'] = false

					if (editing) {
						if (!publicpage) {
							switchButtons(lang)
							partialSave('media')
						} else {
							window.sessionStorage.setItem('changed-content', true)
							updateStatus()
						}
					}
				}
			})
		});
	}

	window.requestAnimationFrame(draw)
	render()

	if (focus) media.media.node().focus()
}
function addTxt (kwargs) {
	const { data, lang, section, sibling, focus } = kwargs || {}
	let { id, level, type, name, fontsize, fontweight, fontstyle, textalign, txt, instruction, constraint, is_excerpt, required } = data || {}
	if (!level) level = 'media'
	if (!type) type = 'txt'
	if (!name) name = null
	if (!fontsize) fontsize = 1
	if (!fontweight) fontweight = 'normal'
	if (!fontstyle) fontstyle = 'normal'
	if (!textalign) textalign = 'left'
	if (!txt) txt = ''
	if (!is_excerpt) is_excerpt = false
	required = required ?? false

	if (!editing && activity !== 'preview' && txt?.toString().trim().length === 0) return null

	if (level === 'meta' && name) {
		const input = d3.select(`.media-input-group #input-meta-${name}`).node()
		if (input) input.disabled = true
	}

	const media = new Media({
		parent: section || d3.select('.group-container.focus').node() || d3.select('.media-layout.focus').node() || d3.selectAll('.media-layout').last().node(),
		sibling,
		type,
		datum: { id, level, type, name, fontsize, fontweight, fontstyle, textalign, txt, instruction, constraint, is_excerpt, required },
		focus: focus || false,
		lang
	})

	if (media.opts) {
		const opts = media.opts.addElems('div', 'opt-group', _ => {
			const font_styles = [
				{ key: 'font-properties', label: 'add', value: 'scale-up' },
				{ key: 'font-properties', label: 'remove', value: 'scale-down' },
				{ key: 'font-properties', label: 'format_bold', value: 'bold' },
				{ key: 'font-properties', label: 'format_italic', value: 'italic' }
			]
			const para_styles = [
				{ key: 'h-align', label: 'format_align_left', value: 'left' },
				{ key: 'h-align', label: 'format_align_center', value: 'center' },
				{ key: 'h-align', label: 'format_align_right', value: 'right' },
			]
			if (!locked_excerpt || is_excerpt) para_styles.push({ key: 'excerpt', label: 'bookmark', value: is_excerpt })
			if (constraint) para_styles.push({ key: 'constraint', label: 'block', value: constraint })
			return [font_styles, para_styles]
		}).addElems('button', 'opt', d => d)
			.classed('active', d => {
				if (d.key === 'font-properties') {
					if (d.value.includes('scale')) return true
					if (fontweight && d.value === fontweight) return true
					if (fontstyle && d.value === fontstyle) return true
				} else if (d.key === 'h-align') return textalign ? d.value === textalign : d.value === 'left'
				else if (d.key === 'excerpt') return d.value
				else if (d.key === 'constraint') return constraint ? true : false
			}).attr('type', 'button')
		.each(function (d) {
			d3.select(this).classed(d.key, true)
			d3.select(this).classed(d.value, true)
		}).on('click', function (d) {
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
				sel.findAncestor('opt-group').selectAll('.opt')
					.classed('active', function () { return this == sel.node() })
				media.media.style('text-align', c => c.textalign = d.value).node().focus()
			} else if (d.key === 'excerpt' && !locked_excerpt) {
				// NEED TO DETERMINE WHETHER THE template HAS A SET EXCERPT
				const datum = media.container.datum()
				if (!sel.classed('active')) {
					d3.selectAll('.txt-container').each(c => { if (c) c.is_excerpt = false })
						.selectAll('.opt.excerpt').classed('active', false)
					datum.is_excerpt = true
				} else {
					datum.is_excerpt = false
				}
				sel.classed('active', datum.is_excerpt)
			}

			if (editing && d.key !== 'constraint') {
				if (!publicpage) switchButtons(lang)
				else window.sessionStorage.setItem('changed-content', true)
			}
		})
		opts.addElems('i', 'material-icons google-translate-attr')
			.html(d => d.label)
		opts.addElems('span', 'constraint', d => d.key === 'constraint' ? [d] : [])
			.html(d => d.value - txt.length)
	}

	media.media.attrs({
		'data-placeholder': vocabulary['empty txt'][language],
		'contenteditable': editing ? true : null
	}).styles({
		'min-height': d => `${d.fontsize}rem`,
		'font-size': d => `${d.fontsize}rem`,
		'line-height': d => `${d.fontsize * 1.35}rem`,
		'font-weight': d => d.fontweight,
		'font-style': d => d.fontstyle,
		'text-align': d => d.textalign
	}).on('keydown', function (d) {
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
	}).addElems('p', null, d => d.txt?.toString().split('\n').filter(c => c))
	.html(d => {
		// return d.txt.replace(/\r?\n/g, '<br/>')
		return d.URLsToLinks()
	})

	if (focus) media.media.node().focus()
}
function addEmbed (kwargs) {
	const { data, lang, section, sibling, focus } = kwargs || {}
	let { id, level, type, name, textalign, html, src, instruction, required } = data || {}
	if (!level) level = 'media'
	if (!type) type = 'embed'
	if (!name) name = null
	if (!textalign) textalign = 'left'
	if (!html) html = ''
	if (!src) src = null
	required = required ?? false

	if (!editing && activity !== 'preview' && (html?.trim().length === 0 || src?.length === 0)) return null

	if (level === 'meta' && name) {
		const input = d3.select(`.media-input-group #input-meta-${name}`).node()
		if (input) input.disabled = true
	}

	const media = new Media({
		parent: section || d3.select('.group-container.focus').node() || d3.select('.media-layout.focus').node() || d3.selectAll('.media-layout').last().node(),
		sibling,
		type,
		datum: { id, level, type, name, src, textalign, html, instruction, required },
		focus: focus || false,
		lang
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
			if (editing) {
				if (!publicpage) switchButtons(lang)
				else window.sessionStorage.setItem('changed-content', true)
			}
		}).addElems('i', 'material-icons google-translate-attr')
			.html(d => d.label)
	}

	media.media.attrs({
		'data-placeholder': vocabulary['empty embed'][language],
		'contenteditable': editing
	}).classed('padded', true)
	.style('text-align', d => d.textalign)
		.each(function (d) {
			const sel = d3.select(this)
			if (this.innerText.trim().isURL() || d.src) {
				renderIframe.call(this, d)
			} else {
				sel.style('text-align', d.textalign)
					.html(this.innerText)
			}
			sel.classed('padded', !this.children.length)
		})
		// .html(d => {
		// 	if (!editing && d.html.trim().isURL()) return `<a href=${d.html.trim()} target='_blank'>${d.html}</a>`
		// 	else return d.html
		// })
	.on('focus', function (d) {
		setTimeout(_ => {
			d3.select(this).classed('padded', true).style('text-align', 'left')
				.html(d.html.innerText || d.src || this.innerHTML)
		}, 250)
	}).on('blur', async function (d) {
		const sel = d3.select(this)

		if (this.innerText.trim().isURL() || d.src) {
			renderIframe.call(this, d)
		} else {
			sel.style('text-align', d.textalign)
				.html(this.innerText)
		}
		sel.classed('padded', !this.children.length)

		if (editing) {
			if (!publicpage) switchButtons(lang)
			else window.sessionStorage.setItem('changed-content', true)
		}
	})
	// media.addElems('img', 'cover', d => d.src ? [d] : [])
	//	.attr('src', d => d.src)

	async function renderIframe (d) {
		const sel = d3.select(this)
		const url = this.innerText.trim() || d.src
		const isYoutube = url.match(/^(((http|https):\/\/)|(www\.))(?=.*youtube)/gi)
		const isMSStream = url.match(/^(((http|https):\/\/))(?=.*microsoftstream)/gi)

		if (isYoutube) {
			d.src = url.replace('watch?v=', 'embed/')
			this.innerText = null
			sel.addElems('iframe')
				.attrs({
					'width': 560, 'height': 315, 'src': d.src, 'frameborder': 0,
					'allow': 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture'
				}).each(function () { this.allowfullscreen })
		} else if (isMSStream) {
			d.src = url.replace(/\?(.*)/gi, '?autoplay=false&amp;showinfo=true')
			this.innerText = null
			sel.addElems('iframe')
				.attrs({ 'width': 560, 'height': 315, 'src': d.src })
				.style('border', 'none')
			.each(function () { this.allowfullscreen })
		} else {
			if (false) { // TO DO: FINSIH THIS
				const screenshot = await POST('/screenshot', { src: this.innerText.trim() })
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

					if (d.src.isURL() || d.src.isBlob()) img.src = d.src
					// else img.src = `/${d.src}`
					else {
						if (d3.select('data[name="app_storage"]').node()) {
							const app_storage = d3.select('data[name="app_storage"]').node().value
							img.src = new URL(`${app_storage}/${d.src}`).href
						} else {
							img.src = `/${d.src}`
						}
					}
				}
			} else {
				d.src = url
				sel.html(`<a href='${d.src}' target='_blank'>${d.src}</a>`)
			}
		}
	}

	if (focus) media.media.node().focus()
}
function addChecklist (kwargs) {
	const { data, lang, section, sibling, focus } = kwargs || {}
	let { id, level, type, name, fontsize, fontweight, fontstyle, options, instruction, required } = data || {}
	if (!level) level = 'media'
	if (!type) type = 'checklist'
	if (!name) name = null
	if (!fontsize) fontsize = 1
	if (!fontweight) fontweight = 'normal'
	if (!fontstyle) fontstyle = 'normal'
	if (!options) options = []
	else {
		// if (!populate) options.forEach(d => d.checked = false)
		// THIS IS SO THAT ANY NULL OPTION (THAT MIGHT COME FROM AN EXCEL SHEET) GETS PUSHED TO THE END
		options.sort((a, b) => {
			if (a.name === b.name) return 0
			else if (!a.name || !a.name.trim().length) return 1
			else if (!b.name || !b.name.trim().length) return -1
			else return a.id < b.id ? -1 : 1
		})
	}
	required = required ?? false

	if (!editing && activity !== 'preview' && options?.length === 0) return null

	if (editing && !options.find(d => !d.name) && !templated && level !== 'meta') options.push({ checked: false })
	if (!editing) options = options.filter(d => d.name)

	if (level === 'meta' && name) {
		const input = d3.select(`.media-input-group #input-meta-${name}`).node()
		if (input) input.disabled = true
	}

	const media = new Media({
		parent: section || d3.select('.group-container.focus').node() || d3.select('.media-layout.focus').node() || d3.selectAll('.media-layout').last().node(),
		sibling,
		type,
		datum: { id, level, type, name, fontsize, fontweight, fontstyle, options, instruction, required },
		focus: focus || false,
		lang
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

			if (editing) {
				if (!publicpage) switchButtons(lang)
				else window.sessionStorage.setItem('changed-content', true)
			}
		}).addElems('i', 'material-icons google-translate-attr')
			.html(d => d.label)
	}

	// DETERMINE ID FOR THE INPUT NAME
	let checklist_id = media.id//uuidv4()

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

	if (editing && !templated && level !== 'meta') {
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

			if (editing) {
				if (!publicpage) {
					switchButtons(lang)
					partialSave('media')
				} else {
					window.sessionStorage.setItem('changed-content', true)
					updateStatus()
				}
			}
		})
		opts.addElems('div', 'checkbox')
			.addElems('label')
			.attr('for', d => `check-item-${checklist_id}-${d.id}`)
		.addElems('i', 'material-icons google-translate-attr')
			.html(d => d.checked ? 'check_box' : 'check_box_outline_blank')
		opts.addElems('div', 'grow')
			.addElems('label',  'list-item')
			.attrs({
				'for': d => `check-item-${checklist_id}-${d.id}`,
				'data-placeholder': vocabulary['new checklist item'][language],
				'contenteditable': activity !== 'view' && !templated ? true : null
			})
		.on('keydown', function () {
			const evt = d3.event
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

			if (editing) {
				if (!publicpage) switchButtons(lang)
				else window.sessionStorage.setItem('changed-content', true)
			}
		}).html(d => d.name)

		if (editing && !templated && level !== 'meta') {
			opts.addElems('div', 'rm')
				.addElems('i', 'material-icons google-translate-attr')
				.html('clear')
			.on('click', function (d) {
				media.container.each(c => c.options = c.options.filter(b => b.id !== d.id))
				list.call(addItem)

				if (editing) {
					if (!publicpage) switchButtons(lang)
					else window.sessionStorage.setItem('changed-content', true)
				}
			})
		}

		const emptyOpts = opts.filter(d => !d.name)
		if (emptyOpts.node() && focus) emptyOpts.filter((d, i) => i === emptyOpts.size() - 1).select('.list-item').node().focus()
	}
}
function addRadiolist (kwargs) {
	const { data, lang, section, sibling, focus } = kwargs || {}
	let { id, level, type, name, fontsize, fontweight, fontstyle, options, instruction, required } = data || {}
	if (!level) level = 'media'
	if (!type) type = 'radiolist'
	if (!name) name = null
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
	required = required ?? false

	if (!editing && activity !== 'preview' && options?.length === 0) return null

	if (editing && !options.find(d => !d.name) && !templated && level !== 'meta') options.push({ checked: false })
	if (!editing) options = options.filter(d => d.name)

	if (level === 'meta' && name) {
		const input = d3.select(`.media-input-group #input-meta-${name}`).node()
		if (input) input.disabled = true
	}

	const media = new Media({
		parent: section || d3.select('.group-container.focus').node() || d3.select('.media-layout.focus').node() || d3.selectAll('.media-layout').last().node(),
		sibling,
		type,
		datum: { id, level, type, name, fontsize, fontweight, fontstyle, options, instruction, required },
		focus: focus || false,
		lang
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

			if (editing) {
				if (!publicpage) switchButtons(lang)
				else window.sessionStorage.setItem('changed-content', true)
			}
		}).addElems('i', 'material-icons google-translate-attr')
			.html(d => d.label)
	}

	// DETERMINE ID FOR THE INPUT NAME
	let radiolist_id = media.id // uuidv4

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

	if (editing && !templated && level !== 'meta') {
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

			if (editing) {
				if (!publicpage) {
					switchButtons(lang)
					partialSave('media')
				} else {
					window.sessionStorage.setItem('changed-content', true)
					updateStatus()
				}
			}
		})
		opts.addElems('div', 'radio')
			.addElems('label')
			.attr('for', d => `radio-item-${radiolist_id}-${d.id}`)
		.addElems('i', 'material-icons google-translate-attr')
			.html(d => d.checked ? 'radio_button_checked' : 'radio_button_unchecked')
		opts.addElems('div', 'grow')
			.addElems('label', 'list-item')
			.attrs({
				'for': d => `radio-item-${radiolist_id}-${d.id}`,
				'data-placeholder': vocabulary['new checklist item'][language],
				'contenteditable': activity !== 'view' && !templated ? true : null // TO DO: FIGURE OUT WHY HERE WE USE activity !== 'view' RATHER THAN editing
			})
		.on('keydown', function () {
			const evt = d3.event
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

			if (editing) {
				if (!publicpage) switchButtons(lang)
				else window.sessionStorage.setItem('changed-content', true)
			}
		}).html(d => d.name)

		if (editing && !templated && level !== 'meta') {
			opts.addElems('div', 'rm')
				.addElems('i', 'material-icons google-translate-attr')
				.html('clear')
			.on('click', function (d) {
				media.container.each(c => c.options = c.options.filter(b => b.id !== d.id))
				list.call(addItem)

				if (editing) {
					if (!publicpage) switchButtons(lang)
					else window.sessionStorage.setItem('changed-content', true)
				}
			})
		}

		const emptyOpts = opts.filter(d => !d.name)
		if (emptyOpts.node() && focus) emptyOpts.filter((d, i) => i === emptyOpts.size() - 1).select('.list-item').node().focus()
	}
}
// META ELEMENTS
function addLocations (kwargs) {
	// TO DO: INCLUDE CONSTRAINT
	const { data, lang, section, sibling, focus } = kwargs || {}
	let { id, level, type, name, instruction, centerpoints, caption, constraint, required } = data || {}
	if (!level) level = 'meta'
	if (!type) type = 'location'
	if (!name) name = null
	if (!centerpoints) centerpoints = []
	let dragging = false
	required = required ?? false

	if (!editing && activity !== 'preview' && centerpoints?.length === 0) return null

	const input = d3.select(`.media-input-group #input-meta-${name}`).node()
	if (input) input.disabled = true

	const meta = new Meta({
		parent: section || d3.select('.media-layout.focus').node() || d3.selectAll('.media-layout').last().node(),
		sibling,
		type,
		datum: { id, level, type, name, centerpoints, caption, instruction, constraint, required },
		focus: focus || false,
		lang,
		maxheight: 300
	})

	if (meta.opts) {
		meta.opts.addElems('div', 'opt-group', [vocabulary['click to search or add locations'][language]])
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
		html: '<i class="material-icons google-translate-attr">place</i>'
	})

	function rmPin (marker, container) {
		const btn = document.createElement('BUTTON')
		btn.innerHTML = vocabulary['remove pin'][language]
		btn.addEventListener('click', _ => {
			group.removeLayer(marker)
			markers = markers.filter(m => m !== marker)
			const centerpoints = []
			group.eachLayer(l => {
				const latlng = l.getLatLng()
				centerpoints.push({ lat: latlng.lat, lng: latlng.lng })
			})
			if (container.node()) container.each(d => d.centerpoints = centerpoints)
			if (markers.length === 0) meta.container.select('figcaption').html(c => c.caption = null)

			if (editing) {
				if (!publicpage) switchButtons(lang)
				else window.sessionStorage.setItem('changed-content', true)
			}
		})
		return btn
	}

	let markers = centerpoints?.filter(d => d).map((d, i) => {
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

				if (editing) {
					if (!publicpage) switchButtons(lang)
					else window.sessionStorage.setItem('changed-content', true)
				}
			})
		}
		return marker
	}) || []

	let group = L.featureGroup(markers)

	const map = L.map('map')

	if (markers.length) map.fitBounds(group.getBounds())
	else map.setView([centerpoint?.lat, centerpoint?.lng], (centerpoint?.lat === 0 && centerpoint?.lng === 0) ? 2 : 13)
	if (markers.length === 1) map.setZoom(10)

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
			.html(vocabulary['search place'][language])

		filter.addElems('button',  'search')
			.on('click', searchLocation)
		.addElems('i', 'material-icons google-translate-attr')
			.html('search')

		async function searchLocation () {
			const sel = d3.select('input#search-field')
			const inset = sel.findAncestor('inset')
			const location = sel.node().value.trim()

			const listContainer = inset.addElems('div', 'inset-location') // TO DO: MAYBE UPDATE THIS TO locations (AS PER TYPE) FOR CONSISTENCY
			addLoader(listContainer)
			// UPDATE THE MAX HEIGHT OF THE INSET
			meta.expand({ maxheight: 300, forceopen: true })

			const [ results ] = await POST('/forwardGeocoding', { locations: [location], list: true })
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
				// meta.container.each(c => c.centerpoint = { lat: d.geometry.lat, lng: d.geometry.lng })
				if (map) {
					const newcenterpoint = L.latLng(d.geometry)
					map.panTo(newcenterpoint)
					//.setZoom(10)
					// CHANGE CAPTION
					meta.container.select('figcaption')
					.html(c => c.caption = `<strong>${d.formatted}</strong> found using <a href='https://opencagedata.com/credits' target='_blank'>OpenCage Geocoder</a> | &copy; <a href='https://www.openstreetmap.org/copyright' target='_blank'>OpenStreetMap contributors</a>`)

					if (editing) {
						if (!publicpage) switchButtons(lang)
						else window.sessionStorage.setItem('changed-content', true)
					}
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
		}).on('touchend', e => {
			window.clearTimeout(timer)
			offset = [[], []]
		}).on('mousedown', e => {
			offset[0] = [e.containerPoint.x, e.containerPoint.x]
			if (!dragging) timer = window.setTimeout(_ => addLocation(e.latlng), 1000)
		})
		// .on('touchstart', e => {
		// 	offset[0] = [e.containerPoint.x, e.containerPoint.x]
		// 	if (!dragging) timer = window.setTimeout(_ => addLocation(e.latlng), 1000)
		// })
		.on('mousemove', e => offset[1] = [e.containerPoint.x, e.containerPoint.x])
		// .on('touchmove', e => offset[1] = [e.containerPoint.x, e.containerPoint.x])

		function addLocation (latlng) {
			const duplicate = markers.find(d => {
				const existing = d.getLatLng()
				return existing.lat === latlng.lat && existing.lng === latlng.lng
			})
			if (!duplicate) { // PREVENT DUPLICATE PINS
				const delta = Math.sqrt(Math.pow(offset[1][0] - offset[0][0], 2) + Math.pow(offset[1][1] - offset[0][1], 2)) || 0
				if (delta < 25) { // MAKE SURE THE USER IS NOT PANNING THE MAP DURING THE LONG CLICK
					const marker = new L.marker(latlng, { icon: singlepin, draggable: true })

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

								if (editing) {
									if (!publicpage) switchButtons(lang)
									else window.sessionStorage.setItem('changed-content', true)
								}
							})
						}
					})
					group = L.featureGroup(markers)
					if (pins) map.removeLayer(pins)
					pins = group.addTo(map)

					meta.container.each(d => d.centerpoints.push({ lat: latlng.lat, lng: latlng.lng }))

					if (editing) {
						if (!publicpage) switchButtons(lang)
						else window.sessionStorage.setItem('changed-content', true)
					}
				}
			}
		}
	}
}
function addIndexes (kwargs) {
	return new Promise(async resolve => {
		const { data, lang, section, sibling, focus } = kwargs || {}
		let { id, level, type, name, instruction, tags, constraint, required } = data || {}
		if (!level) level = 'meta'
		if (!type) type = 'index'
		if (!name) name = null
		if (!tags) tags = []
		// MAKE SURE THE SDGs ARE SORTED BY key
		tags.sort((a, b) => a.key - b.key)
		required = required ?? false

		if (!editing && activity !== 'preview' && tags?.length === 0) return null

		const input = d3.select(`.media-input-group #input-meta-${name}`).node()
		if (input) input.disabled = true

		const list = await new Taglist({
			parent: section || d3.select('.media-layout.focus').node() || d3.selectAll('.media-layout').last().node(),
			sibling,
			type,
			datum: { id, level, type, name, tags, instruction, constraint, required },
			opencode: metafields.find(d => d.label === name)?.opencode || false,
			focus: focus || false,
			lang,
			list: taglists[name].sort((a, b) => a.key - b.key),
			imglink: d => `/imgs/sdgs/${lang}/G${d.key || d}-c.svg`,  // THE || d IS LEGACY FOR THE ACTION PLANNING PLATFORM
			altimglink: d => `/imgs/sdgs/${lang}/G${d.key || d}.svg`  // THE || d IS LEGACY FOR THE ACTION PLANNING PLATFORM
		})

		if (list.opts) {
			list.opts.addElem('div', 'opt-group')
				.datum(vocabulary['click to see options'][language])
			.addElems('label', 'instruction')
				.html(d => d)

			if (constraint) {
				const opt = list.opts.addElem('div', 'opt-group')
					.datum({ key: 'constraint', label: 'block', value: constraint })
					.addElems('button', 'opt active')
				opt.addElems('i', 'material-icons google-translate-attr')
					.html(d => d.label)
				opt.addElems('span', 'constraint', d => d.key === 'constraint' ? [d] : [])
					.html(d => d.value - tags.length)
			}
		}
		resolve()
	})
}
async function addTags (kwargs) {
	const { data, lang, section, sibling, focus } = kwargs || {}
	let { id, level, type, name, instruction, tags, constraint, required } = data || {}
	if (!level) level = 'meta'
	if (!type) type = 'tag'
	if (!name) name = null
	if (!tags) tags = []
	required = required ?? false

	if (!editing && activity !== 'preview' && tags?.length === 0) return null

	const input = d3.select(`.media-input-group #input-meta-${name}`).node()
	if (input) input.disabled = true

	const list = await new Taglist({
		parent: section || d3.select('.media-layout.focus').node() || d3.selectAll('.media-layout').last().node(),
		sibling,
		type,
		datum: { id, level, type, name, tags, instruction, constraint, required },
		opencode: metafields.find(d => d.label === name)?.opencode || false,
		focus: focus || false,
		lang,
		list: taglists[name]
	})

	if (list.opts) {
		list.opts.addElem('div', 'opt-group')
			.datum(vocabulary['click to see options'][language])
		.addElems('label', 'instruction')
			.html(d => d)

		if (constraint) {
			const opt = list.opts.addElem('div', 'opt-group')
				.datum({ key: 'constraint', label: 'block', value: constraint })
				.addElems('button', 'opt active')
			opt.addElems('i', 'material-icons google-translate-attr')
				.html(d => d.label)
			opt.addElems('span', 'constraint', d => d.key === 'constraint' ? [d] : [])
				.html(d => d.value - tags.length)
		}
	}
}
async function addAttachment (kwargs) {
	const { data, lang, section, sibling, container, focus } = kwargs || {}
	let { id, level, type, name, srcs, instruction, constraint, required } = data || {}
	if (!level) level = 'meta'
	if (!type) type = 'attachment'
	if (!name) name = null
	if (!srcs) srcs = []
	required = required ?? false

	if (!editing && activity !== 'preview' && srcs?.length === 0) return null

	console.log(name)
	const input = d3.select(`.media-input-group #input-meta-${name}`).node()
	if (input) input.disabled = true

	const meta = new Meta({
		parent: section || d3.select('.media-layout.focus').node() || d3.selectAll('.media-layout').last().node(),
		sibling,
		container,
		type,
		datum: { id, level, type, name, srcs, instruction, required },
		focus: focus || false,
		lang
	})

	if (meta.opts) {
		meta.opts.addElems('div', 'opt-group', [vocabulary['click to add attachment'][language]]) // TO DO: UPDATE TEXT
			.addElems('label')
			.html(d => d)

		if (constraint) {
			const opt = meta.opts.addElem('div', 'opt-group')
				.datum({ key: 'constraint', label: 'block', value: constraint })
				.addElems('button', 'opt active')
			opt.addElems('i', 'material-icons google-translate-attr')
				.html(d => d.label)
			opt.addElems('span', 'constraint', d => d.key === 'constraint' ? [d] : [])
				.html(d => d.value - srcs.length)
		}
	}

	// THIS IS THE MODAL FOR INPUT
	if (focus) {
		const uris = metafields.find(d => d.label === name)?.uris || [ { uri: undefined } ]

		const item = {}
		item.headline = vocabulary['add external resource'][language]
		item.opts = []

		// TO DO: RESOLVE THIS FOR PUBLIC CONTRIBUTIONS: HOW DO PEOPLE SUBMIT CONSENT OR REFRENCE AN EXTERNAL FILE?
		uris.forEach((d, i) => {
			if (d.uri !== undefined) {
				item.opts.push({
					node: 'button',
					type: 'button',
					label: vocabulary['link file'][language],
					resolve: _ => {
						return new Promise(async resolve => {
							const pad_id = await partialSave('meta')
							resolve(window.location.replace(`/request/resource?uri=${encodeURI(d.uri)}&pad_id=${pad_id}&element_id=${meta.id}&name=${name}&type=${type}`))
						})
					}
				})
			} else {
				item.opts.push({
					node: 'input',
					type: 'url',
					placeholder: vocabulary['paste link'][language],
					// value: srcs.length ? srcs[0] : null,
					class: 'full-width',
					resolve: async _ => {
						const input = d3.select('.modal input[type="url"]').node().value
						if (input.isURL()) {
							return new Promise(async resolve => {
								const pad_id = await partialSave('meta')
								resolve(window.location.replace(`/save/resource?pad_id=${pad_id}&element_id=${meta.id}&name=${name}&type=${type}&src=${input}`))
							})
						} else alert ('This is not a URL.')
					}
				})
			}
			if (i < uris.length - 1) {
				item.opts.push({
					node: 'div',
					class: 'divider',
					label: vocabulary['or'][language].toUpperCase()
				})
			}
		})
		var result = await renderPromiseModal(item)
		if (result === null) {
			if (!srcs.length) meta.rmMedia()
		} else {
			d3.selectAll('div.screen').classed('hide', true)
			const screen = d3.select('div.screen')
				.classed('hide', false)
				.classed('dark', true)
		}
	}

	meta.media.addElems('a', 'attachment', d => { return d.srcs.map(c => { return { src: c, name: d.name } }) })
		.attrs({
			'href': d => d.src,
			'target': '_blank',
		})
	.addElems('img')
	.each(function (d) {
		const sel = d3.select(this)
		const img = new Image()
		img.onload = function () {
			sel.attr('src', this.src)
		}
		img.onerror = function (err) {
			if (err) console.log(err)
			img.src = `/imgs/icons/i-attachment.svg`
		}
		img.src = `/imgs/icons/i-${d.name}.svg`
	})

	if (activity !== 'view' || (activity === 'preview' && srcs.length === 0)) { // preview ACTIVITY SHOULD BE DEPRECATED
		// THIS IS TO RELOAD A CONSENT FORM
		if (meta.input) {
			meta.input.addElems('label')
			.on('click', d => {
				kwargs.focus = true
				kwargs.container = meta.container
				addAttachment(kwargs)
			}).addElems('i', 'material-icons google-translate-attr')
			.html('badge')
		}
	}
}

// GROUPS
function addGroup (kwargs) {
	const { data, lang, section, sibling, focus } = kwargs || {}
	let { id, level, type, name, structure, items, values, instruction, repeat } = data || {} // NOT SURE WHY values IS USED HERE, IT IS NOT USED ANYWHERE ELSE
	if (!level) level = 'media'
	if (!type) type = 'group'
	if (!name) name = null
	if (!structure) structure = []
	if (!items) items = []
	if (!values) values = []

	if (!editing && activity !== 'preview' && items?.length === 0) return null

	if (editing && !items.length && templated) items.push(JSON.parse(JSON.stringify(structure)))

	const media = new Media({
		parent: section || d3.select('.media-layout.focus').node() || d3.selectAll('.media-layout').last().node(),
		sibling,
		type,
		datum: { id, level, type, name, structure, items, instruction, repeat },
		focus: focus || false,
		lang
	})

	if (templated && repeat) {
		if (editing) {
			media.media.addElems('div', 'add-opt')
				.on('click', function (d) {
					const sel = d3.select(this)
					media.container.each(d => {
						const new_structure = structure.map(c => {
							const { id, ...data } = c
							return data
						})
						d.items.push(JSON.parse(JSON.stringify(new_structure)))
					}).call(addItems)
					if (media.container.selectAll('.media-group-items').size() >= repeat) media.media.classed('hide', true)
				})
			.addElems('i', 'material-icons google-translate-attr')
				.html('add_circle')
		}
	}
	media.container.call(addItems)


	function addItems (sel) {
		// DETERMINE ID TO KNOW WHETHER SECTION CAN BE REMOVED
		const groups = sel.insertElems('.media-group', 'div', 'media media-group-items', d => d.items)
		.each(async function (c) {
			this.innerHTML = ''
			await Promise.all(c.map(async b => await populateSection(b, lang, this)))
		})
		groups.classed('animate-in', (d, i) => i === groups.size() - 1)
		// THIS IS THE SAME AS IN MEDIA, BUT IN MEDIA WE PREVENT THESE OPTIONS WHEN TEMPLATED
		// HERE THEY ARE MADE AVAILABLE FOR REMOVING GROUP REPETITIONS
		const placement = groups.addElems('div', 'placement-opts')
		placement.addElems('div', 'opt', [
			{ label: 'close', value: 'delete', fn: sel => rmGroup(sel) },
		]).on('click', function (d) {
			d3.event.stopPropagation()
			d.fn(d3.select(this).findAncestor('media-group-items'))

			if (editing) {
				if (!publicpage) switchButtons(lang)
				else window.sessionStorage.setItem('changed-content', true)
			}
		}).on('mouseup', _ => d3.event.stopPropagation())
			.addElems('i', 'material-icons google-translate-attr')
			.html(d => d.label)

		function rmGroup (sel) { // TO DO: ONLY POSSIBLE WHEN THERE ARE MULTIPLE REPEATS
			// FOR META INPUT
			sel.selectAll('.media-container, .meta-container').data()
			.forEach(d => {
				if (d.name) {
					const input = d3.select(`#input-meta-${d.name}`).node()
					if (input) input.disabled = false
				}
			})

			sel.remove()
			// MAKE SURE THE OPTION TO REPEAT IS DISPLAYED
			if (media.container.selectAll('.media-group-items').size() < repeat) media.media.classed('hide', false)

			if (editing) {
				if (!publicpage) partialSave('media')
				else updateStatus()
			}
		}
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
			.html(vocabulary['save changes'][language])
	} else {
		const menu_logo = d3.select('nav#site-title .inner')
		window.sessionStorage.setItem('changed-content', true)
		menu_logo.selectAll('div.create, h1, h2').classed('hide', true)
		menu_logo.selectAll('div.save').classed('hide saved', false)
			.select('button')
		.on('click', _ => {
			if (editing) partialSave()
		}).html(vocabulary['save changes'][language])
	}
}