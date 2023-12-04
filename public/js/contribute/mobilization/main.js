window.addEventListener('DOMContentLoaded', function () {
	// CHECK IF THE MOBILIZATION HAS A SOURCE (WHETHER IT IS A FOLLOW UP)
	const url = new URL(window.location)
	const queryparams = new URLSearchParams(url.search)
	const source = queryparams.get('source')

	const mobilization = d3.select('main#mobilize-new form')

	if (source) {
		mobilization
			.addElem('input')
		.attrs({ 
			'type': 'hidden',
			'name': 'source',
			'value': +source
		})
	}

	mobilization.selectAll('.modal .head button[type=button].back')
	.on('click', function () {
		prev(this);
	});
	mobilization.selectAll('.modal .head button[type=button].next')
	.on('click', function () {
		next(this);
	});

	d3.selectAll('.filter input[type=text]')
	.on('keyup', function () {
		const node = this
		const menu = d3.select(node).findAncestor('filter').select('menu')

		menu.selectAll('li')
			.classed('hide', function () {
				return !this.textContent.trim().toLowerCase()
				.includes(node.value.trim().toLowerCase())
			})
	})

	d3.selectAll('textarea').each(function () { 
		adjustarea(this) 
		fixLabel(this)
	})

	mobilization.select('.modal.m-1 input#title')
	.on('keydown', function () {
		preventSubmit(this, event);
	}).on('keyup', function () {
		enableNext(this);
	}).on('blur', function () { 
		enableNext(this);
	});
	mobilization.select('.modal.m-1 .foot input#public-status')
	.on('change', function () {
		togglePublic(this);
	});
	mobilization.selectAll('.modal.m-2 .body input[type=radio], .modal.m-5 .body input[type=radio], .modal.m-6 .body input[type=radio]')
	.on('change', function () {
		toggleChecked(this); 
		enableNext(this);
	});
	mobilization.select('.modal.m-3 .body input#cron-start')
	.on('change', function () {
		toggleCronJob(this);
	});
	mobilization.select('.modal.m-3 .body input#cron-end')
	.on('change', function () {
		toggleCronJob(this);
	});
	mobilization.select('.modal.m-3 .body input#start-date')
	.on('change', function () {
		offsetMinEndDate(this);
	});
	mobilization.select('.modal.m-4 .body textarea#description')
	.on('keyup', function () {
		adjustarea(this); 
		enableNext(this);
	}).on('blur', function () {
		fixLabel(this); 
		enableNext(this);
	});
	mobilization.select('.modal.m-6 .foot .global-opt button')
	.on('click', function () {
		selectAllOpts(this); 
		enableNext(this);
	});
	mobilization.select('.modal.m-7 .body input#limit-pads')
	.on('change', function () {
		togglePadLimit(this);
	});

})

function adjustarea(node) { 
	node.style.height = `${ node.scrollHeight - 30 }px` // WE HAVE A 2x10px PADDING IN THE CSS
	const submit = d3.select(node.parentNode).select('button[type=submit]').node()
	d3.select(node).findAncestor('modal').select('.head button.next').node().disabled = node.value.trim().length === 0 
}

function preventSubmit (node, evt) {
	if (evt.code === 'Enter' || evt.keyCode === 13) {
		evt.preventDefault()
		node.blur()
		d3.select(node).findAncestor('modal').select('.head button.next').node().click()
	}
}
function enableNext (node) {
	const parent = d3.select(node).findAncestor('modal')
	const button = parent.select('.head button.next:not(.hide)').node()
	const disabled = ((node.nodeName === 'TEXTAREA' || node.type === 'text') && node.value.trim().length === 0)
		|| (parent.selectAll('li').node() !== null && parent.selectAll('li.checked').size() === 0)
	
	if (button) button.disabled = disabled
	parent.select('.head').classed('status-0', disabled)
		.classed('status-1', !disabled)
}
function next (node) {
	const current = d3.select(node).findAncestor('modal')
	const next = current.node().nextElementSibling
	if (next.classList.contains('modal')) {
		d3.selectAll('.modal').classed('hide', true)
		d3.select(next).classed('hide', false)
	}
}
function prev (node) {
	const current = d3.select(node).findAncestor('modal')
	const next = current.node().previousElementSibling
	if (next.classList.contains('modal')) {
		d3.selectAll('.modal').classed('hide', true)
		d3.select(next).classed('hide', false)
	}
}
function togglePublic (node) {
	d3.selectAll('.public').classed('hide', !node.checked).each(function () { enableNext(this) })
	d3.selectAll('.private').classed('hide', node.checked).each(function () { enableNext(this) })
	d3.select('#pad-limit').node().value = node.checked ? 1000 : 3 // THIS IS AN ARBITRARY LARGE NUMBER
}
function toggleCronJob (node) {
	const sel = d3.select(node)
	const parent = sel.findAncestor('cron-option')
	parent.select('input[type=date]').attr('disabled', node.checked ? null : true)
}
function togglePadLimit (node) {
	const sel = d3.select(node)
	const parent = sel.findAncestor('pad-limit-option')
	parent.select('input[type=number]').attr('disabled', node.checked ? null : true)
	if (!node.checked) {
		parent.addElem('input')
		.attrs({
			'id': 'hidden-pad-limit',
			'type': 'hidden',
			'name': 'pad_limit',
			'value': 0
		})
	} else {
		parent.select('input#hidden-pad-limit')
		.remove()
	}
}
function offsetMinEndDate (node) {
	const sel = d3.select(node)
	const parent = sel.findAncestor('modal')

	const start = new Date(node.value)
	const end = new Date(node.value)
	end.setDate(end.getDate() + 1)

	const dd = String(end.getDate()).padStart(2, '0')
	const mm = String(end.getMonth() + 1).padStart(2, '0')
	const yyyy = end.getFullYear()

	parent.select('input[name="end_date"]')
		.attr('min', `${yyyy}-${mm}-${dd}`)

	// IF THE START DATE IS NOT NOW, THEN CHANGE THE status VALUE FOR THE MOBILIZATION
	const now = new Date()
	parent.select('input[name="status"]').node().value = start >= now ? 0 : 1
}
function toggleChecked (node) {
	const parent = d3.select(node).findAncestor('modal')
	parent.selectAll('li')
		.classed('checked', function () { return d3.select(this).select('input').node().checked })
	// d3.select(node).findAncestor('li').moveToBack()
	const count = parent.selectAll('li.checked').size()
	parent.select('.contributor-count')
		.html(_ => {
			return `${count} ${vocabulary['invited contributors'][count !== 1 ? 'plural' : 'singular']}`
		})
	// IF THERE IS A FILTER MENU, CLEAR SEARCH TERM
	if (parent.select('.filter input[type=text]').node()) {
		parent.select('.filter input[type=text]').node().value = null
		fixLabel(parent.select('.filter input[type=text]').node())
		parent.selectAll('menu li').classed('hide', false)
	}
}
function selectAllOpts (node) {
	const parent = d3.select(node).findAncestor('modal')
	parent.select('.global-opt').toggleClass('active')
		.select('button').html(_ => {
			return parent.select('.global-opt').classed('active') ? vocabulary['deselect all'] : vocabulary['select all']
		})
	parent.selectAll('li:not(.hide) input[type=checkbox]').each(function () { 
		this.checked = parent.select('.global-opt').classed('active')
		toggleChecked(this) 
	})
}