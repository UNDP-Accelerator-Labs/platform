function initWidgetInteractions (metafields, padtype) {
	if (!mediaSize) var mediaSize = getMediaSize()
	if (!metafields && !padtype) {
		const { metafields: pmeta, type: ptype } = JSON.parse(d3.select('data[name="pad"]').node()?.value)
		metafields = pmeta
		type = ptype
	}

	// ADD ALL INTERACTION WITH MEDIA AND META INPUT BUTTONS
	d3.select('.media-input-group #input-media-section')
	.on('mousedown', function () {
		this['__active_node__']	= d3.selectAll('.media-layout.focus').nodes()?.last()?.nextSibling
	}).on('click', function () {
		addSection({ lang: language, sibling: this['__active_node__'], focus: true })
		this['__active_node__'] = null
	})

	d3.select('.media-input-group #input-media-img + label')
	.on('mousedown', function () {
		this.control['__active_node__']	= d3.selectAll('.media-container.focus, .meta-container.focus').nodes()?.last()?.nextSibling
	})
	d3.select('.media-input-group #input-media-img')
	.on('change', function () {
		uploadImg({ form: this.form, lang: language, sibling: this['__active_node__'], focus: true })
		this['__active_node__'] = null
	})

	d3.select('.media-input-group #input-media-video + label')
	.on('mousedown', function () {
		this.control['__active_node__']	= d3.selectAll('.media-container.focus, .meta-container.focus').nodes()?.last()?.nextSibling
	})
	d3.select('.media-input-group #input-media-video')
	.on('change', function () {
		uploadVideo({ form: this.form, lang: language, sibling: this['__active_node__'], focus: true })
		this['__active_node__'] = null
	})

	d3.select('.media-input-group #input-media-drawing')
	.on('mousedown', function () {
		this['__active_node__']	= d3.selectAll('.media-container.focus, .meta-container.focus').nodes()?.last()?.nextSibling
	}).on('click', function () {
		addDrawing({ lang: language, sibling: this['__active_node__'], focus: true })
		this['__active_node__'] = null
	})

	d3.select('.media-input-group #input-media-txt')
	.on('mousedown', function () {
		this['__active_node__']	= d3.selectAll('.media-container.focus, .meta-container.focus').nodes()?.last()?.nextSibling
	}).on('click', function () {
		addTxt({ lang: language, sibling: this['__active_node__'], focus: true })
		this['__active_node__'] = null
	})

	d3.select('.media-input-group #input-media-embed')
	.on('mousedown', function () {
		this['__active_node__']	= d3.selectAll('.media-container.focus, .meta-container.focus').nodes()?.last()?.nextSibling
	}).on('click', function () {
		addEmbed({ lang: language, sibling: this['__active_node__'], focus: true })
		this['__active_node__'] = null
	})

	d3.select('.media-input-group #input-media-checklist')
	.on('mousedown', function () {
		this['__active_node__']	= d3.selectAll('.media-container.focus, .meta-container.focus').nodes()?.last()?.nextSibling
	}).on('click', function () {
		addChecklist({ lang: language, sibling: this['__active_node__'], focus: true })
		this['__active_node__'] = null
	})

	d3.select('.media-input-group #input-media-radiolist')
	.on('mousedown', function () {
		this['__active_node__']	= d3.selectAll('.media-container.focus, .meta-container.focus').nodes()?.last()?.nextSibling
	}).on('click', function () {
		addRadiolist({ lang: language, sibling: this['__active_node__'], focus: true })
		this['__active_node__'] = null
	})

	metafields.forEach(d => {
		d3.select(`.media-input-group #input-meta-${d.label}`)
		.on('mouseover', function () {
			d3.select(this).select('label').style('width', function () { return `${this.scrollWidth}px` })
		}).on('mouseout', function () {
			d3.select(this).select('label').style('width', 0)
		}).on('mousedown', function () {
			this['__active_node__']	= d3.selectAll('.media-container.focus, .meta-container.focus').nodes()?.last()?.nextSibling || null
		}).on('click', function () {
			const data = { 
				level: 'meta', 
				name: d.label, 
				constraint: d.limit || null, 
				required: d.required, 
				instruction: d.instruction, 
				options: d.options || null 
			}
			if (d.type === 'txt') addTxt({ data, lang: language, sibling: this['__active_node__'], focus: true })
			if (d.type === 'embed') addEmbed({ data, lang: language, sibling: this['__active_node__'], focus: true })
			if (d.type === 'drawing') addDrawing({ data, lang: language, sibling: this['__active_node__'], focus: true })
			if (d.type === 'checklist') addChecklist({ data, lang: language, sibling: this['__active_node__'], focus: true })
			if (d.type === 'radiolist') addRadiolist({ data, lang: language, sibling: this['__active_node__'], focus: true })
			// THE FOLLOWING ARE ALWAYS META
			if (d.type === 'tag') addTags({ data, lang: language, sibling: this['__active_node__'], focus: true })
			if (d.type === 'index') addIndexes({ data, lang: language, sibling: this['__active_node__'], focus: true })
			if (d.type === 'location') {
				// ADD DEFAULT LOCATION FOR MAP CENTERING
				data.default_location = JSON.parse(d3.select('data[name="location"]').node().value).lnglat
				addLocations({ data, lang: language, sibling: this['__active_node__'], focus: true })
			}
			if (d.type === 'attachment') addAttachment({ data, lang: language, sibling: this['__active_node__'], focus: true })

			d3.select(this).select('label').style('width', 0)
			this['__active_node__'] = null
		})
	})

	// DETERMINE WHETHER THE INPUT BAR NEEDS TO BE NAVIGATED (i.e., SCROLLED)
	if (padtype === 'blank') {
		d3.select('.media-input-group')
		.each(function () {
			const node = this
			const sel = d3.select(this)
			const inner = sel.select('.inner')
			const height = inner.node().clientHeight || inner.node().offsetHeight
			const scrollheight = inner.node().scrollHeight
			const scrolltop = inner.node().scrollTop
			const buttonheight = inner.select('button').node().clientHeight || inner.select('button').node().offsetHeight

			sel.classed('overflowing', scrollheight > (height + buttonheight))

			sel.select('button.scroll-up')
				.classed('hide', scrollheight <= (height + buttonheight))
			.on('click', function () {
				inner.node().scrollTo({
					top: scrolltop - (height - buttonheight),
					left: 0,
					behavior: 'smooth'
				})
			})

			sel.select('button.scroll-down')
				.classed('hide', scrollheight <= (height + buttonheight))
			.on('click', function () {
				inner.node().scrollTo({
					top: scrolltop + height - buttonheight,
					left: 0,
					behavior: 'smooth'
				})
			})
		})
	}

	// SET UP OPTIONS FOR sm DISPLAYS
	if (['xs', 'sm'].includes(mediaSize)) {
		d3.select('button.input-toolbox')
		.on('touchend, click', function () {
			d3.select(this).toggleClass('highlight')
			d3.select('.media-input-group').node().focus()
		})
		d3.select('.media-input-group').on('touchend', function () { this.focus() })
		.on('focus', function () {
			if (this.style.maxHeight) this.style.maxHeight = null
			else this.style.maxHeight = `${Math.min(this.scrollHeight, screen.height * .75)}px`
		}).on('blur', function () {
			 this.style.maxHeight = null
			 d3.select('button.input-toolbox').classed('highlight', false)
		})
	}
}