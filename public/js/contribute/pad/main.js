// INIT THE SOCKET
// const socket = io()
// const socket = io.connect('localhost:3000', {
// 	reconnection: true,
// 	reconnectionDelay: 1000,
// 	reconnectionDelayMax : 5000,
// 	reconnectionAttempts: Infinity
// })

// THE FOLLOWING IS INSPIRED BY:
// https://www.programmersought.com/article/5248306768/
// https://stackoverflow.com/questions/926916/how-to-get-the-bodys-content-of-an-iframe-in-javascript

window.addEventListener('load', async function () {
	if (!mediaSize) var mediaSize = getMediaSize()
	const pad = JSON.parse(d3.select('data[name="pad"]').node()?.value)

	await renderPad();
	initToolbarInteractions(pad.metafields, pad.type);

	const main = d3.select('#pad')
	const head = main.select('.head')

	// ADD THE INTERACTION BEHAVIOR FOR THE TITLE INPUT
	head.select('.title')
	.on('keydown', function () {
		const evt = d3.event
		if (evt.code === 'Enter' || evt.keyCode === 13) {
			evt.preventDefault()
			this.blur()
		}
	}).on('blur', async _ => await partialSave('title'))

	// ADD THE INTERACTION FOR THE SAVE BUTTON ON sm DISLAYS
	d3.select(`div.save.${mediaSize} form button`)
	.on('click', async _ => await partialSave())
	// ADD THE INTERACTION FOR THE SAVE BUTTON FOR PUBLIC MOBILIZAIONS
	d3.select('button#save-and-submit')
	.on('click', function () {
		saveAndSubmit(this);
	});
	// ADD THE INTERACTION FOR THE REQUEST FOR REVIEW
	d3.select('button#submit-for-review')
	.on('click', function () {
		selectReviewLanguage(this);
	})
	// SET UP THE ADJACENT DISPLAYS IF RELEVANT
	// FOR SOURCE
	if (d3.select('div#source').node()) {
		// TO DO: CHANGE LOGIC HERE TO USE A data DOM ELEMENT
		// PROBABLY BEST IN pad
		const { id, object, review } = d3.select('div#source').node().dataset

		loadHTML(`../view/pad?id=${id}${(object === "review" || review === 'true') ? '&anonymize=true' : '' }`, '#pad', '#source')

		const url = new URL(window.location)
		if (!queryparams) var queryparams = new URLSearchParams(url.search)
		queryparams.delete('display')

		d3.select('div.display-source a').attr('href', `?${queryparams.toString()}`)
	} else if (d3.select('div.display-option.display-source').node()) {
		const url = new URL(window.location)
		if (!queryparams) var queryparams = new URLSearchParams(url.search)
		queryparams.set('display', 'adjacent-source')

		d3.select('div.display-source a').attr('href', `?${queryparams.toString()}`)
	}
	// OR FOR REVIEW
	if (d3.selectAll('div.review').size()) {
		d3.select('div.review').each(function () {
			const { id, idx } = this.dataset
			loadHTML(`../view/pad?id=${id}`, '#pad', `#review-${idx}`)
		})

		const url = new URL(window.location)
		if (!queryparams) var queryparams = new URLSearchParams(url.search)
		queryparams.delete('display')

		d3.select('div.display-reviews a').attr('href', `?${queryparams.toString()}`)
	} else if (d3.select('div.display-option.display-reviews').node()) {
		const url = new URL(window.location) // url IS ALREADY DEFINED SOMEWHERE ELSE
		if (!queryparams) var queryparams = new URLSearchParams(url.search)
		queryparams.set('display', 'adjacent-reviews')

		d3.select('div.display-reviews a').attr('href', `?${queryparams.toString()}`)
	}

	d3.select('button.publish')
	.on('click', function () { 
		this.focus();
	}).on('focus.dropdown', function () {
		const form = d3.select(this.form)
		const dropdown = form.select('.dropdown')
		if (dropdown.node()) {
			if (dropdown.node().style.maxHeight) dropdown.node().style.maxHeight = null
			else dropdown.node().style.maxHeight = `${Math.min(dropdown.node().scrollHeight, 300)}px`
			dropdown.selectAll('button').on('mousedown', _ => d3.event.preventDefault())
		}
	}).on('blur.dropdown', function () {
		const form = d3.select(this.form)
		const dropdown = form.select('.dropdown')
		if (dropdown.node()) dropdown.node().style.maxHeight = null
	})
})

function loadHTML(url, source, target) {
	const iframe = document.createElement('iframe')
	iframe.style.display = 'none'
	iframe.src = url

	if (iframe.attachEvent){
		iframe.attachEvent('onload', function () {
			extractTarget(this, source, target)
		})
	} else {
		iframe.onload = function () {
			extractTarget(this, source, target)
		}
	}

	function extractTarget (node, source, target) {
		const doc = d3.select(node.contentDocument || node.contentWindow.document)
			.select(source)
			.attr('id', 'reference')
			// .classed('split-screen', true)
		doc.selectAll('.focus').classed('focus', false)
		doc.select('.pad > .inner > .meta-status').remove()
		doc.select('.pad > .inner > .meta-info').remove()
		doc.select('.pad > .inner > .scroll-nav').remove()
		doc.select('.media-input-group').remove()
		d3.select(target).html(doc.node().outerHTML)
		d3.select(node).remove()
	}
	document.body.appendChild(iframe)
}

async function selectReviewLanguage (node) { // THIS IS ALMOST THE SAME AS IN /browse/index.js
	// TO DO: THIS STILL NEEDS SOME WORK
	const { name, value } = node
	const { id } = JSON.parse(d3.select('data[name="pad"]').node()?.value)

	const target_opts = await POST('/load/templates', { space: 'reviews' })
	.then(results => {
		return results.data.map(d => {
			return { 
				label: d.name, 
				value: d.language, 
				count: d.count, 
				disabled: { 
					value: d.disabled, 
					label: vocabulary['missing reviewers'][language] 
				}, 
				type: 'radio', 
				required: true 
			}
		})
	})

	const formdata = { action: '/request/review',  method: 'POST' }
	const message = vocabulary['select review language'][language]
	const opts = []
	opts.push({ 
		node: 'select', 
		name: 'language', 
		label: vocabulary['select language'][language]['singular'], 
		options: target_opts 
	})
	opts.push({ 
		node: 'input', 
		type: 'hidden', 
		name: 'id', 
		value: id 
	})
	opts.push({ 
		node: 'button', 
		type: 'submit', 
		name: name, 
		value: value, 
		label: vocabulary['submit for review'][language] 
	})
	const new_constraint = await renderFormModal({ message, formdata, opts })
}