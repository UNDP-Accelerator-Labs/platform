export function initSlideshowNavigation () {
	window.addEventListener('keydown', function (e) {
		// SET THE LEFT/RIGHT KEYBOARD NAVIGATION IF IN SLIDESHOW DISPLAY
		if (document.activeElement === document.body) { // NOTHING IS IN FOCUS/ BEING EDITED
			if (e.key === 'ArrrowRight' || e.keyCode === 39) {
				d3.select('button.slide-nav.next:not(.hide)').node()?.click()
			}
			if (e.key === 'ArrowLeft' || e.keyCode === 37) {
				d3.select('button.slide-nav.prev:not(.hide)').node()?.click()
			}
		}
	})
	window.addEventListener('keyup', function (e) {
		e = e || event
		if (e.key === 'Escape' || e.keyCode === 27) {
			const url = new URL(window.location)
			const queryparams = new URLSearchParams(url.search)
			queryparams.delete('display')
			window.location = `${url.pathname}?${queryparams.toString()}`
		}
	})
}