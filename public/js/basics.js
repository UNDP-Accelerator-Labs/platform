if ('serviceWorker' in navigator) {
	window.addEventListener('load', function () {
		navigator.serviceWorker
			.register('/app.serviceWorker.js')
			.then((res) => console.log('service worker registered'))
			.catch((err) => console.log('service worker not registered', err))
	})
}

function getMediaSize () {
	// https://www.w3schools.com/howto/howto_js_media_queries.asp
	// console.log(window.navigator)
	// console.log(window.navigator.Agent)
	return [{ label: 'xs', size: 767 }, { label: 'sm', size: 768 }, { label: 'm', size: 1024 }, { label: 'lg', size: 1200 }, { label: 'xl', size: 1366 }, { label: 'xxl', size: 1920 }]
	.reverse().find(d => {
		if (d.label === 'xs') return window.matchMedia(`(max-width: ${d.size}px)`).matches
		else return window.matchMedia(`(min-width: ${d.size}px)`).matches
	})?.label
}
const jsonQueryHeader = { 'Accept': 'application/json', 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }
function _fetch(_method, _uri, _q, _expectJSON, _checkStatus) {
	return new Promise((resolve, reject) => {
		const args = { method: _method, headers: jsonQueryHeader };
		if (_q) {
			args['body'] = JSON.stringify(_q);
		}
		fetch(_uri, args)
		.then(response => {
			if (_checkStatus && !response.ok) {
				reject(response);
				return;
			}
			if (_expectJSON) {
				return response.json();
			}
			return response;
		})
		.then(results => resolve(results))
		.catch(err => {
			if (err) {
				reject(err);
			}
		});
	});
}
function GET (_uri, _expectJSON = true, _checkStatus = false) {
	return _fetch('GET', _uri, null, _expectJSON, _checkStatus);
}
function POST (_uri, _q, _expectJSON = true, _checkStatus = false) {
	return _fetch('POST', _uri, _q || {}, _expectJSON, _checkStatus);
}
function PUT (_uri, _q, _expectJSON = true, _checkStatus = false) {
	return _fetch('PUT', _uri, _q || {}, _expectJSON, _checkStatus);
}
function DELETE (_uri, _q, _expectJSON = true, _checkStatus = false) {
	return _fetch('DELETE', _uri, _q || {}, _expectJSON, _checkStatus);
}
function toggleClass (node, classname) {
	d3.select(node).classed(classname, function () { return !d3.select(this).classed(classname) })
}
function fixLabel (node) {
	d3.select(node).classed('has-value', node.value?.trim().length)
}
function multiSelection (sel, targets) {
	const body = d3.select('body')
	let sels
	let ox, oy, dx, dy, x, y = 0
	let bbox = { x: x, y: y, w: 0, h: 0 } // THIS IS TO HOLD AN INSTANCE OF THE RECTANGLE DRAWN, IN ORDER NOT TO HAVE TO USE GetClientBoundingRect

	sel.on('mousedown.multiSelect', function () {
		const evt = d3.event
		// const body = d3.select('body')
		if (!targets.constraint || (targets.constraint && targets.constraint(evt))) {
			body.classed('select', true)
			ox = x = evt.x || evt.clientX
			oy = y = evt.y || evt.clientY

			if (!evt.shiftKey) d3.selectAll('.selecting, .selected').classed('selecting, selected', false)

			body.addElems('div', 'selection-veil')
				.classed('unselectable', true)
			.addElems('div', 'selection-box', [{ x: x, y: y, w: 0, h: 0 }])
				.styles({ 'transform': d => `translate(${d.x}px, ${d.y}px)`, 'width': d => `${d.w}px`, 'height': d => `${d.h}px` })
			document.body.addEventListener('mousemove', selecting)
		}
	}).on('mouseup.multiSelect', function () {
		document.body.removeEventListener('mousemove', selecting)
		body.classed('select', false)
		if (targets.class) {
			sels = d3.selectAll(targets.class)
			sels.filter(function () { return d3.select(this).classed('selecting') }).classed('selecting', false).classed('selected', true)
		}
		d3.select('div.selection-veil').remove()
	})
	function selecting (evt) {
		const selection = d3.select('div.selection-box')
		x = evt.x || evt.clientX
		y = evt.y || evt.clientY
		dx = x - ox
		dy = y - oy
		ox = x
		oy = y

		selection.styles({
			'transform': d => {
				if (d.w < 0) d.x = x
				if (d.h < 0) d.y = y
				bbox.x = d.x
				bbox.y = d.y
				return `translate(${d.x}px, ${d.y}px)`
			},
			'width': d => {
				d.w += dx
				bbox.w = Math.abs(d.w)
				return `${Math.abs(d.w)}px`
			},
			'height': d => {
				d.h += dy
				bbox.h = Math.abs(d.h)
				return `${Math.abs(d.h)}px`
			}
		})
		// MAYBE MOVE THIS UP TO ONLY CALCULATE ONCE (BUT THIS WOULD BE AN ISSUE IF THE USER SCROLLS MID SELECTION)
		if (targets.class) {
			sels = d3.selectAll(targets.class)
			if (targets.filter) sels = sels.filter(d => targets.filter(d))
			sels.classed('selecting', function (d) {
				const rect = this.getBoundingClientRect()

				if (
					(
					(rect.left >= bbox.x && rect.left <= bbox.x + bbox.w)
					|| (rect.left <= bbox.x && rect.right >= bbox.x + bbox.w)
					|| (rect.left <= bbox.x && rect.right >= bbox.x && rect.right <= bbox.x + bbox.w)
					) && (
					(rect.top >= bbox.y && rect.top <= bbox.y + bbox.h)
					|| (rect.bottom >= bbox.y && rect.bottom <= bbox.y + bbox.h)
					|| (rect.top <= bbox.y && rect.bottom >= bbox.y + bbox.h)
					)
				) {
					return true
				} else return false
			})
		}
	}
}

function addGlobalLoader () {
	const nav = d3.select('nav#languages')
	nav.select('menu').classed('squeeze', true)
	const loader = nav.addElems('div', 'lds-ellipsis')
	loader.addElem('div')
	loader.addElem('div')
	loader.addElem('div')
	loader.addElem('div')
	return loader
}
function rmGlobalLoader () {
	const nav = d3.select('nav#languages')
	nav.select('.lds-ellipsis').remove()
	nav.select('menu').classed('squeeze', false)
}

let ensureIconRegistered = false;
function ensureIcon(classSel, name, altName, timingShort, timingTotal) {
	if (ensureIconRegistered) {
		return;
	}
	const iconUpdate = () => {
		let anyIcons = false;
		d3.selectAll(classSel).attr('src', () => {
			anyIcons = true;
			return Math.random() < 0.01 ? altName : name;
		});
		if (!anyIcons) {
			return;
		}
		setTimeout(() => {
			d3.selectAll(classSel).attr('src', name);
			setTimeout(iconUpdate, timingTotal - timingShort);
		}, timingShort);
	};
	setTimeout(iconUpdate, timingTotal);
	ensureIconRegistered = true;
}
window.addEventListener('DOMContentLoaded', () => {
	let eye_icon = '/imgs/icons/i-eye';
    if (!mediaSize) {
		var mediaSize = getMediaSize();
	}
    if (mediaSize === 'xs') {
		eye_icon = '/imgs/icons/i-eye-sm';
	}
    ensureIcon('.engagement-reads-icon', `${eye_icon}.svg`, `${eye_icon}-closed.svg`, 200, 2000);
});

function checkPassword (password) {
	// THIS REPLICATES THE BACKEND password-requirements.js FILE
	const minlength = 8
	const uppercaseRegex = /[A-Z]/;
	const lowercaseRegex = /[a-z]/;
	const numberRegex = /[0-9]/;
	const specialCharRegex = /[!@#$%^&*\(\)]/;
	// Check against common passwords (optional)
	const commonPasswords = ['password', '123456', 'qwerty', 'azerty'];
	const isUpper = uppercaseRegex.test(password);
	const isLower = lowercaseRegex.test(password);
	const isNumber = numberRegex.test(password);
	const isSpecial = specialCharRegex.test(password);
	const groups = [isUpper, isLower, isNumber, isSpecial].reduce((p, v) => p + (v ? 1 : 0), 0);
	const checkPass = {
		'pw-length': !(password.length < minlength),
		'pw-groups': groups >= 3,
		'pw-common': !commonPasswords.includes(password),
	};

	const msgs = {
		'pw-length': `Password should be at least ${minlength} characters long`,
		'pw-groups': 'Password requires three character groups out of uppercase letters, lowercase letters, numbers, or special characters !@#$%^&*()',
		'pw-common': 'Password cannot be a commonly used password',
	};
	return Object.keys(checkPass).filter((key) => !checkPass[key]).map((key) => msgs[key]);
}

function selectElementContents (node) {
	// CREDIT TO https://stackoverflow.com/questions/6139107/programmatically-select-text-in-a-contenteditable-html-element
	const range = document.createRange();
	range.selectNodeContents(node);
	const sel = window.getSelection();
	sel.removeAllRanges();
	sel.addRange(range);
}

function limitLength(text, limit) {
	text = `${text}`;  // converting to string just to be sure
	const arr = [...text].reduce((p, c) => c.match(/\p{Emoji_Modifier}/u) ? [...p.slice(0, -1), p[p.length - 1] + c] : [...p, c], []);
	if (arr.length < limit) {
		return text;
	}
	return `${arr.slice(0, limit - 1).join('')}…`;
}
const dateOptions = {
	weekday: undefined,
	year: 'numeric',
	month: 'long',
	day: 'numeric',
};

function getContent (params = {}) { // THIS IS TO LOAD THE PADS, TEMPLATES, ETC
	const object = d3.select('data[name="object"]').node().value
	const space = d3.select('data[name="space"]').node()?.value
	
	const url = new URL(window.location)
	const queryparams = new URLSearchParams(url.search)
	
	const reqbody = {};
	if (space) reqbody['space'] = space
	
	for (key in params) {
		reqbody[key] = params[key];
	}
	
	queryparams.forEach((value, key) => {
		if (!reqbody[key]) { reqbody[key] = value; }
		else {
			if (!Array.isArray(reqbody[key])) { reqbody[key] = [reqbody[key]]; }
			reqbody[key].push(value);
		}
	});

	// TO DO: ADD VAR keep_page
	return POST(`/load/${object}`, reqbody)
}
async function getLanguage () {
	const { languages } = await POST('/load/metadata', { feature: 'languages' })
	const url = new URL(window.location)
	const language = url.pathname.substring(1).split('/')[0]

	if (languages.some(d => d === language)) return { language, languages }
	else return { language: 'en', languages }
}