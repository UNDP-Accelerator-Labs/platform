import { language, languages } from '/js/config/main.js';

export async function initGTranslate() {
  const currentpage_url = new URL(window.location);
  const fullHost = `${currentpage_url.origin}`;
  const mainHost = fullHost.endsWith('azurewebsites.net')
    ? fullHost
    : fullHost.split('.').slice(-2).join('.');

  function setCookie(key, value, expiry) {
    const expires = new Date();
    expires.setTime(expires.getTime() + expiry * 24 * 60 * 60 * 1000);
    // document.cookie = `${key}=${value};expires=${expires.toUTCString()};domain=${mainHost}`;
    document.cookie = `${key}=${value};domain=${mainHost}`;
  }

  d3.select('#gtranslate-dummy-lang').style('display', 'none');

  function rewriteUrl(lang, reload = false) {
    if (!lang) {
      lang = 'en';
    }
    const currentUrl = new URL(window.location);
    const languagePattern = /^\/[a-z]{2,3}\//;
    const newPath = currentUrl.pathname.replace(languagePattern, `/${lang}/`);
    currentUrl.pathname = newPath;
    const newUrl = `${currentUrl}`;

    if (newUrl !== window.location.href) {
      if (reload) window.location.href = newUrl;
      else window.history.replaceState({}, '', newUrl);
    }
  }

  // IF THE SELECTED LANGUAGE IS ONE OF THE MODULE LANGUAGES, IGNORE GOOGLE TRANSLATE FOR VOCABULARY OBJ
  // THIS MEANS THE SOURCE OF TRUTH FOR TRANSLATION ON MODULE LANGUAGES IS THE VOCABULARY OBJECT.
  async function updateDomTree(lang) {
    if (!lang) {
      lang = 'en';
    }
    const isMainLanguage = lang !== 'en' && languages.some((d) => d === lang);
    // d3.selectAll('.google-translate-attr')
    d3.selectAll('[data-vocab]').classed('notranslate', function () {
      return d3.select(this).classed('notranslate') || isMainLanguage;
    });
  }

  // LISTEN TO CHANGES IN G_LANGUAGE COOKIES
  function listenCookieChange(callback, interval = 1000) {
    let lastCookie = null;
    setInterval(() => {
      let cookie = document.cookie;
      if (cookie !== lastCookie) {
        try {
          callback({ oldValue: lastCookie, newValue: cookie });
        } finally {
          if (!lastCookie) {
            new google.translate.TranslateElement(
              {
                pageLanguage: 'en',
                layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
              },
              'google_translate_element',
            );
          }
          lastCookie = cookie;
        }
      }
    }, interval);
  }

  let langset = false;
  listenCookieChange(({ oldValue, newValue }) => {
    let seengtranslate = false;
    let lang = language;

    const url = new URL(window.location);
    let urlLang = null;
    const pathname = url.pathname.substring(1);
    if (pathname.split('/').length > 1) {
      urlLang = `${pathname.split('/')[0]}`;
    }

    if (!oldValue && urlLang && !langset) {
      setCookie('googtrans', `/en/${urlLang}`, 1);
      langset = true;
      return;
    }

    newValue.split('; ').forEach((cookie) => {
      const [name, value] = cookie.split('=');
      if (name === 'googtrans') {
        seengtranslate = true;
        lang = value.split('/')[2];
        updateDomTree(lang);
        rewriteUrl(lang);
      }
    });

    if (!seengtranslate) rewriteUrl('en', true);
    // && !['pt','es','fr'].includes(urlLang)
  }, 1000);
}
