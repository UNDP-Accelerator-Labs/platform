if (!mediaSize) var mediaSize = getMediaSize()

function openPreview () {
	const url = new URL(window.location)
	const href = url.href.replace('/browse/', '/preview/')
	window.open(href, '_blank')
}

async function setShareOptions (node) {
	const { id, contributors: curr_contributors } = node.dataset || {}
	console.log(curr_contributors)
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


window.addEventListener('load', function () {
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
	}).on('blur', function () {
		partialSave('pinboard', this.dataset.id)
	})

	d3.select('div#pinboard-description')
	.on('blur', function () {
		partialSave('pinboard', this.dataset.id)
	})

	d3.select('div#pinboard-section-description')
	.on('blur', function () {
		partialSave('section-description', this.dataset.id)
	})

	// REPRINT STATTUS TOGGLES IN FILTERS MENU IF sm DISPLY
	if (mediaSize === 'xs') {
		const status_toggles = d3.select('#search-and-filter form .status').node()
		const parent = d3.select('#search-and-filter form .filters').node()
		parent.appendChild(status_toggles)
	}

	// HANDLE TABS DROPDOWNS FOR SMALL DISPLAYS
	if (!mediaSize) var mediaSize = getMediaSize()
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
})