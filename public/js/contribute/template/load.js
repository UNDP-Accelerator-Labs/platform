import { renderTemplate } from '/js/contribute/template/render.js';
import { partialSave } from '/js/contribute/template/save.js';
import { initToolbarInteractions } from '/js/contribute/template/toolbar.interactions.js';
import { d3 } from '/js/globals.js';
import { getMediaSize } from '/js/main.js';

async function onLoad() {
  const mediaSize = getMediaSize();
  const { metafields } = JSON.parse(
    d3.select('data[name="template"]').node()?.value,
  );

  await renderTemplate();
  await initToolbarInteractions(metafields);

  const main = d3.select('main');
  const head = main.select('.head');

  // ADD THE INTERACTION BEHAVIOR FOR THE TITLE INPUT
  head
    .select('.title')
    .on('keydown', function () {
      const evt = d3.event;
      if (evt.code === 'Enter' || evt.keyCode === 13) {
        evt.preventDefault();
        this.blur();
      }
    })
    .on('blur', async (_) => await partialSave('title'));

  // ADD THE INTERACTION BEHAVIOR FOR THE DESCRIPTION INPUT
  d3.select('.description-layout .txt-container.lead')
    .on('click', function () {
      d3.select(this).classed('focus', true);
    })
    .select('.media-txt')
    .on('blur', async (_) => await partialSave('description'));

  // ADD THE INTERACTION BEHAVIOR FOR THE SAVE BUTTON ON sm DISLAYS
  d3.select(`div.save.${mediaSize} form button`).on(
    'click',
    async (_) => await partialSave(),
  );

  // ADD THE INTERACTION BEHAVRIOR FOR THE SLIDESHOW TOGGLE
  d3.select('input#slideshow-status').on(
    'change',
    async (_) => await partialSave(),
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', onLoad);
} else {
  onLoad();
}