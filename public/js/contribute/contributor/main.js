window.addEventListener('load', function () {
	d3.selectAll('input[type=password]') // IT IS IMPORTANT THAT THIS COMES BEFORE THE NEXT GENERIC BLUR FUNCTION
	.on('blur.confirm', function () {
		const node = this
		const sel = d3.select(this)
		const inputgroup = d3.select(this.parentNode)
		const confirm = d3.selectAll('input[type=password]').filter(function () { return this !== node })
		if (checkPassword(this.value)?.length && this.name !== 'confirm_password') {
			sel.classed('error', true)
			inputgroup.addElems('p', 'errormessage', checkPassword(this.value))
				.html(d => d)
		} else {
			d3.selectAll('input[type=password]').classed('error', this.value !== confirm.node().value)
			inputgroup.selectAll('p.errormessage').remove()
		}
	})

	// GENERIC BLUR FUNCTION
	d3.selectAll('input[type=text]:not([name="api-token"]), input[type=email], input[type=password]')
	.on('blur.save', function () {
		partialSave()
	})
})

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

function addLanguage (node) {
	// THEN SET UP MECHANISM IN BACKEND TO ALLOW MULTIPLE LANGUAGES
	// THEN USE THAT MECHANISM WHEN LOOKING FOR REVIEWERS
	const sel = d3.select(node)
	const parent = sel.findAncestor('ul')
	const li = parent.insertElem(function () { return node }, 'li')
	li.addElem('label', 'instruction')
		.html(vocabulary['other languages'][language])
	const input = li.addElem('div', 'select')
	input.addElem('input')
		.attrs({
			'type': 'text',
			'id': 'secondary-languages',
			'autocomplete': 'secondary-languages'
		})
	input.addElem('label')
		.attr('for', 'secondary-languages')
		.html(vocabulary['select language'][language]['plural'])
	const dropdown = input.addElem('div', 'dropdown')
		.addElem('menu')
		.addElems('li', null, languages)
		.each(function () {
			const sel = d3.select(this)
			sel.addElems('input')
				.attrs({
					'type': 'checkbox',
					'id': d => `secondary-language-${d.language}`,
					'name': 'secondary_languages', // TO DO: PROBABLY CHANGE THIS SO NO CONFLICT WITH OTHER language INPUTS
					'value': d => d.language,
					'data-label': d => d.name.capitalize(),
					'disabled': d => d.language === d3.select('input[name="language"]:checked').node()?.value ? true : null
				})
			sel.addElems('label')
				.attr('for', d => `secondary-language-${d.language}`)
				.html(d => d.name.capitalize())
		})

	initBlurs()
	initDropdowns()
	sel.remove()
}

function addPinOption (value) {
	const dropdown = d3.select(this)
	const li = dropdown.select('menu')
	.addElem('li')
	const pinItem = li.addElems('input')
		.attrs({
			'type': 'checkbox',
			'id': value.simplify(),
			'name': 'new_teams',
			'value': value,
			'data-label': value
		}).each(function () { 
			this.checked = true 
		})
	li.addElems('label', 'title')
		.attr('for', value.simplify())
		.html(value)
	renderPin.call(pinItem.node())
}
function renderPin () {
	const sel = d3.select(this)
	const pinboard = d3.select('.pinboard-group').classed('hide', false)
	
	if (this.checked) {
		const pin = pinboard.select('.pinboard .pins')
			.addElem('div', 'pin tag')
		pin.addElem('label', 'name')
			.classed('notranslate', true)
			.html(this.dataset.label)
		pin.addElem('div', 'close')
			.attrs({ 'data-name': this.name, 'data-id': this.value })
		.on('click', function () { rmPin(this) })
			.html('x')
	} else {
		d3.select(`label.close[data-name='${this.name}'][data-id='${this.value}']`).node().click()
	}
}
function rmPin (node) {
	const sel = d3.select(node)
	const id = node.dataset.id
	const name = node.dataset.name
	const input = d3.select(`input[name='${name}'][value='${id}']`)
	input.attr('checked', null)
	input.node().checked = false
	sel.findAncestor('pin').remove()

	const pinboard = d3.select('.pinboard-group')
	if (!pinboard.selectAll('.pin').size()) pinboard.classed('hide', true)

	partialSave()
}