import { fullVocabulary } from '/vocabulary/index.js';
import { POST } from '/js/fetch.js';
import { d3 } from '/js/globals.js';

let cachedLanguage = null;
export async function getCurrentLanguage() {
  if (cachedLanguage) {
    return cachedLanguage;
  }
  let language = JSON.parse(
    d3.select('data[name="page"]')?.node()?.value ?? '{}',
  )?.language;
  if (!language) {
    const { languages } = await POST('/load/metadata', {
      feature: 'languages',
    });
    const url = new URL(window.location);
    const pathlang = url.pathname.substring(1).split('/')[0];

    if (languages.some((d) => d === pathlang)) {
      language = pathlang;
    } else {
      language = 'en';
    }
  }
  cachedLanguage = language;
  return language;
}

let cachedLanguages = null;
export async function getRegisteredLanguages() {
  if (cachedLanguages) {
    return cachedLanguages;
  }
  let { languages } = JSON.parse(
    d3.select('data[name="site"]').node()?.value ?? '{}',
  );
  if (!languages?.length) {
    languages = (await POST('/load/metadata', { feature: 'languages' }))
      .languages;
  }
  cachedLanguages = languages;
  return languages;
}

const cachedTranslations = {};
export async function getTranslations(language) {
  if (!language) {
    language = await getCurrentLanguage();
  }
  if (cachedTranslations[language]) {
    return cachedTranslations[language];
  }
  const vocabulary = {};
  const translations = await fullVocabulary();
  Object.keys(translations).forEach((d) => {
    vocabulary[d] = translations[d][language];
  });
  cachedTranslations[language] = vocabulary;
  return vocabulary;
}
