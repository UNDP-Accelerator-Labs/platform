window.addEventListener('load', function () {
	if (!mediaSize) var mediaSize = getMediaSize()	

	initWidgetInteractions()

	// SET UP OPTIONS FOR sm DISPLAYS
	if (mediaSize === 'xs') {
		d3.select('button.input-toolbox')
		.on('touchend, click', function () {
			d3.select(this).toggleClass('highlight')
			d3.select('.media-input-group').node().focus()
		})
		d3.select('.media-input-group').on('touchend', function () { this.focus() })
		.on('focus', function () {
			if (this.style.maxHeight) this.style.maxHeight = null
			else this.style.maxHeight = `${Math.min(this.scrollHeight, screen.height * .75)}px`
		}).on('blur', function () {
			 this.style.maxHeight = null
			 d3.select('button.input-toolbox').classed('highlight', false)
		})
	}
})