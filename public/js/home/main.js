window.addEventListener('DOMContentLoaded', async function DOMLoad() {
  const { display } = d3.select('.slides').node().dataset;
  if (display === 'carousel') {
    await renderCarousel();
  } else if (display === 'mosaic') {
    await renderMosaic();
  }
});
// THIS IS NOT USED FOR NOW
async function selectCountry() {
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

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', DOMLoad);
} else {
  DOMLoad();
}
