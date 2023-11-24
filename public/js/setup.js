if (!mediaSize) var mediaSize = getMediaSize()
window.addEventListener('load', function () {
	/* SET PATHS
	NOT language NEEDS TO BE SET AS A GLOBAL VAR IN THE MAIN ejs FILE */
	const url = new URL(window.location);
	let pathname = url.pathname.substring(1);
	if (pathname.split('/').length > 1) { pathname = `${pathname.split('/').slice(1).join('/')}${url.search}`; };
	languages.forEach(d => {
		d3.select(`#lang-${d.language} a`).attr('href', `/${d.language}/${pathname}`);
	});

	// EXPAND NAVIGATION ON SMALL DISPLAYS
	d3.select('button#expand-nav')
	.on('click', function () {
		d3.select(this).toggleClass('close');
		d3.select('header').toggleClass('open');
	});

	// SET NAVIGATION LINKS FOR TABS
	d3.selectAll('nav.tabs menu li a')
	.on('click', function () {
		if (this.dataset.redirect) {
			return redirect(this.dataset.redirect)
		} else return false
	})

	// GENERIC BLUR FUNCTION
	const inputs = d3.selectAll('input[type=text], input[type=password]')
	inputs.on('blur.fixlabel', function () {
		fixLabel(this)
	}).each(function () { fixLabel(this) });

	// ENABLE THE SCROLL DOWN SUGGESTED INTERACTIVITY
	d3.select('button.scroll-nav')
	.on('click', function () {
		const target = d3.select('.scroll-target').node()
		scrollToPad(target)
	});

	// TOGGLE OPTIONS
	d3.selectAll('input.toggle')
	.on('change', function () {
		toggleOptions(this)
	})

	// ENSURE FOCUS ON contentEditable
	d3.selectAll('div[contenteditable="true"], div[contenteditable]')
	.on('focus.setfocus', function () {
		d3.select(this).classed('focus', true)
	}).on('blur.unsetfocus', function () {
		d3.select(this).classed('focus', false)
	})

	// ENABLE EXPANSION OF STATISTICS IN sm VIEWS
	if (mediaSize === 'xs') {
		d3.select('button#expand-statistics')
		.on('click', function () {
			expandstats(this)
		})
	}
	// INITIALIZE FILTER TAGS
	d3.selectAll('div#filters div.search-filters div.tag label.close')
	.on('click', function () {
		const sel = d3.select(this)
		const tag = sel.findAncestor('tag')
		const data_value = tag.attr('data-value')

		const filter_form = d3.select('nav#search-and-filter')
		filter_form.select('input#search-field').node().value = null

		filter_form.select('form').node().submit()
	})
	d3.selectAll('div#filters div.filters-group:not(.search-filters) div.tag label.close')
	.on('click', function () {
		const sel = d3.select(this)
		const tag = sel.findAncestor('tag')
		const data_type = tag.attr('data-type')
		const data_value = tag.attr('data-value')

		const filter_form = d3.select('nav#search-and-filter')
		const filter = filter_form.selectAll('input[type=checkbox]').filter(function () {
			return d3.select(this).attr('name') === data_type && this.value === data_value
		}).node()
		filter.checked = false
		if (d3.select(filter.parentNode).selectAll('input[type=hidden]:not(:disabled)').size()) {
			d3.select(filter.parentNode).selectAll('input[type=hidden]:not(:disabled)').attr('disabled', true)
		}

		filter_form.select('form').node().submit()
	})
});
window.addEventListener('scroll', function () {
	d3.select('button.scroll-nav').classed('hide', document.documentElement.scrollTop > 60)
});


function scrollToPad (target) {
	window.scrollTo({
		top: target.offsetTop - 60, // THIS WAS 120 IN CONTRIBUTE PAD
		left: 0,
		behavior: 'smooth'
	})
};

function redirect (location) {
	const url = new URL(window.location)
	const queryparams = new URLSearchParams(url.search)
	// const filter_keys = <%- JSON.stringify(Object.keys(query)?.filter(key => !['status'].includes(key))) %>

	// filter_keys.push('search')
	// for (const key of queryparams.keys()) {
	// 	if (!filter_keys.includes(key)) queryparams.delete(key)
	// }
	// return window.location = `${location}?${queryparams.toString()}`

	queryparams.delete('status')
	
	return window.location = `${location}?${queryparams.toString()}`
};

function checkForEnter (evt, node) {
	if (evt.code === 'Enter' || evt.keyCode === 13) {
		evt.preventDefault()
		node.blur()
	}
};

function toggleOptions (node) {
	const { object } = node.dataset || {}
	
	for (const label of node.labels) {
		d3.select(label).attr('data-content', node.checked ? vocabulary['yes'][language] : vocabulary['no'][language])
	}

	if (object === 'pinboard') {
		// IF slideshow THEN PREVENT OTHERS
		const sel = d3.select(node)
		const menu = sel.findAncestor('menu')
		const parent = sel.findAncestor('li')
		if (node.name === 'slideshow') {
			menu.selectAll('li')
			.each(function () {
				const sel = d3.select(this)
				sel.select('p').classed('disabled', function () {
					return this.parentNode !== parent.node() && node.checked
				})
				sel.selectAll('input[type=checkbox]').each(function () {
					this.disabled = this.parentNode !== parent.node() && node.checked
				})
			})
		}
		// IF map THEN ENABLE fullscreen OPTION
		if (node.name === 'display_map') {
			menu.selectAll('li')
			.each(function () {
				const sel = d3.select(this)
				sel.select('p').classed('disabled', function () {
					return this.parentNode !== parent.node() && this.nextElementSibling.name !== 'display_filters' && node.checked
				})
				sel.selectAll('input[type=checkbox]').each(function () {
					this.disabled = this.parentNode !== parent.node() && this.name !== 'display_filters' && node.checked
				})
			})
			const subnode = d3.select('input#display-fullscreen').node()
			subnode.disabled = !node.checked
			d3.select(subnode).findAncestor('li').select('p').classed('disabled', !node.checked)
		}
		partialSave('pinboard', node.dataset.id)
	} else if (object === 'contributor') {
		partialSave()
	}
}

// THIS ONLY ACCOUNTS FOR USE IN browse/index.ejs FOR NOW
async function partialSave (object, id) {
	if (!object) object = 'pinboard'

	if (object === 'pinboard') {
		let title = d3.select('main .inner .head .title').node().innerText.trim()
		if (title) title = limitLength(title, 99);
		const description = d3.select('main .inner .head .description.lead').node().innerHTML.trim()
		const displayopts = {}

		d3.selectAll('#pinboard-display-opts input[type=checkbox]')
		.each(function () {
			displayopts[this.name] = this.checked
		})

		const res = await POST('/save/pinboard', Object.assign(displayopts, { id, title, description }))
		if (res.status === 200) {
			console.log('saved')
			const { datum } = res
			updateTab(datum.title)

			// TO DO: UPDATE THIS TO USE THE RENDER FUNCTIONS BELOW
			// d3.selectAll('.pin, .pinboard').html(d => d.title = datum.title)
			d3.selectAll('.pin label.name').html(d => d.title = datum.title)
		}
	} else if (object.includes('section')) {
		console.log('save section')

		const li = d3.select('.pinboard-sections li.editing')

		const obj = {}
		obj.id = id

		if (object === 'section-title') {
			obj.title = li.select('button div.section-title').node()?.innerText.trim() || ''
		} else if (object === 'section-description') {
			obj.description = d3.select('div.pinboard-sections-container div.description').node()?.innerText.trim() || ''
		}

		const res = await POST('/save/pinboard-section', obj)
		if (res.status === 200) {
			console.log('saved')

			if (li.node()) {
				li.classed('editing', false)
				li.select('div').classed('focus', false)
				const a = li.select('a')

				if (a.node()) {
					const href = a.attr('data-href')
					a.attrs({
						'href': href,
						'data-href': null
					})
					li.select('button div.section-title').node().contentEditable = false
				}

			}
		}
	}
};

function updateTab (value) {
	const input = d3.select(`.${mediaSize} input[type=text]#pinboards`).node()
	if (input) {
		if (value.length > 25) value = `${value.slice(0, 25)}…`
		input.value = value
		fixLabel(input)
	}
};

function expandstats (node) {
	const sel = d3.select(node)
	const statistics = d3.select(sel.findAncestor('stat-group').node().parentNode)
	
	d3.select('.screen').classed('hide', false)
	statistics.classed('expand', true)
	.addElems('button', 'close inlaid')
	.on('click', function () {
		d3.select(this.parentNode).classed('expand', false)
		d3.select('.screen').classed('hide', true)
		d3.select(this).remove()

	}).html('<%- vocabulary["close"][language] %>')
}

const dateOptions = {
	weekday: undefined,
	year: 'numeric',
	month: 'long',
	day: 'numeric',
};