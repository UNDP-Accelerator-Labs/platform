import {
  getCurrentLanguage,
  getRegisteredLanguages,
} from '/js/config/main.js';

export async function initGTranslate() {
  const language = await getCurrentLanguage();
  const currentpage_url = new URL(window.location);
  const fullHost = `${currentpage_url.origin}`;
  const mainHost = fullHost.endsWith('azurewebsites.net')
    ? fullHost
    : fullHost.split('.').slice(-2).join('.');

  function setCookie(key, value, expiry) {
    const expires = new Date();
    expires.setTime(expires.getTime() + expiry * 24 * 60 * 60 * 1000);
    document.cookie = `${key}=${value};expires=${expires.toUTCString()};domain=${mainHost}`;
  }

  d3.select('#gtranslate-dummy-lang').style('display', 'none');
  new google.translate.TranslateElement(
    {
      pageLanguage: 'en',
      layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
    },
    'google_translate_element',
  );

  setCookie('GoogleAccountsLocale_session', `${language}`);
  setCookie('googtrans', `/en/${language}`, 1);

  function rewriteUrl(lang, reload = false) {
    if (!lang) {
      lang = 'en';
    }
    const currentUrl = new URL(window.location);
    const languagePattern = /^\/[a-z]{2,3}\//;
    const newPath = currentUrl.pathname.replace(languagePattern, `/${lang}/`);
    currentUrl.pathname = newPath;
    const newUrl = `${currentUrl}`;

    if (reload) window.location.href = newUrl;
    else window.history.replaceState({}, '', newUrl);
  }

  // IF THE SELECTED LANGUAGE IS ONE OF THE MODULE LANGUAGES, IGNORE GOOGLE TRANSLATE FOR VOCABULARY OBJ
  // THIS MEANS THE SOURCE OF TRUTH FOR TRANSLATION ON MODULE LANGUAGES IS THE VOCABULARY OBJECT.
  async function updateDomTree(lang) {
    const languages = await getRegisteredLanguages();
    if (!lang) {
      lang = 'en';
    }
    const isMainLanguage = lang !== 'en' && languages.some((d) => d === lang);
    // d3.selectAll('.google-translate-attr')
    d3.selectAll('[data-vocab]').classed('notranslate', function () {
      return d3.select(this).classed('notranslate') || isMainLanguage;
    });
  }

  // LISTEN TO CHANGES IN LANGUAGE COOKIES
  // TO DO: cookieStore IS NOT AVAILABLE ON SAFARI OR FIREFOX
  cookieStore.addEventListener('change', async ({ changed }) => {
    for (const { name, value } of changed) {
      if (name === 'googtrans') {
        const lang = value?.split('/')[2];
        await updateDomTree(lang);
        rewriteUrl(lang);
      }
    }
    if (!changed.length) {
      rewriteUrl('en', true);
    }
  });
}
