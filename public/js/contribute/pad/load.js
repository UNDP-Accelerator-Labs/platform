import { initGTranslate } from '/js/config/gtranslate.js';
import { selectReviewLanguage } from '/js/contribute/pad/main.js';
import { renderPad } from '/js/contribute/pad/render.js';
import { partialSave, saveAndSubmit } from '/js/contribute/pad/save.js';
import { initToolbarInteractions } from '/js/contribute/pad/toolbar.interactions.js';
import { getMediaSize } from '/js/main.js';

async function onLoad() {
  const mediaSize = getMediaSize();

  await initGTranslate();

  const { id, type, source } = JSON.parse(
    d3.select('data[name="pad"]').node()?.value,
  );
  const { metafields } = JSON.parse(
    d3.select('data[name="site"]').node()?.value,
  );
  const mainobject = d3.select('data[name="object"]').node()?.value;

  const main = d3.select(`#${mainobject}`);
  await renderPad({ object: mainobject, type, id, main });
  await initToolbarInteractions({ metafields, type, main });

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

  // ADD THE INTERACTION FOR THE SAVE BUTTON ON sm DISLAYS
  d3.select(`div.save.${mediaSize} form button`).on(
    'click',
    async (_) => await partialSave(),
  );
  // ADD THE INTERACTION FOR THE SAVE BUTTON FOR PUBLIC MOBILIZAIONS
  d3.select('button#save-and-submit').on('click', function () {
    saveAndSubmit(this);
  });
  // ADD THE INTERACTION FOR THE REQUEST FOR REVIEW
  d3.select('button#submit-for-review').on('click', function () {
    selectReviewLanguage(this);
  });
  // SET UP THE ADJACENT DISPLAYS IF RELEVANT
  // FOR SOURCE
  if (d3.select('#source').node()) {
    const mainsource = d3.select(`#source`);

    if (['xs', 'sm'].includes(mediaSize)) {
      // xs AND sm DISPLAYS DO NOT SUPPORT ADJACENT VIEWS
      mainsource.remove();
      d3.selectAll('.split-screen').classed('split-screen', false);
    } else {
      await renderPad({
        object: 'source',
        type: undefined,
        id: source,
        main: mainsource,
      });

      const url = new URL(window.location);
      if (!window.queryparams)
        window.queryparams = new URLSearchParams(url.search);
      window.queryparams.delete('display');

      d3.select('div.display-source a').attr(
        'href',
        `?${window.queryparams.toString()}`,
      );
    }
  } else if (d3.select('div.display-option.display-source').node()) {
    const url = new URL(window.location);
    if (!window.queryparams)
      window.queryparams = new URLSearchParams(url.search);
    window.queryparams.set('display', 'adjacent-source');

    d3.select('div.display-source a').attr(
      'href',
      `?${window.queryparams.toString()}`,
    );
  }
  // OR FOR REVIEW
  if (d3.selectAll('main.review').size()) {
    const mainreviews = d3.selectAll('#reviews main.review');
    if (['xs', 'sm'].includes(mediaSize)) {
      // xs AND sm DISPLAYS DO NOT SUPPORT ADJACENT VIEWS
      mainreviews.each(function () {
        d3.select(this).remove();
      });
      d3.selectAll('.split-screen').classed('split-screen', false);
    } else {
      for (let i = 0; i < mainreviews.size(); i++) {
        const node = mainreviews.nodes()[i];
        const { id, idx } = node.dataset;
        await renderPad({
          object: 'review',
          type: undefined,
          id,
          main: d3.select(node),
        });
      }

      const url = new URL(window.location);
      if (!window.queryparams)
        window.queryparams = new URLSearchParams(url.search);
      window.queryparams.delete('display');

      d3.select('div.display-reviews a').attr(
        'href',
        `?${window.queryparams.toString()}`,
      );
    }
  } else if (d3.select('div.display-option.display-reviews').node()) {
    const url = new URL(window.location); // url IS ALREADY DEFINED SOMEWHERE ELSE
    if (!window.queryparams)
      window.queryparams = new URLSearchParams(url.search);
    window.queryparams.set('display', 'adjacent-reviews');

    d3.select('div.display-reviews a').attr(
      'href',
      `?${window.queryparams.toString()}`,
    );
  }

  d3.select('button.publish')
    .on('click', function () {
      this.focus();
    })
    .on('focus.dropdown', function () {
      const form = d3.select(this.form);
      const dropdown = form.select('.dropdown');
      if (dropdown.node()) {
        if (dropdown.node().style.maxHeight)
          dropdown.node().style.maxHeight = null;
        else
          dropdown.node().style.maxHeight = `${Math.min(
            dropdown.node().scrollHeight,
            300,
          )}px`;
        dropdown
          .selectAll('button')
          .on('mousedown', (_) => d3.event.preventDefault());
      }
    })
    .on('blur.dropdown', function () {
      const form = d3.select(this.form);
      const dropdown = form.select('.dropdown');
      if (dropdown.node()) dropdown.node().style.maxHeight = null;
    });
}

window.addEventListener('load', onLoad);
