window.addEventListener('load', function () {
	if (!mediaSize) var mediaSize = getMediaSize()
	// THIS IS FOR MOBILE DISPLAY
	if (['xs', 'sm', 'm'].includes(mediaSize)) {
		d3.select('.create').selectAll('button')
		.on('click', function () {
			const dropdown = d3.select(this.nextElementSibling)
			if (dropdown.node() && dropdown.classed('dropdown')) {
				let { top, height } = this.getBoundingClientRect()
				top = top + height
				const viewheight = window.innerHeight
				if (!mediaSize) var mediaSize = getMediaSize()
				if (mediaSize === 'xs' && top + 300 >= viewheight) dropdown.classed('dropup', true)

				if (dropdown.node().style.maxHeight) {
					dropdown.node().style.maxHeight = null
					dropdown.node().style.overflow = null
					d3.select('#site-title .inner .create').classed('open', false)
					dropdown.findAncestor('li').classed('open', false)
				} else {
					// COLLAPSE ALL DROPDOWNS BETWEEN .main AND target
					if (d3.select(this).hasAncestor('dropdown')) {
						const parent_dropdown = d3.select(this).findAncestor('dropdown')
						parent_dropdown.selectAll('.dropdown')
						.each(function () {
							this.style.maxHeight = null
							this.style.overflow = null
							d3.select(this).findAncestor('li').classed('open', false)
						})
					}

					dropdown.node().style.maxHeight = `${Math.min(dropdown.node().scrollHeight, 300)}px`
					setTimeout(_ => {
						if (dropdown.select('.dropdown').size() > 0) dropdown.node().style.overflow = 'visible'
						else dropdown.node().style.overflow = 'scroll'
					}, 250)
					d3.select('#site-title .inner .create').classed('open', true)
					dropdown.findAncestor('li')?.classed('open', true)
				}
			}
		})
		
		window.addEventListener('mouseup', function (e) {
			if (e.target.nodeName !== 'HTML' && !d3.select(e.target).hasAncestor('create')) {
				d3.selectAll('#site-title .inner .open').classed('open', false)
				.selectAll('.dropdown')
				.each(function () {
					this.style.maxHeight = null
					this.style.overflow = null
				})
			}
		})

	} else if (['lg', 'xl', 'xxl'].includes(mediaSize)) {
		d3.selectAll('#site-title .inner .create button')
		.on('click', function () {
			if (this.nextElementSibling?.classList.contains('dropdown')) {
				if (d3.select(this).hasAncestor('dropdown')) {
					const dropdown = d3.select(this).findAncestor('dropdown')
					dropdown.selectAll('li').classed('open', false)
					if (dropdown.hasAncestor('li')) {
						dropdown.findAncestor('li').classed('open', true)
					}
				}
				d3.select('#site-title .inner .create').classed('open', true)
				d3.select(this.parentNode).classed('open', true)
			}
		})
		window.addEventListener('mouseup', function (e) {
			if (e.target.nodeName !== 'HTML' && !d3.select(e.target).hasAncestor('create')) d3.selectAll('#site-title .inner .open').classed('open', false)
		})
	}
});

function filterDropdown (node) {
	const dropdown = d3.select(node).findAncestor('dropdown')
	dropdown.selectAll('ul li:not(.filter):not(.padding)')
		.classed('hide', function () {
			return !this.textContent.trim().toLowerCase().includes(node.value.trim().toLowerCase())
		})
}