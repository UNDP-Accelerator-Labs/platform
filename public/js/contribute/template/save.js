function retrieveItems (sel, datum, items) {
	const { metafields } = JSON.parse(d3.select('data[name="template"]').node()?.value)

	// MEDIA OR META
	if (datum.type === 'title') {
		datum.instruction = (sel.select('.media-title').node() || sel.select('.meta-title').node())['outerText' || 'textContent' || 'innerText']
		items.push(datum)
	}
	else if (datum.type === 'img') {
		datum.instruction = (sel.select('.media-img').node() || sel.select('.meta-img').node())['outerText' || 'textContent' || 'innerText']
		items.push(datum)
	}
	else if (datum.type === 'drawing') {
		datum.instruction = (sel.select('.media-drawing').node() || sel.select('.meta-drawing').node())['outerText' || 'textContent' || 'innerText']
		items.push(datum)
	}
	else if (datum.type === 'txt') {
		datum.instruction = (sel.select('.media-txt').node() || sel.select('.meta-txt').node())['outerText' || 'textContent' || 'innerText']
		items.push(datum)
	}
	else if (datum.type === 'embed') {
		datum.instruction = (sel.select('.media-embed').node() || sel.select('.meta-embed').node())['outerText' || 'textContent' || 'innerText']
		items.push(datum)
	}
	else if (datum.type === 'checklist') {
		datum.instruction = (sel.select('.media-checklist .instruction').node() || sel.select('.meta-checklist .instruction').node())['outerText' || 'textContent' || 'innerText']
		const clone = JSON.parse(JSON.stringify(datum))
		clone.options = clone.options.filter(b => b.name?.length)
		items.push(clone)
	}
	else if (datum.type === 'radiolist') {
		datum.instruction = (sel.select('.media-radiolist .instruction').node() || sel.select('.meta-radiolist .instruction').node())['outerText' || 'textContent' || 'innerText']
		const clone = JSON.parse(JSON.stringify(datum))
		clone.options = clone.options.filter(b => b.name?.length)
		items.push(clone)
	}
	// META
	else if (datum.type === 'location') {
		datum.instruction = sel.select('.meta-location').node()['outerText' || 'textContent' || 'innerText']
		items.push(datum)
	}
	else if (metafields.some(d => ['tag', 'index'].includes(d.type) && [datum.type, datum.name].includes(d.label))) {
		datum.instruction = (sel.select(`.meta-${datum.type}`).node() || sel.select(`.meta-${datum.name}`).node())['outerText' || 'textContent' || 'innerText']
		items.push(datum)
		// items.push({ type: datum.type, level: datum.level, instruction: datum.instruction, constraint: datum.constraint, required: datum.required })
	}
	// skills SHOULD BE DEPRECATED
	else if (!metafields.some(d => d.label.toLowerCase() === 'skills') && (datum.type === 'skills' || datum.name === 'skills')) { // skills IS LEGACY FOR THE ACTION PLANS PLATFORM
		datum.instruction = (sel.select('.meta-methods').node() || sel.select('.meta-skills').node())['outerText' || 'textContent' || 'innerText']
		items.push(datum)
		// items.push({ type: datum.type, level: datum.level, instruction: datum.instruction, constraint: datum.constraint, required: datum.required })
	}
	else if (datum.type === 'attachment') {
		datum.instruction = sel.select('.meta-attachment').node()['outerText' || 'textContent' || 'innerText']
		items.push(datum)
	}
}

function compileContent (attr) {
	const template = JSON.parse(d3.select('data[name="template"]').node()?.value)

	const main = d3.select('main')
	const head = main.select('.head')
	const body = main.select('.body')
	const descriptionLayout = body.select('.description-layout')

	const content = {}
	// COLLECT TITLE
	let title = head.select('.title').node().innerText
	if (title) title = limitLength(title, 99);

	const description = descriptionLayout.select('.media-container .media-txt').node()['outerText' || 'textContent' || 'innerText']
	const slideshow = descriptionLayout.select('.input-slideshow #slideshow-status').node()?.checked || false

	// MAYBE INCLUDE ALERT IF title IS EMPTY
	// COLLECT ALL MEDIA
	const sections = []
	main.selectAll('.layout:not(.description-layout)')
	.each(function (d) {
		const items = []
		const sel = d3.select(this)
		sel.selectAll('.media-container, .meta-container')
		.each(function (c) {
			const sel = d3.select(this)
			const ingroup = sel.findAncestor('group-container')
			// GROUPS
			if (c.type === 'group') {
				const groupitems = []
				sel.selectAll('.media-group-items .media-container, .media-group-items .meta-container')
				.each(function (b) {
					retrieveItems(d3.select(this), b, groupitems)
				})
				c.instruction = sel.select('.media-group').node()['outerText' || 'textContent' || 'innerText']
				c.structure = groupitems
				items.push(c)
			} else {
				if (!ingroup) retrieveItems(sel, c, items)
			}
		})

		d.title = sel.select('.section-header h1').node().innerText
		d.lead = (sel.select('.media-lead').node() || {})['outerText' || 'textContent' || 'innerText']
		d.instruction = (sel.select('.media-repeat button div').node() || {})['outerText' || 'textContent' || 'innerText']
		d.structure = items
		sections.push(d)
	})

	// COMPILE FULL TXT FOR SEARCH
	const fullTxt = `${title}\n\n
		${description}\n\n
		${sections.map(d => d.title).join('\n\n').trim()}\n\n
		${sections.map(d => d.lead).join('\n\n').trim()}\n\n
		${sections.map(d => d.structure).flat().filter(d => d.type === 'title')
			.map(d => d.instruction).join('\n\n').trim()}\n\n
		${sections.map(d => d.structure).flat().filter(d => d.type === 'txt')
			.map(d => d.instruction).join('\n\n').trim()}\n\n
		${sections.map(d => d.structure).flat().filter(d => d.type === 'embed')
			.map(d => d.instruction).join('\n\n').trim()}\n\n
		${sections.map(d => d.structure).flat().filter(d => d.type === 'checklist')
			.map(d => d.instruction).join('\n\n').trim()}\n\n
		${sections.map(d => d.structure).flat().filter(d => d.type === 'checklist')
			.map(d => d.options.map(c => c.name)).flat().join('\n\n').trim()}
		${sections.map(d => d.structure).flat().filter(d => d.type === 'radiolist')
			.map(d => d.instruction).join('\n\n').trim()}\n\n
		${sections.map(d => d.structure).flat().filter(d => d.type === 'radiolist')
			.map(d => d.options.map(c => c.name)).flat().join('\n\n').trim()}
		${sections.map(d => d.structure).flat().filter(d => d.type === 'group').map(d => d.structure)
			.filter(d => d.type === 'txt')
			.map(d => d.txt).join('\n\n').trim()}\n\n
		${sections.map(d => d.structure).flat().filter(d => d.type === 'group').map(d => d.structure)
			.filter(d => d.type === 'embed')
			.map(d => d.html).join('\n\n').trim()}\n\n
		${sections.map(d => d.structure).flat().filter(d => d.type === 'group').map(d => d.structure)
			.filter(d => d.type === 'checklist')
			.map(d => d.options.filter(c => c.checked).map(c => c.name)).flat().join('\n\n').trim()}
		${sections.map(d => d.structure).flat().filter(d => d.type === 'group').map(d => d.structure)
			.filter(d => d.type === 'radiolist')
			.map(d => d.options.filter(c => c.checked).map(c => c.name)).flat().join('\n\n').trim()}`

	// COMPILE THE CONTENT
	content.title = title // ALWAYS SAVE THE TITLE
	content.slideshow = slideshow // ALWAYS SAVE THE SLIDESHOW OPTION
	if (!attr || attr === 'description') content.description = description.trim()
	if (!attr || ['lead', 'media', 'meta'].includes(attr)
	|| sections.map(d => d.structure).flat().unique('type', true).includes(attr)) {
		content.sections = sections
	}
	// ALWAYS SEND fullTxt
	content.full_text = fullTxt

	// ALWAYS SEND status
	const completion = []
	completion.push(title?.trim().length > 0)

	if (template.category !== 'review') {
		template.metafields.filter(d => d.required).forEach(d => {
			completion.push(sections.map(c => c.structure)?.flat().some(c => c.name === d.label))
		})
	} else {
		completion.push(sections.map(d => d.structure)?.flat()?.length > 0)
	}
	// if (completion.every(d => d === true)) status = Math.max(1, status)
	// else status = 0
	content.completion = completion.every(d => d === true)

	return content
}

async function partialSave (attr) {
	console.log('saving')
	const template = JSON.parse(d3.select('data[name="template"]').node()?.value)

	// FIRST CHECK IF THIS IS A NEW TEMPLATE
	// CHECK IF THE PAD ALREADY HAS AN id IN THE DB
	const url = new URL(window.location)
	const queryparams = new URLSearchParams(url.search)
	let id = queryparams.get('id')
	let source = queryparams.get('source')
	// IF IT HAS, THEN FOR THE FIRST SAVE, COMPILE EVERYTHING IN CASE IT IS A COPY OF A TEMPLATE
	let content
	if (id) {
		content = compileContent(attr)
		content.id = +id
	}
	else {
		content = compileContent()
		if (source) content.source = +source
	}

	if (template.category === 'review') {
		content.review_template = true
		content.review_language = template.language
	}

	return await POST('/save/template', content)
	.then(res => {
		// ADD THE NOTIFICATION
		window.sessionStorage.removeItem('changed-content')

		if (!mediaSize) var mediaSize = getMediaSize()
		if (mediaSize === 'xs') {
			const save_btn = d3.select('.meta-status .btn-group .save').classed('saved', true)
			save_btn.select('button')
				.html(vocabulary['changes saved'])
			window.setTimeout(_ => {
				save_btn.classed('saved', false)
				.select('button').each(function () { this.disabled = true })
					.html(vocabulary['save'])
			}, 1000)
		} else {
			const menu_logo = d3.select('nav#site-title .inner')
			menu_logo.select('.save').classed('saved', true)
				.select('button')
				.html(vocabulary['changes saved'])
			window.setTimeout(_ => {
				menu_logo.selectAll('div.create, h1, h2').classed('hide', false)
				menu_logo.selectAll('div.save').classed('hide', true)
			}, 1000)
		}

		// CHANGE THE URL TO INCLUDE THE PAD ID
		if (!id) { // INSERT
			id = res.data.id
			queryparams.append('id', id)
			url.search = queryparams.toString()
			// BASED ON:
			// https://usefulangle.com/post/81/javascript-change-url-parameters
			// https://www.30secondsofcode.org/blog/s/javascript-modify-url-without-reload
			const nextURL = url.toString().replace('contribute', 'edit')
			const nextTitle = 'Update template'
			const nextState = { additionalInformation: 'Updated the URL with JS' }
			window.history.pushState(nextState, nextTitle, nextURL)
			// REMOVE THE templates MENU
			// d3.select('nav#filter').remove()

			// SET THE ID FOR THE PUBLISH AND GENERATE FORMS
			d3.selectAll('div.meta-status form input[name="id"]').attr('value', id)
		}

		updateStatus(res.data.status)
		return id
		
	}).catch(err => console.log(err))
}

function updateStatus (_status) {
	// ACTIVATE THE PUBLISHING OPTIONS AT THE END
	const metastatus = d3.select('div.meta-status')
		.classed('status-0 status-1 status-2', false)
		.classed(`status-${_status}`, true)
	metastatus.select('div.btn-group form button.publish')
		.attr('disabled', _status >= 1 ? null : true)
	metastatus.select('div.btn-group form button.generate-pdf')
		.attr('disabled', _status > 0 ? null : true)
}