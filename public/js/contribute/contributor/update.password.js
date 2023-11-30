// TO DO: DEPRECATE THIS IN FAVOR OF reset-password (WITH OTP)

d3.select('button#reset-password')
.on('click', function () {
	d3.select('.old-password-info')
		.style('max-height', function () { return `${this.scrollHeight}px` })
	.selectAll('input[type=password]')
		.each(function () { this.required = true })

	d3.select('.meta-status button').attr('disabled', true)

	d3.select(this).remove()
})

d3.select('input#old-password')
.on('keydown', function () {
	const evt = d3.event
	if (evt.code === 'Enter' || evt.keyCode === 13) {
		evt.preventDefault()
	}
}).on('keyup', function () {
	const evt = d3.event
	if (evt.code === 'Enter' || evt.keyCode === 13) {
		evt.preventDefault()
		d3.select('button#check-old-password').node().click()
	}
})

d3.select('button#check-old-password')
.on('click', async function () {
	const pwsel = d3.select('input#old-password')
	const pw = pwsel.node().value.trim()
	pwsel.classed('error', pw.length === 0)

	if (!pwsel.classed('error')) {
		const id = d3.select('data[name="id"]').node()?.value || null
		if (id) {
			const cleared = await POST('/check/password', { id, password: pw })
			if (cleared.status === 200) {
				d3.select('.password-info')
					.style('max-height', function () { return `${this.scrollHeight}px` })
				.selectAll('input[type=password]')
					.each(function () { this.required = true })

				d3.select('.old-password-info').remove()
			} else {
				pwsel.classed('error', true)
				alert(cleared.message)
			}
		}
	}
})