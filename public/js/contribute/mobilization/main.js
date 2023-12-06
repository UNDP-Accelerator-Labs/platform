import { fixLabel } from '/js/main.js'

export function adjustarea(node) { 
	node.style.height = `${ node.scrollHeight - 30 }px` // WE HAVE A 2x10px PADDING IN THE CSS
	const submit = d3.select(node.parentNode).select('button[type=submit]').node()
	d3.select(node).findAncestor('modal').select('.head button.next').node().disabled = node.value.trim().length === 0 
}
export function preventSubmit (node, evt) {
	if (evt.code === 'Enter' || evt.keyCode === 13) {
		evt.preventDefault()
		node.blur()
		d3.select(node).findAncestor('modal').select('.head button.next').node().click()
	}
}
export function enableNext (node) {
	const parent = d3.select(node).findAncestor('modal')
	const button = parent.select('.head button.next:not(.hide)').node()
	const disabled = ((node.nodeName === 'TEXTAREA' || node.type === 'text') && node.value.trim().length === 0)
		|| (parent.selectAll('li').node() !== null && parent.selectAll('li.checked').size() === 0)
	
	if (button) button.disabled = disabled
	parent.select('.head').classed('status-0', disabled)
		.classed('status-1', !disabled)
}
export function next (node) {
	const current = d3.select(node).findAncestor('modal')
	const next = current.node().nextElementSibling
	if (next.classList.contains('modal')) {
		d3.selectAll('.modal').classed('hide', true)
		d3.select(next).classed('hide', false)
	}
}
export function prev (node) {
	const current = d3.select(node).findAncestor('modal')
	const next = current.node().previousElementSibling
	if (next.classList.contains('modal')) {
		d3.selectAll('.modal').classed('hide', true)
		d3.select(next).classed('hide', false)
	}
}
export function togglePublic (node) {
	d3.selectAll('.public').classed('hide', !node.checked).each(function () { enableNext(this) })
	d3.selectAll('.private').classed('hide', node.checked).each(function () { enableNext(this) })
	d3.select('#pad-limit').node().value = node.checked ? 1000 : 3 // THIS IS AN ARBITRARY LARGE NUMBER
}
export function toggleCronJob (node) {
	const sel = d3.select(node)
	const parent = sel.findAncestor('cron-option')
	parent.select('input[type=date]').attr('disabled', node.checked ? null : true)
}
export function togglePadLimit (node) {
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
export function offsetMinEndDate (node) {
	const sel = d3.select(node)
	const parent = sel.findAncestor('modal')
  const start = new Date(node.value);
  const end = new Date(node.value);
  end.setDate(end.getDate() + 1);

  const dd = String(end.getDate()).padStart(2, '0');
  const mm = String(end.getMonth() + 1).padStart(2, '0');
  const yyyy = end.getFullYear();

  parent.select('input[name="end_date"]').attr('min', `${yyyy}-${mm}-${dd}`);

  // IF THE START DATE IS NOT NOW, THEN CHANGE THE status VALUE FOR THE MOBILIZATION
  const now = new Date();
  parent.select('input[name="status"]').node().value = start >= now ? 0 : 1;
}
export function toggleChecked (node) {
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
export function selectAllOpts (node) {
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