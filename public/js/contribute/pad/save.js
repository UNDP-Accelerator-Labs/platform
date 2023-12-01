// THE FOUR FOLLOWING FUNCTIONS ARE FOR THE SAVING MECHANISM
function retrieveItems (sel, datum, items) {
	// MEDIA
	if (datum.type === 'title') {
		datum.txt = (sel.select('.media-title').node() || sel.select('.meta-title').node()).innerText
		datum.has_content = datum.txt?.trim()?.length > 0
		items.push(datum)
	}
	if (['img', 'mosaic', 'video'].includes(datum.type)) {
		if (datum.type === 'mosaic') datum.has_content = datum?.srcs?.filter(b => b)?.length > 0
		else datum.has_content = datum.src !== null && datum.src !== undefined
		items.push(datum)
	}
	else if (datum.type === 'drawing') {
		datum.has_content = datum.shapes?.length > 0
		items.push(datum)
	}
	else if (datum.type === 'txt') {
		// datum.txt = (sel.select('.media-txt').node() || sel.select('.meta-txt').node()).innerHTML
		datum.txt = (sel.select('.media-txt').node() || sel.select('.meta-txt').node())['outerText' || 'textContent' || 'innerText']
		datum.has_content = datum.txt?.trim()?.length > 0
		items.push(datum)
	}
	else if (datum.type === 'embed') {
		datum.html = (sel.select('.media-embed').node() || sel.select('.meta-embed').node()).innerHTML
		datum.has_content = datum.html?.trim()?.length > 0
		items.push(datum)
	}
	else if (['checklist', 'radiolist'].includes(datum.type)) {
		datum.has_content = datum.options.filter(b => b.name?.length && b.checked).length > 0
		const clone = JSON.parse(JSON.stringify(datum))
		clone.options = clone.options.filter(b => b.name?.length)
		items.push(clone)

		// datum.options = datum.options.filter(b => b.name && b.name.length)
		// items.push(datum)
	}
	// SPECIFIC META
	else if (datum.type === 'location') {
		datum.has_content = datum.centerpoints?.length > 0
		items.push(datum)
	}
	else if (['tag', 'index'].includes(datum.type)) {
		datum.has_content = (datum.sdgs?.length || datum.tags?.length) > 0 // THIS IS LEGACY FOR THE ACTION PLANNING PLATFORM: TO DO: DEPRECATE
		items.push(datum)
	}
	else if (datum.type === 'attachment') {
		datum.has_content = datum.srcs?.length > 0
		items.push(datum)
	}
}
function getStatus () {
	const page = JSON.parse(d3.select('data[name="page"]').node()?.value) 
	const pad = JSON.parse(d3.select('data[name="pad"]').node()?.value)

	const main = d3.select('#pad')
	const body = main.select('.body')
	
	const completion = []

	// const title = d3.select('#pad .head .title').node()?.innerText || (body.select('.media-title').node() || body.select('.meta-title').node())?.innerText || vocabulary['missing title'][language]
	const title = d3.select('#pad .head .title').node()?.innerText || (body.select('.media-title').node() || body.select('.meta-title').node())?.innerText || vocabulary['missing title']
	completion.push(title?.trim()?.length > 0)

	let metacompletion = JSON.parse(JSON.stringify(pad.metafields)).filter(d => d.required).map(d => d.label)

	function checkCompletion (d) {
		// <%# if ((templated && [null, undefined].includes(locals.display_template.medium)) || publicpage) { %>
		if (
			(pad.type === 'templated' 
				&& [null, undefined].includes(pad.template.medium)
			) || page.type === 'public'
		) {
			if (d.required === null || d.required === undefined) throw 'there is no requirement: this should not happen'
			if (d.required === false) return true
			else return d.has_content === true
		} else {
			metacompletion = metacompletion.map(c => c === d.name ? d.has_content === true : c)
		}
	}

	d3.select('#pad')
	.selectAll('.layout:not(.description-layout)')
	.each(function (d) {
		const items = []
		const sel = d3.select(this)

		sel.selectAll('.media-container, .meta-container')
		.each(function (c) {
			const sel = d3.select(this)
			const ingroup = sel.findAncestor('group-container')
			// GROUPS
			if (c.type === 'group') {
				// const groupitems = []
				sel.selectAll('.media-group-items')
					.each(function () {
						const sel = d3.select(this)
						const subitems = []
						sel.selectAll('.media-container, .meta-container')
							.each(function (b) {
								retrieveItems(d3.select(this), b, subitems)
							})
						// completion.push(!subitems.map(checkCompletion).unique().includes(false))
						completion.push(subitems.map(checkCompletion).every(d => d === true))
					})
			} else {
				if (!ingroup) retrieveItems(sel, c, items)
				// completion.push(!items.map(checkCompletion).unique().includes(false))
			}
		})
		// if (items.length) completion.push(!items.map(checkCompletion).unique().includes(false))
		if (items.length) completion.push(items.map(checkCompletion).every(d => d === true))
	})

	// <%# if ((templated && [null, undefined].includes(locals.display_template.medium)) || publicpage) { %>
	if (
		(pad.type === 'templated'
			&& [null, undefined].includes(pad.template.medium)
		) || page.type === 'public'
	) {
		console.log('override default requirements')
		return completion.every(d => d === true)
	} else {
		console.log('default requirements')
		return metacompletion.every(d => d === true)
	}
	// if (!templated) return metacompletion.every(d => d === true)
	// else return !completion.unique().includes(false)
	// else return completion.every(d => d === true)
}
function compileContent (attr) {
	const pad = JSON.parse(d3.select('data[name="pad"]').node()?.value)
	const main = d3.select('#pad')
	const body = main.select('.body')

	const content = {}
	// COLLECT TITLE
	// let title = d3.select('#pad .head .title').node().innerText
	// let title = d3.select('#pad .head .title').node()?.innerText || (body.select('.media-title').node() || body.select('.meta-title').node())?.innerText || vocabulary['missing title'][language]
	let title = d3.select('#pad .head .title').node()?.innerText || (body.select('.media-title').node() || body.select('.meta-title').node())?.innerText || vocabulary['missing title']
	if (title) title = limitLength(title, 99);
	// MAYBE INCLUDE ALERT IF title IS EMPTY
	// COLLECT ALL MEDIA
	const sections = []
	d3.select('#pad')
	.selectAll('.layout:not(.description-layout)')
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
				sel.selectAll('.media-group-items')
					.each(function () {
						const sel = d3.select(this)
						const subitems = []
						sel.selectAll('.media-container, .meta-container')
							.each(function (b) {
								retrieveItems(d3.select(this), b, subitems)
							})
						groupitems.push(subitems)
					})
				c.items = groupitems
				items.push(c)
			} else {
				if (!ingroup) retrieveItems(sel, c, items)
			}
		})

		d.title = (sel.select('.section-header h1').node() || {}).innerText
		d.lead = (sel.select('.media-lead').node() || {})['outerText' || 'textContent' || 'innerText']
		d.instruction = (sel.select('.media-repeat button div').node() || {}).innerText
		d.items = items
		sections.push(d)
	})

	// const location = main.select('.location-container').node() ? main.select('.location-container').datum() : null // THIS IS NOT NEEDED
	// let skills = main.select('.skills-container').node() ? main.select('.skills-container').datum().tags.map(d => d.name) : null

	// THIS SHOULD REPLAE WHAT IS ABOVE

	// if (main.select('.sdgs-container').node()) {
	// 	main.selectAll('.sdgs-container').each(d => {
	// 		d.tags.forEach(c => {
	// 			// THE FILTERING HERE IS MAINLY FOR LEGACY, BECAUSE ORIGINALLY sdgs WERE ONLY THE keys, NOT THE { key: INT, name: STR } OBJECT
	// 			if (Object.keys(c).includes('key') && Object.keys(c).includes('name')) {
	// 				allTags.push({ id: c.key, name: c.name, type: d.type.slice(0, -1) })
	// 			}
	// 		})
	// 	})
	// }

	const allTags = []
	pad.metafields.filter(d => ['tag', 'index'].includes(d.type)).forEach(d => {
		main.selectAll(`.${d.label}-container .tag input:checked`)
		.each(c => {
			// THE FILTERING HERE IS MAINLY FOR LEGACY, BECAUSE ORIGINALLY tags WERE ONLY THE names, NOT THE { id: INT, name: STR } OBJECT
			if (c.id && c.name && c.type) allTags.push({ id: c.id, type: c.type, name: c.name })
		})
	})
	content.tagging = allTags

	if (main.select('.location-container').node()) {
		content.locations = main.select('.location-container')?.datum()?.centerpoints
	} else content.locations = null

	const otherMetadata = []
	pad.metafields.filter(d => !['tag', 'index', 'location'].includes(d.type))
	.forEach(d => {
		main.selectAll(`.${d.label}-container`)
		.each(c => {
			retrieveItems(d3.select(this), c, otherMetadata)
		})
	})
	content.metadata = otherMetadata.map(d => {
		const { id, level, has_content, instruction, required, ...metadata } = d
		const { type, name } = metadata
		// const valuekey = Object.keys(metadata).find(c => <%- JSON.stringify(locals.metadata.site.media_value_keys) %>.includes(c))
		const valuekey = Object.keys(metadata).find(c => pad.media_value_keys.includes(c)) // TO DO: MAKE SURE THIS WORKS
		const value = metadata[valuekey]

		if (Array.isArray(value)) {
			return value.filter(c => {
				if (valuekey === 'options') return c.checked === true
				else return c
			}).map(c => {
				if (valuekey === 'options') return { type, name, value: c.name, key: c.id }
				else return { type, name, value: c }
			})
		} else return { type, name, value }
	}).flat()

	// COMPILE FULL TXT FOR SEARCH
	const fullTxt = `${title}\n\n
		${sections.map(d => d.title).join('\n\n').trim()}\n\n
		${sections.map(d => d.lead).join('\n\n').trim()}\n\n
		${sections.map(d => d.items).flat().filter(d => d.type === 'txt')
			.map(d => d.txt).join('\n\n').trim()}\n\n
		${sections.map(d => d.items).flat().filter(d => d.type === 'embed')
			.map(d => d.html).join('\n\n').trim()}\n\n
		${sections.map(d => d.items).flat().filter(d => d.type === 'checklist')
			.map(d => d.options.filter(c => c.checked).map(c => c.name)).flat().join('\n\n').trim()}
		${sections.map(d => d.items).flat().filter(d => d.type === 'radiolist')
			.map(d => d.options.filter(c => c.checked).map(c => c.name)).flat().join('\n\n').trim()}
		${sections.map(d => d.items).flat().filter(d => d.type === 'group').map(d => d.items)
			.filter(d => d.type === 'txt')
			.map(d => d.txt).join('\n\n').trim()}\n\n
		${sections.map(d => d.items).flat().filter(d => d.type === 'group').map(d => d.items)
			.filter(d => d.type === 'embed')
			.map(d => d.html).join('\n\n').trim()}\n\n
		${sections.map(d => d.items).flat().filter(d => d.type === 'group').map(d => d.items)
			.filter(d => d.type === 'checklist')
			.map(d => d.options.filter(c => c.checked).map(c => c.name)).flat().join('\n\n').trim()}
		${sections.map(d => d.items).flat().filter(d => d.type === 'group').map(d => d.items)
			.filter(d => d.type === 'radiolist')
			.map(d => d.options.filter(c => c.checked).map(c => c.name)).flat().join('\n\n').trim()}`

	// ALWAYS SEND fullTxt
	content.full_text = fullTxt

	// COLLECT DELETED MATERIAL (THIS WILL BE CLEARED FROM SESSIONSTORAGE UPON SUCCESS)
	const deletion = JSON.parse(window.sessionStorage.getItem('deleted')) || []

	// IF THIS IS A NEW PAD, CHECK WHETHER IT HAS A SOURCE
	// if (activity === 'contribute')
	// ALWAYS SEND THE SOURCE (BECAUSE reviews DEPEND ON THE SOURCE)
	// content.source = <%- locals.source || JSON.stringify(locals.source) || JSON.stringify(null) %>;
	content.source = pad.source;
	// ALWAYS SAVE THE TITLE
	content.title = title
	if (!attr || ['title', 'lead', 'media', 'meta', 'group'].includes(attr)
	|| sections.map(d => d.items).flat().unique('type', true).includes(attr)) {
		content.sections = sections
	}
	// if (!attr || attr === 'meta' || meta.unique('type', true).includes(attr)) content.meta = JSON.stringify(meta)
	// if (!attr || attr === 'location') content.location = JSON.stringify(location)
	// if (!attr || attr === 'sdgs') content.sdgs = JSON.stringify(sdgs)
	// if (!attr || attr === 'tag') content.tags = JSON.stringify(tags)
	// if (!attr || attr === 'skills') content.skills = JSON.stringify(skills)
	// if (!attr || attr === 'datasources') content.datasources = JSON.stringify(datasources)

	// FULL TEXT
	// if (!attr || ['title', 'lead', 'txt', 'embed', 'checklist', 'radiolist', 'tags', 'group'].includes(attr))


	// ALWAYS SEND status
	const completion = getStatus()
	content.completion = completion
	// ALWAYS SEND deletion IF THERE IS SOMETHING TO DELET
	if (deletion.length) content.deletion = deletion

	return content
}
async function partialSave (attr) {
	const object = d3.select('data[name="object"]').node().value

	console.log('saving')
	// FIRST CHECK IF THIS IS A NEW PAD
	const content = compileContent(attr)
	// CHECK IF THE PAD ALREADY HAS AN id IN THE DB
	const url = new URL(window.location)
	const queryparams = new URLSearchParams(url.search)
	let id = queryparams.get('id')
	if (id) content.id = +id
	const template = queryparams.get('template')
	if (template) content.template = +template
	const mobilization = queryparams.get('mobilization')
	if (mobilization) content.mobilization = +mobilization

	return await POST(`/save/${object}`, content)
	.then(async res => {
		// ADD THE NOTIFICATION
		window.sessionStorage.removeItem('changed-content')

		if (!mediaSize) var mediaSize = getMediaSize()
		if (['xs', 'sm'].includes(mediaSize)) {
			const save_btn = d3.select('.meta-status .btn-group .save').classed('saved', true)
			save_btn.select('button')
				// .html(vocabulary['changes saved'][language])
				.html(vocabulary['changes saved'])
			window.setTimeout(_ => {
				save_btn.classed('saved', false)
				.select('button').each(function () { this.disabled = true })
					// .html(vocabulary['save'][language])
					.html(vocabulary['save'])
			}, 1000)
		} else {
			const menu_logo = d3.select('nav#site-title .inner')
			menu_logo.select('.save').classed('saved', true)
				.select('button')
				// .html(vocabulary['changes saved'][language])
				.html(vocabulary['changes saved'])
			window.setTimeout(_ => {
				menu_logo.selectAll('div.create, h1, h2').classed('hide', false)
				menu_logo.selectAll('div.save').classed('hide', true)
			}, 1000)
		}

		// REMOVE ITEMS TO DELETE
		window.sessionStorage.removeItem('deleted')
		// CHANGE THE URL TO INCLUDE THE PAD ID
		if (!id) { // INSERT
			id = res.data.id
			queryparams.append('id', id)
			url.search = queryparams.toString()
			// BASED ON:
			// https://usefulangle.com/post/81/javascript-change-url-parameters
			// https://www.30secondsofcode.org/blog/s/javascript-modify-url-without-reload
			const nextURL = url.toString().replace('contribute', 'edit')
			const nextTitle = 'Update pad' // TO DO: RESET FOR TEMPLATE
			const nextState = { additionalInformation: 'Updated the URL with JS' }
			window.history.pushState(nextState, nextTitle, nextURL)
			// REMOVE THE templates MENU
			// d3.select('nav#filter').remove()

			// SET THE ID FOR THE PUBLISH AND GENERATE FORMS
			d3.selectAll('div.meta-status form input[name="id"]').attr('value', id)
			// d3.select('div.meta-status form.generate-pdf input[name="id"]').attr('value', res.object)
		}

		await updateStatus(res.data.status)
		return id
	}).catch(err => console.log(err))
}
async function updateStatus (_status) {
	if (!_status) {
		const curr_status = await getContent({ feature: 'status' })
		const completion = getStatus()
		if (completion) _status = Math.max(1, curr_status)
		else _status = 0
	}

	// ACTIVATE THE PUBLISHING OPTIONS AT THE END
	const metastatus = d3.select('div.meta-status')
		.classed('status-0 status-1 status-2', false)
		.classed(`status-${_status}`, true)
	metastatus.select('div.btn-group form button.publish')
		.attr('disabled', _status >= 1 ? null : true)
	metastatus.select('div.btn-group form button.generate-pdf')
		.attr('disabled', _status > 0 ? null : true)
}
async function saveAndSubmit (node) {
	await partialSave()
	node.form.submit()
	// TO DO: PROVIDE FEEDBACK
	// CREATE A THANK YOU PAGE
	// AND MAYBE AUTO CREATE A PUBLIC PINBOARD FOR OPEN MOBILIZATIONS
	// SO THAT AUTHORS CAN GO CHECK THEM OUT
}