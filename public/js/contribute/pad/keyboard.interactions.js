let keyTrack = []
window.addEventListener('keydown', async function (e) {
	e = e || event
	keyTrack.push(e.keyCode)
	
	const { display, activity } = JSON.parse(d3.select('data[name="page"]').node()?.value)
	const editing = activity === 'edit'
	const pad = JSON.parse(d3.select('data[name="pad"]').node()?.value)
	
	const main = d3.select('#pad')
	const head = main.select('.head')
	const footer = d3.select('footer')

	if (editing) {
		// SHIFT + ENTER LEAVES THE FOCUSED CELL
		if (keyTrack.includes(16) && e.keyCode === 13
			&& (main.selectAll('.media-container.focus, .meta-container.focus').size())
		) {
			e.preventDefault()
			main.selectAll('.media-container, .meta-container').classed('focus', false)
				.selectAll('.media-txt, .media-embed, .media-checklist .list-item, .media-radiolist .list-item')
			.each(function () { this.blur() })
			main.selectAll('.media-container .inset, .meta-container .inset').style('max-height', null)
			await autofillTitle()
		}
		// PROVIDE HIGHLIGHT FEEDBACK
		if (
			![d3.selectAll('header input[type=text]').nodes(), head.selectAll('div.title').nodes(), main.selectAll('.section-header h1').nodes(), main.selectAll('input[type=text], input[type=number]').nodes(), footer.selectAll('textarea').nodes()].flat().includes(document.activeElement)
			&& !(main.selectAll('.layout.focus *:focus').size())
			&& !(main.selectAll('.media-container.focus, .meta-container.focus').size() ||
				main.selectAll('.media-container *:focus, .meta-container *:focus').size())
			&& !d3.select('.modal').node()
			&& pad.type === 'blank'
		) {
			if (e.key === 'i' || e.keyCode === 73) main.select('label[for=input-media-img]').classed('highlight', true)
			if (e.key === 'd' || e.keyCode === 68) main.select('label[for=input-media-drawing]').classed('highlight', true)
			if (e.key === 't' || e.keyCode === 84) main.select('label[for=input-media-txt]').classed('highlight', true)
			if (e.key === 'l' || e.keyCode === 76) main.select('label[for=input-media-checklist]').classed('highlight', true)
			if (e.key === 'r' || e.keyCode === 82) main.select('label[for=input-media-radiolist]').classed('highlight', true)
			if (e.key === 'v' || e.keyCode === 86) main.select('label[for=input-media-video]').classed('highlight', true)
			if (e.key === 'e' || e.keyCode === 69) main.select('label[for=input-media-embed]').classed('highlight', true)
		}
	}
	// SET THE LEFT/RIGHT KEYBOARD NAVIGATION IF IN SLIDESHOW DISPLAY
	if (display === 'slideshow') {
		if (document.activeElement === document.body) { // NOTHING IS IN FOCUS/ BEING EDITED
			if (e.key === 'ArrrowRight' || e.keyCode === 39) {
				d3.select('button.slide-nav.next:not(.hide)').node()?.click()
			}
			if (e.key === 'ArrowLeft' || e.keyCode === 37) {
				d3.select('button.slide-nav.prev:not(.hide)').node()?.click()
			}
		}
	}
})
window.addEventListener('keyup', function (e) {
	e = e || event
	const page = JSON.parse(d3.select('data[name="page"]').node()?.value)
	const editing = page.activity === 'edit'
	const pad = JSON.parse(d3.select('data[name="pad"]').node()?.value)
	
	const main = d3.select('#pad')
	const head = main.select('.head')
	const footer = d3.select('footer')

	if (editing) {
		if (
			![d3.selectAll('header input[type=text]').nodes(), head.selectAll('div.title').nodes(), main.selectAll('.section-header h1').nodes(), main.selectAll('input[type=text], input[type=number]').nodes(), footer.selectAll('textarea').nodes()].flat().includes(document.activeElement)
			&& !(main.selectAll('.layout.focus *:focus').size())
			&& !(main.selectAll('.media-container.focus, .meta-container.focus').size() ||
				main.selectAll('.media-container *:focus, .meta-container *:focus').size())
			&& !d3.select('.modal').node()
			&& pad.type === 'blank'
		) {
			if (pad.type === 'blank') { // THIS IS REDUNDANT
				if (e.key === 'i' || e.keyCode === 73) {
					main.select('label[for=input-media-img]').classed('highlight', false)
					d3.select('#input-media-img').node().click()
				}
				if (e.key === 'v' || e.keyCode === 86) {
					main.select('label[for=input-media-video]').classed('highlight', false)
					d3.select('#input-media-video').node().click()
				}
				if (e.key === 'd' || e.keyCode === 68) {
					main.select('label[for=input-media-drawing]').classed('highlight', false)
					d3.select('#input-media-drawing').node().click()
				}
				if (e.key === 't' || e.keyCode === 84) {
					main.select('label[for=input-media-txt]').classed('highlight', false)
					d3.select('#input-media-txt').node().click()
				}
				if (e.key === 'e' || e.keyCode === 69) {
					main.select('label[for=input-media-embed]').classed('highlight', false)
					d3.select('#input-media-embed').node().click()
				}
				if (e.key === 'l' || e.keyCode === 76) {
					main.select('label[for=input-media-checklist]').classed('highlight', false)
					d3.select('#input-media-checklist').node().click()
				}
				if (e.key === 'r' || e.keyCode === 82) {
					main.select('label[for=input-media-radiolist]').classed('highlight', false)
					d3.select('#input-media-radiolist').node().click()
				}
			}
		} else {
			if ((d3.select(e.srcElement).classed('media')
					|| d3.select(e.srcElement).classed('meta')
					|| d3.select(e.srcElement).classed('title')
				) && !(
				[e.srcElement.nodeName, e.srcElement.tagName].map(d => d.toLowerCase()).includes('input')
				&& (
					d3.select(e.srcElement).findAncestor('search')?.node()
					|| d3.select(e.srcElement).findAncestor('filter-or-add')?.node()
					)
				)
			) {
				if (editing) {
					if (page.type === 'private') switchButtons(language)
					else window.sessionStorage.setItem('changed-content', true)
				}
				// THIS PICKS UP ON KEYSTROKES IN media OR meta OUTSIDE OF INPUT FIELDS
			}
		}
	}

	keyTrack = keyTrack.filter(d => d !== e.keyCode)
})
window.addEventListener('mouseup', async function (e) {
	e = e || event
	const page = JSON.parse(d3.select('data[name="page"]').node()?.value)
	const editing = page.activity === 'edit'
	const main = d3.select('#pad')

	if (editing) {
		const focused_node = d3.select('.focus')
		const target = d3.select(e.target)
		const media = target.findAncestor('media')
		const meta = target.findAncestor('meta')
		const section = target.findAncestor('layout')
		const inputgroup = target.findAncestor('input-group')
		if (!inputgroup) {
			main.selectAll('.layout').filter(function () { return section ? this !== section.node() : true })
				.classed('focus', false)
		}
		const containers = main.selectAll('.media-container, .meta-container')
			.filter(function () {
				if (media) return this !== media.node()
				else if (meta) return this !== meta.node()
				else if (d3.select(this).classed('group-container focus') && inputgroup) return false
				else return true
			})
		containers.classed('focus', false)
			.selectAll('.inset')
			.style('max-height', null)
		d3.selectAll('.media-input-group label, .meta-input-group label').classed('highlight', false)

		if (focused_node.node() && focused_node.classed('title')) {
			if (!document.activeElement.classList.contains('title')) {
				focused_node.classed('focus', false)
			}
		} else {
			await autofillTitle()
		}
	}
})