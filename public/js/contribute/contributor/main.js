async function requestToken (node) {
	const token = await POST('/request/token')
	if (token) {
		const inputgroup = d3.select(node)
		inputgroup.selectAll('.hide')
			.classed('hide', false)
		const input = inputgroup.select('input[type=text]')
			.attr('value', token)
		input.node().select()
	}
}
function copyToken (node) {
	const inputgroup = d3.select(node)
	const token = inputgroup.select('input[type=text]').node().value
	navigator.clipboard.writeText(token)
}