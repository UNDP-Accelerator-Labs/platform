function initWidgetInteractions () {
	const { metafields } = JSON.parse(d3.select('data[name="template"]').node()?.value)

	// ADD ALL INTERACTION WITH MEDIA AND META INPUT BUTTONS
	d3.select('.media-input-group #input-media-section')
	.on('mousedown', function () {
		this['__active_node__'] = d3.selectAll('.media-layout.focus').nodes()?.last()?.nextSibling
	}).on('click', function () {
		addSection({ lang: language, sibling: this['__active_node__'], focus: true })
		this['__active_node__'] = null
	})

	d3.select('.media-input-group #input-media-repeat-section')
	.on('mousedown', function () {
		this['__active_node__'] = d3.selectAll('.media-layout.focus').nodes()?.last()?.nextSibling
	}).on('click', function () {
		addSection({ data: { repeat: true }, lang: language, sibling: this['__active_node__'], focus: true })
		this['__active_node__'] = null
	})

	d3.select('.media-input-group #input-meta-group')
	.on('mousedown', function () {
		this['__active_node__'] = d3.selectAll('.media-container.focus, .meta-container.focus').nodes()?.last()?.nextSibling
	}).on('click', function () {
		addGroup({ lang: language, sibling: this['__active_node__'], focus: true })
		this['__active_node__'] = null
	})

	d3.select('.media-input-group #input-media-img')
	.on('mousedown', function () {
		this['__active_node__'] = d3.selectAll('.media-container.focus, .meta-container.focus').nodes()?.last()?.nextSibling
	}).on('click', function () {
		addImg({ lang: language, sibling: this['__active_node__'], focus: true })
		this['__active_node__'] = null
	})

	d3.select('.media-input-group #input-media-drawing')
	.on('mousedown', function () {
		this['__active_node__'] = d3.selectAll('.media-container.focus, .meta-container.focus').nodes()?.last()?.nextSibling
	}).on('click', function () {
		addDrawing({ lang: language, sibling: this['__active_node__'], focus: true })
		this['__active_node__'] = null
	})

	d3.select('.media-input-group #input-media-txt')
	.on('mousedown', function () {
		this['__active_node__'] = d3.selectAll('.media-container.focus, .meta-container.focus').nodes()?.last()?.nextSibling
	}).on('click', function () {
		addTxt({ lang: language, sibling: this['__active_node__'], focus: true })
		this['__active_node__'] = null
	})

	d3.select('.media-input-group #input-media-embed')
	.on('mousedown', function () {
		this['__active_node__'] = d3.selectAll('.media-container.focus, .meta-container.focus').nodes()?.last()?.nextSibling
	}).on('click', function () {
		addEmbed({ lang: language, sibling: this['__active_node__'], focus: true })
		this['__active_node__'] = null
	})

	d3.select('.media-input-group #input-media-checklist')
	.on('mousedown', function () {
		this['__active_node__'] = d3.selectAll('.media-container.focus, .meta-container.focus').nodes()?.last()?.nextSibling
	}).on('click', function () {
		addChecklist({ lang: language, sibling: this['__active_node__'], focus: true })
		this['__active_node__'] = null
	})

	d3.select('.media-input-group #input-media-radiolist')
	.on('mousedown', function () {
		this['__active_node__'] = d3.selectAll('.media-container.focus, .meta-container.focus').nodes()?.last()?.nextSibling
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
				options: d.options || null 
			}
			if (d.type === 'txt') addTxt({ data, lang: language, sibling: this['__active_node__'], focus: true })
			if (d.type === 'embed') addEmbed({ data, lang: language, sibling: this['__active_node__'], focus: true })
			if (d.type === 'drawing') addDrawing({ data, lang: language, sibling: this['__active_node__'], focus: true })
			if (d.type === 'checklist') addChecklist({ data, lang: language, sibling: this['__active_node__'], focus: true })
			if (d.type === 'radiolist') addRadiolist({ data, lang: language, sibling: this['__active_node__'], focus: true })
			// THE FOLLOWING ARE ALWAYS META
			if (d.type === 'tag') addTags({ data, lang: language, sibling: this['__active_node__'], focus: true })
			else if (d.type === 'index') addIndexes({ data, lang: language, sibling: this['__active_node__'], focus: true })
			else if (d.type === 'location') addLocations({ data, lang: language, sibling: this['__active_node__'], focus: true })
			else if (d.type === 'attachment') addAttachment({ data, lang: language, sibling: this['__active_node__'], focus: true })

			d3.select(this).select('label').style('width', 0)
			this['__active_node__'] = null
		})
	})

	// DETERMINE WHETHER THE INPUT BAR NEEDS TO BE NAVIGATED (i.e., SCROLLED)
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