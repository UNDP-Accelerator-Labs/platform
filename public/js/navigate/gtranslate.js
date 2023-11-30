var googleTranslateElement;

function setCookie(key, value, expiry) {
  const expires = new Date();
  expires.setTime(expires.getTime() + (expiry * 24 * 60 * 60 * 1000));
  const domain = '<%= mainHost %>';
  document.cookie = `${key}=${value};expires=${expires.toUTCString()};domain=${domain}`;
}
async function googleTranslateElementInit() {
	const language = await getLanguage()
	setCookie('GoogleAccountsLocale_session', `${language}`);
	setCookie('googtrans', `/en/${language}`, 1);

	d3.select("#gtranslate-dummy-lang").style("display", "none");
	new google.translate.TranslateElement({
	   pageLanguage: 'en',
	   layout: google.translate.TranslateElement.InlineLayout.SIMPLE
	}, 'google_translate_element');
}

function rewriteUrl(lang, reload = false) {
	if (!lang) {
		lang = 'en';
	}
	const currentUrl = new URL(window.location);
	const languagePattern = /^\/[a-z]{2,3}\//;
	const newPath = currentUrl.pathname.replace(languagePattern, `/${lang}/`);
	currentUrl.pathname = newPath;
	const newUrl = `${currentUrl}`;

	if(reload) window.location.href = newUrl;
	else window.history.replaceState({}, "", newUrl);
}

// IF THE SELECTED LANGUAGE IS ONE OF THE MODULE LANGUAGES, IGNORE GOOGLE TRANSLATE FOR VOCABULARY OBJ
// THIS MEANS THE SOURCE OF TRUTH FOR TRANSLATION ON MODULE LANGUAGES IS THE VOCABULARY OBJECT.
async function updateDomTree(lang) {
	if (!lang) {
		lang = 'en';
	}

	const { languages } = await POST('/load/metadata', { feature: 'languages' })
	const isMainLanguage = lang !== 'en' && languages.some(d => d === lang)
	d3.selectAll('.google-translate-attr')
			.classed('notranslate', function() {
			return d3.select(this).classed('notranslate') || isMainLanguage;
		});
}

// LISTEN TO CHANGES IN LANGUAGE COOKIES
cookieStore.addEventListener('change', async ({changed}) => {
	for (const {name, value} of changed) {
		if(name === 'googtrans'){
			var lang = value?.split('/')[2]
			await updateDomTree(lang)
			rewriteUrl(lang)
		}
	}
	if(!changed.length){
		rewriteUrl('en', true);
	}
});