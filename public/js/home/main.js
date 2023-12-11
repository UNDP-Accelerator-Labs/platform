import { getTranslations } from '/js/config/main';
import { renderPromiseModal } from '/js/modals.js';

// THIS IS NOT USED FOR NOW
async function selectCountry() {
  const vocabulary = await getTranslations();
  // GET COUNTRIES
  // const target_opts = <%- JSON.stringify(locals.countries) %>.map(d => {
  // return { label: d.name, value: d.iso3, type: 'radio' }
  // })

  const message =
    'Get in touch with the UNDP Accelerator Lab Head of Solutions Mapping in your country.'; // TO DO: TRANSLATE
  const opts = [
    {
      node: 'select',
      name: 'mobilization',
      label: 'Select a country',
      options: target_opts,
    }, // TO DO: TRANSLATE
    {
      node: 'button',
      type: 'button',
      label: vocabulary['import'],
      resolve: (_) =>
        d3.select('.modal .filter .dropdown input[type=radio]:checked').node()
          .value,
    },
  ];
  const mobilization = await renderPromiseModal({ message, opts });
}
