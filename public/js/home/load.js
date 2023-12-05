import { renderCarousel, renderMosaic } from '/js/home/render.js'
import { clearExploration } from '/js/home/exploration.js'

async function DOMLoad () {
	const { display } = d3.select('.slides').node().dataset
	if (display === 'carousel') { await renderCarousel(); }
	else if (display === 'mosaic') { await renderMosaic(); }

	clearExploration()
}

if (document.readyState === 'loading') {
	window.addEventListener('DOMContentLoaded', DOMLoad)
} else {
	DOMLoad()
}