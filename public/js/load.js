import { language, vocabulary } from '/js/config/translations.js'
import { getMediaSize, fixLabel, printTranslation, scrollToPad, toggleOptions, expandstats, ensureIcon } from '/js/main.js'
import { POST } from '/js/fetch.js'


if (!mediaSize) var mediaSize = getMediaSize()

async function DOMLoad () {
	d3.selectAll('[data-vocab]')
	.html(function () {
		const vocab = this.dataset.vocab || this.dataset.vocabprefix || this.dataset.placeholder || this.dataset.content
		let translation = printTranslation(this, vocab);
		if (!translation) translation = printTranslation(this, this.dataset.altvocab)
		return translation;
	});
	d3.selectAll('[data-vocabprefix]')
	.each(function () {
		const vocab = this.dataset.vocab || this.dataset.vocabprefix || this.dataset.placeholder || this.dataset.content
		let prefix = printTranslation(this, vocab);
		if (!prefix) prefix = printTranslation(this, this.dataset.altvocab)
		if (this.value) { this.value = `[${prefix}] ${this.value}`; }
		else {
			if (this.textContent) {
				this.textContent = `[${prefix}] ${this.textContent}`;
			} else if (this.innerText) {
				this.innerText = `[${prefix}] ${this.innerText}`;
			}
		}
	});
	d3.selectAll('[data-placeholder]')
	.attr('data-placeholder', function () {
		const vocab = this.dataset.vocab || this.dataset.vocabprefix || this.dataset.placeholder || this.dataset.content
		let translation = printTranslation(this, vocab);
		if (!translation) translation = printTranslation(this, this.dataset.altvocab)
		return translation;
	});
	d3.selectAll('[data-content]')
	.attr('data-content', function () {
		const vocab = this.dataset.vocab || this.dataset.vocabprefix || this.dataset.placeholder || this.dataset.content
		let translation = printTranslation(this, vocab);
		if (!translation) translation = printTranslation(this, this.dataset.altvocab)
		return translation;
	});

	/* SET PATHS
	NOT language NEEDS TO BE SET AS A GLOBAL VAR IN THE MAIN ejs FILE */
	const url = new URL(window.location);
	let pathname = url.pathname.substring(1);
	if (pathname.split('/').length > 1) { 
		pathname = `${pathname.split('/').slice(1).join('/')}${url.search}`; 
	};
	const { languages } = await POST('/load/metadata', { feature: 'languages' })
	languages.forEach(d => {
		d3.select(`#lang-${d} a`).attr('href', `/${d}/${pathname}`);
	});

	// SET NAVIGATION LINKS FOR TABS
	// d3.selectAll('nav.tabs menu li a')
	// .on('click', function () {
	// 	if (this.dataset.redirect) {
	// 		return redirect(this.dataset.redirect)
	// 	} else return false
	// })

	// GENERIC BLUR FUNCTION
	const inputs = d3.selectAll('input[type=text]:not([name="api-token"]), input[type=password], input[type=email]')
	inputs.on('blur.fixlabel', function () {
		fixLabel(this)
	}).each(function () { fixLabel(this) });

	// ENABLE THE SCROLL DOWN SUGGESTED INTERACTIVITY
	d3.select('button.scroll-nav')
	.on('click', function () {
		const target = d3.select('.scroll-target').node()
		scrollToPad(target)
	});

	// TOGGLE OPTIONS
	d3.selectAll('input.toggle')
	.on('change', async function () {
		await toggleOptions(this)
	})

	// ENSURE FOCUS ON contentEditable
	d3.selectAll('div[contenteditable="true"], div[contenteditable]')
	.on('focus.setfocus', function () {
		d3.select(this).classed('focus', true)
	}).on('blur.unsetfocus', function () {
		d3.select(this).classed('focus', false)
	})

	// ENABLE EXPANSION OF STATISTICS IN sm VIEWS
	if (mediaSize === 'xs') {
		d3.select('button#expand-statistics')
		.on('click', function () {
			expandstats(this)
		})
	}
	// INITIALIZE FILTER TAGS
	d3.selectAll('div#filters div.search-filters div.tag label.close')
	.on('click', function () {
		const sel = d3.select(this)
		const tag = sel.findAncestor('tag')
		const data_value = tag.attr('data-value')

		const filter_form = d3.select('nav#search-and-filter')
		filter_form.select('input#search-field').node().value = null

		filter_form.select('form').node().submit()
	})
	d3.selectAll('div#filters div.filters-group:not(.search-filters) div.tag label.close')
	.on('click', function () {
		const sel = d3.select(this)
		const tag = sel.findAncestor('tag')
		const data_type = tag.attr('data-type')
		const data_value = tag.attr('data-value')

		const filter_form = d3.select('nav#search-and-filter')
		const filter = filter_form.selectAll('input[type=checkbox]').filter(function () {
			return d3.select(this).attr('name') === data_type && this.value === data_value
		}).node()
		filter.checked = false
		if (d3.select(filter.parentNode).selectAll('input[type=hidden]:not(:disabled)').size()) {
			d3.select(filter.parentNode).selectAll('input[type=hidden]:not(:disabled)').attr('disabled', true)
		}

		filter_form.select('form').node().submit()
	})

	// ANIMATE THE EYE ICON
	let eye_icon = '/imgs/icons/i-eye';
	if (mediaSize === 'xs') {
		eye_icon = '/imgs/icons/i-eye-sm';
	}
	ensureIcon('.engagement-reads-icon', `${eye_icon}.svg`, `${eye_icon}-closed.svg`, 200, 2000);
}

if (document.readyState === 'loading') {
	window.addEventListener('DOMContentLoaded', DOMLoad)
} else {
	DOMLoad()
}

window.addEventListener('scroll', function () {
	d3.select('button.scroll-nav').classed('hide', document.documentElement.scrollTop > 60)
});