window.addEventListener('load', function () {
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
})

// INSPIRED BY https://stackoverflow.com/questions/995168/textarea-to-resize-based-on-content-length
function changeLabel (node, focus) {
	for (let label of node.labels) {
		const sel = d3.select(label)
		const username = d3.select('data[name="username"]').node()?.value
		if (focus || node.value.trim().length > 0) sel.html(username)
		else sel.html(vocabulary['comment publicly'][language])
	}
}

function adjustarea(node) {
	node.style.height = `${ node.scrollHeight - 20 }px` // WE HAVE A 2x10px PADDING IN THE CSS
	const submit = d3.select(node.parentNode).select('button[type=submit]').node()
	submit.disabled = node.value.trim().length === 0
}
d3.selectAll('footer textarea').each(function () { adjustarea(this) })

d3.selectAll('.expand-collapsed').on('click', function () {
	const collapsed = this.nextElementSibling
	if (collapsed.classList.contains('collapsed')) collapsed.style.maxHeight = `${collapsed.scrollHeight}px`
	d3.select(this.remove())
})