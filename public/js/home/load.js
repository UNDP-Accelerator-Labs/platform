import { d3 } from '/js/globals.js';
import { clearExploration } from '/js/home/exploration.js';
import { renderCarousel, renderMosaic } from '/js/home/render.js';

async function onLoad() {
  const { display } = d3.select('.slides').node().dataset;
  if (display === 'carousel') {
    await renderCarousel();
  } else if (display === 'mosaic') {
    await renderMosaic();
  }

  clearExploration();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', onLoad);
} else {
  await onLoad();
}
