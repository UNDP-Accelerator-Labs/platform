import { fixLabel } from '/js/main.js'
import { changeLabel, adjustarea } from '/js/contribute/comment/main.js'

function DOMLoad () {
	d3.selectAll('textarea[name="message"]')
	.on('focus', function () {
		changeLabel(this, true)
	}).on('keyup', function () {
		adjustarea(this)
	}).on('change', function () {
		fixLabel(this)
	}).on('blur', function () {
		changeLabel(this, false)
	})

	d3.selectAll('footer textarea').each(function () { adjustarea(this) })

	d3.selectAll('.expand-collapsed').on('click', function () {
		const collapsed = this.nextElementSibling
		if (collapsed.classList.contains('collapsed')) collapsed.style.maxHeight = `${collapsed.scrollHeight}px`
		d3.select(this.remove())
	})
}

if (document.readyState === 'loading') {
	window.addEventListener('DOMContentLoaded', DOMLoad)
} else {
	DOMLoad()
}