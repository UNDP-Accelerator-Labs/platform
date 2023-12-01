window.addEventListener('DOMContentLoaded', async function () {
	if (!mediaSize) var mediaSize = getMediaSize()

	const object = d3.select('data[name="object"]').node().value
	const space = d3.select('data[name="space"]').node().value
	const { load, id: page, pages, display } = JSON.parse(d3.select('data[name="page"]').node().value)

	await renderSections()

	d3.select('button#open-pinboard-preview')
	.on('click', function () {
		openPreview()
	})

	d3.select('button#share-pinboard')
	.on('click', function () {
		setShareOptions(this)
	})

	d3.select('div#pinboard-title')
	.on('keydowwn', function () {
		checkForEnter(d3.event, this)
	}).on('blur', async function () {
		await partialSave('pinboard', this.dataset.id)
	})

	d3.select('div#pinboard-description')
	.on('blur', async function () {
		await partialSave('pinboard', this.dataset.id)
	})

	d3.select('div#pinboard-section-description')
	.on('blur', async function () {
		await partialSave('section-description', this.dataset.id)
	})

	// SET PAGINATION LINKS
	d3.selectAll('nav.pagination a.page-link')
	.on('click', function () {
		const { value } = this.dataset
		redirect({ location: null, params: [{ key: 'page', value }] })
	})
	// SET TAB LINKS
	// TO NOTE: ULTIMATELY IT MIGHT BE BETTER TO DEPRECATE THIS
	// BECAUSE IT RESULTS IN SITUATIONS WHERE NOTHING IS DISPLAYED
	// e.g. WHEN FILTERING IN ./published THEN NAVIGATING TO ./private
	// THE USER MAY NOT HAVE ANY ./private PADS THAT MEET THE FILTERING CRITERIA
	d3.selectAll('nav.tabs menu li a')
	.on('click', function () {
		const { location } = this.dataset
		redirect({ location, params: [{ key: 'page', value: 1 }], rm: ['pinboard', 'status', 'section'] }) // THE rm HERE IS TO REMOVE ANY params IN THE query THAT SHOULD NOT BE CARRIED OVER FROM ONE TAB TO ANOTHER
	})
	// ADD INTERACTION FOR MAIN SEARCH AND FILTER MODULE
	// REPRINT STATUS TOGGLES IN FILTERS MENU IF sm DISPLY
	const filter_module = d3.select('#search-and-filter')
	if (mediaSize === 'xs') {
		const status_toggles = filter_module.select('form .status').node()
		const parent = filter_module.select('form .filters').node()
		parent.appendChild(status_toggles)
	}
	filter_module.selectAll('.filters .filter .dropdown input[type=checkbox]')
	.on('change', function () {
		const { id, name } = this.dataset;
		addequivalents(this); 
		toggletag(this, { id, name })
	});
	filter_module.selectAll('.filters .active-filters .tag .close')
	.on('click', function () {
		const { id, name } = this.dataset;
		rmtag(this, { id, name });
	});
	filter_module.selectAll('.status input.toggle')
	.on('change', function () {
		this.form.requestSubmit[this.form.querySelector("button#search")] || this.form.submit();
	});
	filter_module.selectAll('.global-actions .dropdown .pinboard input[type=radio]')
	.on('change', function () {
		pinAll(this);
	});
	filter_module.select('.global-actions button.download')
	.on('click', function () {
		setDownloadOptions();
	});
	filter_module.select('button.expand-filters')
	.on('click', function () {
		expandfilters(this);
	});

	// HANDLE TABS DROPDOWNS FOR SMALL DISPLAYS
	if (['xs', 'sm'].includes(mediaSize)) {
		const nav = d3.selectAll('nav.tabs, nav.pinboard-sections')
		const tabs = nav.selectAll(`.inner .${mediaSize}`)
		const button = tabs.selectAll('button.space')

		// HERE WE NEED TO LOOK AT EACH SPECIFIC INSTANCE OF nav.tabs AND nav.pinboard-sections
		// TO SET THE RIGHT NAME
		const active_tab = d3.select(`nav.tabs .inner .${mediaSize} .dropdown menu li.active`)
		const button_tab = d3.select(`nav.tabs .inner .${mediaSize} button.space`)
		const active_section = d3.select(`nav.pinboard-sections .inner .${mediaSize} .dropdown menu li.active`)
		const button_section = d3.select(`nav.pinboard-sections .inner .${mediaSize} button.space`)

		if (active_tab.node()) {
			if (active_tab.select('input')?.node()) {
				button_tab.html(active_tab.select('input').node().value)
			} else {
				button_tab.html(active_tab.select('button').html())
				// active_tab.remove()
			}
		}
		if (active_section.node()) {
			button_section.html(active_section.select('button').each(function () { d3.selectAll(this.children).attr('contenteditable', null) }).html())
		}

		button.on('click', function () {
			const sel = d3.select(this)
			const dropdown = d3.select(this.nextElementSibling)
			if (dropdown.node() && dropdown.classed('dropdown')) {
				if (dropdown.node().style.maxHeight) {
					dropdown.node().style.maxHeight = null
					dropdown.node().style.overflow = null
					sel.findAncestor('spaces')?.classed('open', false)
					dropdown.findAncestor('li')?.classed('open', false)
				} else {
					// COLLAPSE ALL DROPDOWNS BETWEEN .main AND target
					if (d3.select(this).hasAncestor('dropdown')) {
						const parent_dropdown = d3.select(this).findAncestor('dropdown')
						parent_dropdown.selectAll('.dropdown')
						.each(function () {
							this.style.maxHeight = null
							this.style.overflow = null
							d3.select(this).findAncestor('li')?.classed('open', false)
						})
					}

					dropdown.node().style.maxHeight = `${Math.min(dropdown.node().scrollHeight, 300)}px`
					setTimeout(_ => {
						if (dropdown.select('.dropdown').size() > 0) dropdown.node().style.overflow = 'visible'
						else dropdown.node().style.overflow = 'scroll'
					}, 250)
					sel.findAncestor('spaces')?.classed('open', true)
					dropdown.findAncestor('li')?.classed('open', true)
				}
			}
		})

		window.addEventListener('mouseup', function (e) {
			if (e.target.nodeName !== 'HTML' && !d3.select(e.target).hasAncestor('spaces')) {
				tabs.selectAll('.open').classed('open', false)
				.selectAll('.dropdown')
				.each(function () {
					this.style.maxHeight = null
					this.style.overflow = null
				})
			}
		})
	}

	// MAIN SEARCH BAR INTERACTION
	d3.selectAll('.filter input[type=text]')
	.on('keyup.dropdown', function () {
		const node = this
		const dropdown = d3.select(node).findAncestor('filter').select('.dropdown')
		dropdown.selectAll('menu li')
			.classed('hide', function () {
				return !this.textContent.trim().toLowerCase()
				.includes(node.value.trim().toLowerCase())
			})
	}).on('focus.dropdown', function () {
		const dropdown = d3.select(this).findAncestor('filter').select('.dropdown')
		let { top, height } = this.getBoundingClientRect()
		top = top + height
		const viewheight = window.innerHeight
		if (top + 300 >= viewheight) dropdown.classed('dropup', true)

		const filters = d3.select(this).findAncestor('filters')

		if (dropdown.node()) dropdown.node().style.maxHeight = `${Math.min(dropdown.node().scrollHeight, 300)}px`
		if (filters?.node()) filters.node().style.overflow = 'visible'

		if (mediaSize === 'xs') d3.select(this).findAncestor('filter').classed('expand', true)

		dropdown.selectAll('label, a').on('mousedown', function () {
			d3.event.preventDefault()
			// this.previousElementSibling.setAttribute('checked', '')
		})
	}).on('blur.dropdown', function () {
		const filter = d3.select(this).findAncestor('filter')
		const dropdown = filter.select('.dropdown')
		if (dropdown.node()) dropdown.node().style.maxHeight = null
		if (mediaSize === 'xs') {
			setTimeout(_ => filter.classed('expand', false), 250)
		}
	})

	// PIN ALL SEARCH BAR
	if (object === 'pads') {
		d3.select('#pin-all')
		.on('keydown', function (d) { // EVERYWHERE ELSE THIS IS keyup BUT WE USE keydown HERE TO PREVENT THE FORM FROM FIRING WHEN THE Enter KEY IS PRESSED (TRIGGERED ON keydown)
			const evt = d3.event
			const node = this
			const dropdown = d3.select(node).findAncestor('filter').select('.dropdown')
			dropdown.selectAll('menu li')
				.classed('hide', function () {
					return !this.textContent.trim().toLowerCase()
					.includes(node.value.trim().toLowerCase())
				})

			if (evt.code === 'Enter' || evt.keyCode === 13) {
				evt.preventDefault()
				d3.select('#new-pinboard').node().click()
			}
		}).on('focus', function (d) {
			const filters = d3.select('#search-and-filter')
			const filter = d3.select(this).findAncestor('filter')
			const dropdown = filter.select('.dropdown')
			if (dropdown.node()) dropdown.node().style.maxHeight = `${Math.min(dropdown.node().scrollHeight, 300)}px`
			if (filters.node()) filters.node().style.overflow = 'visible'

			if (mediaSize === 'xs') filter.classed('expand', true)

			dropdown.selectAll('li').on('mousedown', function () {
				d3.event.preventDefault()
			})
		}).on('blur', function () {
			const filters = d3.select('#search-and-filter')
			const filter = d3.select(this).findAncestor('filter')
			const dropdown = filter.select('.dropdown')

			if (dropdown.node()) dropdown.node().style.maxHeight = null
			if (filters.node) filters.node().style.overflow = 'auto'

			fixLabel(this) // THIS IS NOT WORKING

			if (mediaSize === 'xs') {
				setTimeout(_ => filter.classed('expand', false), 250)
			}
		})
		
		d3.select('#new-pinboard')
		.on('click', async function () {
			const node = d3.select('#pin-all').node()

			if (node.value.trim().length) {
				const dropdown = d3.select(node).findAncestor('filter').select('.dropdown')

				const existingBoard = dropdown.selectAll('menu li:not(.hide) .title').filter(function () {
					const match = [...this.childNodes].filter(function (d) {
						return d.nodeType === Node.TEXT_NODE
					}).map(d => d.textContent.trim().toLowerCase()).join(' ')
					return match === node.value.trim().toLowerCase()
				})

				if (existingBoard.node()) { // SIMPLY ADD THE OBJECT TO AN EXISTING BOARD
					pinAll(existingBoard.node().previousElementSibling)
				} else { // CREATE A NEW BOARD AND ADD THE OBJECT TO IT
					// const pads = await getContent({ feature: 'ids', limit: null });

					const reqbody = {
						board_title: node.value.trim(), 
						action: 'insert', 
						object: object.slice(0, -1),
						limit: null,
						space,
						load_object: true
					};

					const url = new URL(window.location)
					const queryparams = new URLSearchParams(url.search)
					queryparams.forEach((value, key) => {
						if (key !== 'page') {
							if (!reqbody[key]) { reqbody[key] = value; }
							else {
								if (!Array.isArray(reqbody[key])) { reqbody[key] = [reqbody[key]]; }
								reqbody[key].push(value);
							}
						}
					});

					const { board_id } = await POST('/pin', reqbody)
					window.location = `./pinned?pinboard=${board_id}`
				}
				// RESET DROPDOWN
				this.value = ''
				dropdown.selectAll('menu li').classed('hide', false)
			}
		})
	}

	// HANDLE LAZY LOADING IF ACTIVATED
	if (load === 'lazy') {
		let lazyloading = false;
		window.onscroll = async function (ev) {
			if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight && !lazyloading) {
				console.log('hit the bottom')
				main.select('.lds-ellipsis').classed('hide', false)

				if (!isNaN(page)) page ++
				lazyloading = true

				const url = new URL(window.location)
				const queryparams = new URLSearchParams(url.search)
				queryparams.set('page', page)

				const response = await GET(`?${queryparams.toString()}`) // NO TARGET NEEDED SINCE SAME AS CURRENT PAGE

				d3.selectAll('section.container div.layout')
				.each(function (d) {
					const section = d3.select(this)
					response.sections.find(s => s.status === d.status).data.forEach(c => section.call(renderVignette, { data: c, display }))
				})

				if (page < pages) lazyloading = false
				else main.select('.lds-ellipsis').classed('hide', true)
			}
		}
	}
})

function openPreview () {
	const url = new URL(window.location)
	const href = url.href.replace('/browse/', '/preview/')
	window.open(href, '_blank')
}
async function setShareOptions (node) {
	const { id, contributors: curr_contributors } = node.dataset || {}
	const contributors = await POST(`/${language}/browse/contributors/invited`, { limit: null })

	const formdata = { action: '/share/pinboard',  method: 'POST' }
	const message = 'Share with contributors' // TO DO: TRANSLATE
	const opts = []

	contributors.data.forEach(d => {
		opts.push({ node: 'input', type: 'checkbox', name: 'contributor', value: d.id, placeholder: d.name, checked: curr_contributors.includes(d.id), default: true })
	})

	const foot = { node: 'button', type: 'submit', name: 'pinboard', value: id, label: 'Share' } // TO DO: TRANSLATE

	const new_constraint = await renderLonglistFormModal({ message, formdata, opts, foot })
}
async function confirmRemoval (action) {
	const sel = d3.select(this)
	const datum = d3.select(this.parentNode).datum()
	const form = this.form
	const flagged = d3.selectAll('article .outer.expand')

	if (flagged.size() === 1) form.submit()
	else {
		let message = ''
		// if (action === 'delete') message = vocabulary['what pads to delete'][language]
		// else if (action === 'unpublish') message = vocabulary['what pads to unpublish'][language]
		
		if (action === 'delete') message = vocabulary['what pads to delete']
		else if (action === 'unpublish') message = vocabulary['what pads to unpublish']

		const opts = [
			{ 
				node: 'button', 
				type: 'button', 
				// label: vocabulary['all selected'][language], 
				label: vocabulary['all selected'], 
				resolve: _ => d3.selectAll('article .outer.expand').data().map(d => d.id) 
			},
			{
				node: 'button',
				type: 'button',
				// label: `${vocabulary['only'][language]} <strong>${datum.title}</strong>`,
				label: `${vocabulary['only']} <strong>${datum.title}</strong>`,
				resolve: [ datum.id ]
			}
		]
		const removal = await renderPromiseModal({ message, opts })

		d3.select(form)
		.addElems('input', 'pad-id', removal)
			.attrs({
				'type': 'hidden',
				'name': 'id',
				'value': d => d
			})
		form.submit()
	}
}
function deleteArticles () {
	const sel = d3.select(this)
	const article = sel.findAncestor('article')
	article.selectAll('button.delete')
		.toggleClass('active')
	const outer = article.select('div.outer').toggleClass('expand')
	outer.select('form.unpublish').classed('hide', true)
	outer.select('form.delete').toggleClass('hide')
}
function unpublishArticles () {
	const sel = d3.select(this)
	const article = sel.findAncestor('article')
	article.selectAll('button.unpublish')
		.toggleClass('active')
	const outer = article.select('div.outer').toggleClass('expand')
	outer.select('form.delete').classed('hide', true)
	outer.select('form.unpublish').toggleClass('hide')
}
// FILTERS MENU
function expandfilters (node) {
	d3.select(node).toggleClass('close')
	const filters = node.form.querySelector('.filters')
	const padding = filters.querySelector('section').getBoundingClientRect().height / 2
	// WE NEED TO MANUALLY ADD THE BOTTOM PADDING BECAUSE IT IS NOT COMPUTED IN THE scrollHeight
	if (filters.style.maxHeight) {
		filters.style.maxHeight = null
		filters.style.overflow = 'hidden'
	} else filters.style.maxHeight = `${filters.scrollHeight + padding}px`
}
function addequivalents (node) {
	const parent = d3.select(node.parentNode)
	parent.selectAll('input[type=hidden]')
		.attr('disabled', node.checked ? null : true)
}
function toggletag (node, d) {
	const sel = d3.select(node)
	const filter = sel.findAncestor('filter')
	let taggroup = d3.select(filter.node().nextElementSibling)

	if (!taggroup.node() || !taggroup.classed('active-filters')) {
		taggroup = d3.select(filter.node().parentNode)
		.insertElem(_ => filter.node().nextElementSibling, 'div', 'active-filters')
	}

	if (node.checked) {
		const tag = taggroup.addElem('div', 'tag')
		.attr('data-id', d.id)
		tag.addElems('label', 'name')
		// .attr('title', Number.isInteger(d.name) ? d.name : (d.name?.capitalize() || vocabulary['unknown'][language]))
		.attr('title', Number.isInteger(d.name) ? d.name : (d.name?.capitalize() || vocabulary['unknown']))
		.html(_ => {
			if (Number.isInteger(d.name)) return d.name
			else if (d.name) {
				if (d.name.length > 15) return `${d.name.slice(0, 15).capitalize()}…`
				else return d.name.capitalize()
			// } else return vocabulary['unknown'][language]
			} else return vocabulary['unknown']
		})
		tag.addElems('label', 'close')
		.on('click', function () { rmtag(this, d) })
	} else {
		taggroup.selectAll(`.tag[data-id="${d.id}"]`).remove()
		if (taggroup.selectAll('.tag').size() === 0) taggroup.remove()
	}
}
function rmtag (node, d) {
	const sel = d3.select(node)
	const tag = sel.findAncestor('tag')
	const taggroup = tag.findAncestor('active-filters')
	const filter = d3.select(taggroup.node().previousElementSibling)
	const input = filter.selectAll('input').filter(function () { return this.value.toString() === d.id.toString() }).node()
	input.checked = false
	toggletag(input, d)
}
async function pinAll (node) {
	const object = d3.select('data[name="object"]').node().value
	const space = d3.select('data[name="space"]').node().value

	node.checked = true
	const id = node.value

	const reqbody = {
		board_id: id,
		action: 'insert', 
		object: object.slice(0, -1),
		limit: null,
		space,
		load_object: true
	}

	const url = new URL(window.location)
	const queryparams = new URLSearchParams(url.search)
	queryparams.forEach((value, key) => {
		if (key !== 'page') {
			if (!reqbody[key]) { reqbody[key] = value; }
			else {
				if (!Array.isArray(reqbody[key])) { reqbody[key] = [reqbody[key]]; }
				reqbody[key].push(value);
			}
		}
	});

	// TO DO: THIS COULD BE IMPROVED HERE AND IN THE BACKEND TO USE full_filters INSTEAD OF PASSING BACK AND FORTH THE FULL LIST OF PAD IDs
	// await POST('/pin', { 
	// 	board_id: id, 
	// 	object_id: <%- JSON.stringify(locals.pads) %>, 
	// 	action: 'insert', 
	// 	object: object.slice(0, -1)
	// })

	console.log(reqbody)

	await POST('/pin', reqbody)
	location.reload()
}
