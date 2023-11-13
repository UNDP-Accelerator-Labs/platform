function uploadFile (form, lang = 'en') {
	const ellipsis = d3.select('.media-layout').addElems('div', 'lds-ellipsis')
	ellipsis.addElem('div')
	ellipsis.addElem('div')
	ellipsis.addElem('div')
	ellipsis.addElem('div')

	console.log('uploading pdf')

	return fetch(form.action, {
		method: form.method,
		body: form.data || new FormData(form)
	}).then(res => res.json())
	.then(json => {
		ellipsis.remove()
		return json
	}).then(files => {
		console.log(files)
		const { message } = files
		const errs = files.filter(d => d.status !== 200)
		if (errs.length) console.log(errs)
		return files
		// else return location.reload() // WE DO NOT NEED TO RELOAD
	}).catch(err => { if (err) throw err })
}