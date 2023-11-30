if (!mediaSize) var mediaSize = getMediaSize()
window.addEventListener('load', async function () {
	/* SET PATHS
	NOT language NEEDS TO BE SET AS A GLOBAL VAR IN THE MAIN ejs FILE */
	const url = new URL(window.location);
	let pathname = url.pathname.substring(1);
	if (pathname.split('/').length > 1) { 
		pathname = `${pathname.split('/').slice(1).join('/')}${url.search}`; 
	};
	const { languages } = await POST('/load/metadata', { feature: 'languages' })
	languages.forEach(d => {
		d3.select(`#lang-${d} a`).attr('href', `/${d}/${pathname}`);
	});

	// SET NAVIGATION LINKS FOR TABS
	// d3.selectAll('nav.tabs menu li a')
	// .on('click', function () {
	// 	if (this.dataset.redirect) {
	// 		return redirect(this.dataset.redirect)
	// 	} else return false
	// })

	// GENERIC BLUR FUNCTION
	const inputs = d3.selectAll('input[type=text]:not([name="api-token"]), input[type=password], input[type=email]')
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
function updateTab (value) { // TO DO: THIS IS NOT WORKING FOR SOME REASON WHEN SAVING A PINBOARD TITLE
	const input = d3.select(`nav.tabs input[type=text]#pinboards`)
	if (input.node()) {
		if (value.length > 20) { value = `${value.slice(0, 20)}…` }
		input.attr('value', value)
		// fixLabel(input)
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
};

async function renderCarousel () {
	const page = JSON.parse(d3.select('data[name="page"]').node().value)

	const container = d3.select('.slides')
	const panel = container.findAncestor('panel')
	const dots = panel.select('.dots')
	
	let slides = await getContent({ feature: 'samples' })
	if (!slides.length) return panel.remove()

	const slide = container.addElems('div', 'slide', slides)
	.addElems('a')
		.attr('href', d => `/${language}/view/pad?id=${d.id}`)
	const txt = slide.addElems('div', 'media media-txt')
	txt.addElems('p', 'country')
		.html(d => d.country)
	txt.addElems('h1', 'title')
		.html(d => d.title)
	txt.addElems('p', 'snippet')
		.html(d => {
			if (d.txt?.[0]?.length > 500) { 
				return `${d.txt?.[0].slice(0, 500)?.replace(/<\/?[^>]+(>|$)/ig, '').trim()}…`
			} else { 
				return d.txt?.[0]?.replace(/<\/?[^>]+(>|$)/ig, '').trim()
			}
		})
	slide.addElems('img')
		.attr('src', d => {
			if (d3.select('data[name="app_storage"]').node()) {
				const app_storage = d3.select('data[name="app_storage"]').node().value
				return new URL(`${app_storage}${d.img[0]?.replace('uploads/sm/', 'uploads/')}`).href
			} else {
				return d.img[0]?.replace('uploads/sm/', 'uploads/')
			}
		})

	dots.addElems('div', 'dot', slides)

	animateCarousel(0);
}
function animateCarousel (idx) {
	const carousel = d3.select('.carousel')
	const deck = carousel.select('.slides')
	const slides = carousel.selectAll('.slide')
	const delay = 3000

	if (idx === slides.size()) idx = 0
	deck.node().scrollTo({
		top: 0,
		left: idx * (slides.node().clientWidth || slides.node().offsetWidth || slides.node().scrollWidth),
		behavior: 'smooth'
	})
	slides.selectAll('.media-txt')
	.on('mouseover', _ => clearTimeout(animation))
	.on('mouseout', _ => animation = setTimeout(_ => animateCarousel(idx + 1), delay))
	carousel.selectAll('.dot')
	.classed('highlight', (d, i) => i === idx)
	.on('click', function (d, i) {
		idx = i
		clearTimeout(animation)
		animateCarousel(idx)
	})

	let animation = setTimeout(_ => animateCarousel(idx + 1), delay)
};
async function renderMosaic () {
	const page = JSON.parse(d3.select('data[name="page"]').node().value)

	const container = d3.select('.slides')
	const panel = container.findAncestor('panel')
	
	let slides = await getContent({ feature: 'samples' })
	if (!slides.length) return panel.remove()

	// TO DO: LOAD MOSAIC DATA DYNAMICALLY HERE
	if (!mediaSize) var mediaSize = getMediaSize()
	if (mediaSize === 'xs') slides = slides.slice(0, 11)
	else if (mediaSize === 'sm') slides = slides.slice(0, 21)
	else if (mediaSize === 'm') slides = slides.slice(0, 26)
	else if (mediaSize === 'lg') {
		if (page.type === 'private') { 
			slides = slides.slice(0, 30)
		} else {
			slides = slides.slice(0, 33)
		}
	} else {
		if (page.type === 'private') { 
			slides = slides.slice(0, 40)
		}
	}

	const vignette = container.addElems('div', 'slide', slides)
	.addElems('a')
		.attr('href', d => `/${language}/view/pad?id=${d.id}`)
	const txt = vignette.addElems('div', 'media media-txt')
	txt.addElems('p', 'country')
		.html(d => d.country)
	txt.addElems('h1')
		.html(d => {
			if (d.title?.length > 50) return d.title?.slice(0, 50).trim()
			else return d.title
		})
	vignette.addElems('img')
		.attr('src', d => {
			if (d3.select('data[name="app_storage"]').node()) {
				const app_storage = d3.select('data[name="app_storage"]').node().value
				return new URL(`${app_storage}${d.img[0]}`).href
			} else {
				return d.img[0]
			}
		})

	window.onresize = (evt) => {
		renderMosaic()
	};
};
function filterDropdown (node) {
	const dropdown = d3.select(node).findAncestor('dropdown')
	dropdown.selectAll('ul li:not(.filter):not(.padding)')
		.classed('hide', function () {
			return !this.textContent.trim().toLowerCase().includes(node.value.trim().toLowerCase())
		});
};