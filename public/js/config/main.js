import { fullVocabulary } from '/js/config/translations.js';
import { POST } from '/js/fetch.js';

async function getCurrentLanguage () {
  let language = d3.select('data[name="page"]')?.node()?.value?.language;
  if (language) {
    return language
  } else {
    const { languages } = await POST('/load/metadata', { feature: 'languages' });
    const url = new URL(window.location);
    const pathlang = url.pathname.substring(1).split('/')[0];
    
    if (languages.some((d) => d === pathlang)) {
      return pathlang;
    } else {
      return 'en';
    }
  }
}
async function getRegisteredLanguages () {
  let { languages } = JSON.parse(
    d3.select('data[name="site"]').node()?.value || '{}',
  );
  if (!languages?.length) {
    languages = (await POST('/load/metadata', { feature: 'languages' })).languages;
  }
  return languages
}
async function getTranslations (language) {
  if (!language) {
    language = await getCurrentLanguage()
  };
  const vocabulary = {};
  Object.keys(fullVocabulary).forEach((d) => {
    vocabulary[d] = fullVocabulary[d][language];
  });
  return vocabulary;
}

export const language = await getCurrentLanguage();
export const languages = await getRegisteredLanguages();
export const vocabulary = await getTranslations();