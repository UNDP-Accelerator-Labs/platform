String.prototype.last = function () {
	return this.valueOf()[this.valueOf().length - 1]
}
String.prototype.simplify = function () {
	return this.valueOf().trim().replace(/[^\w\s]/gi, '').replace(/\s/g, '').toLowerCase()
}
String.prototype.removeAccents = function () {
	// CREDIT TO https://stackoverflow.com/questions/990904/remove-accents-diacritics-in-a-string-in-javascript
	return this.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}
String.prototype.replacePunctuation = function (replacement) {
	return this.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, replacement).replace(/\s{2,}/g, ' ') // THIS KEEPS COMMAS
}
String.prototype.replaceURLWithHTMLLinks = function (language) {
	let b = '\\b' // WORD BOUNDARIES
	let B = '\\B'
	// if (language === 'AR') { // THIS DOES NOT WORK FOR SOME REASON
	// 	b = '(^|[^\u0621-\u064A])'
	// 	B = '($|[^\u0621-\u064A])'
	// }

	const url = new RegExp(`(${b}(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])`, 'ig')
	const hashtag = new RegExp(`${B}((\#|\@)[a-zA-Z0-9_]+${b})(?!.,;:)`, 'ig')
	const rtlhashtag = new RegExp(`${B}([a-zA-Z0-9_]+(\#|\@)${b})(?!.,;:)`, 'ig')

	return this.valueOf()
		.replace(url, '<a href="$1" target="_blank">$1</a>')
		.replace(hashtag, '<span class="hashtag">$1</span>')
		.replace(rtlhashtag, '<span class="hashtag">$1</span>')
}
String.prototype.capitalize = function () {
	return this.valueOf().charAt(0).toUpperCase() + this.valueOf().slice(1)
}
String.prototype.extractDigits = function () {
	return +this.match(/\d+/)[0]
}
String.prototype.isURL = function () {
	let b = '\\b' // WORD BOUNDARIES
	let B = '\\B'
	// const pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
	// 	'((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
	// 	'((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
	// 	'(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
	// 	'(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
	// 	'(\\#[-a-z\\d_]*)?$', 'i') // extension
	const url = new RegExp(`(?<!:)(${b}(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])`, 'ig')
	if (this.valueOf().trim().match(url)?.length <= 1) {
		return !!url.test(encodeURI(this.valueOf().trim()))
	} else return false
}
String.prototype.isBlob = function () {
	const blob = new RegExp('^blob\:')
	if (this.valueOf().trim().match(blob)?.length <= 1) {
		return !!blob.test(encodeURI(this.valueOf().trim()))
	} else return false
}
String.prototype.URLsToLinks = function () {
	// INSPIRED BY https://stackoverflow.com/questions/49634850/convert-plain-text-links-to-clickable-links
	//URLs starting with http://, https://, or ftp://
	const replacePattern1 = /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim
	let str = this.valueOf().replace(replacePattern1, '<a href="$1" target="_blank">$1</a>')

	//URLs starting with "www." (without // before it, or it'd re-link the ones done above).
	const replacePattern2 = /(^|[^\/])(www\.[\S]+(\b|$))/gim
	str = str.replace(replacePattern2, '$1<a href="http://$2" target="_blank">$2</a>')

	//Change email addresses to mailto:: links.
	const replacePattern3 = /(([a-zA-Z0-9\-\_\.])+@[a-zA-Z\_]+?(\.[a-zA-Z]{2,6})+)/gim
	str = str.replace(replacePattern3, '<a href="mailto:$1">$1</a>')

	return str
}
String.prototype.convertHTMLtoTXT = function () {
	// CREDIT TO https://stackoverflow.com/questions/5002111/how-to-strip-html-tags-from-string-in-javascript
	const html = this.valueOf().trim()
	const div = document.createElement('div')
	div.innerHTML = html
	return div.textContent || div.innerText || ''
}
RegExp.escape = function(string) {
	// FROM https://makandracards.com/makandra/15879-javascript-how-to-generate-a-regular-expression-from-a-string
	return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
}