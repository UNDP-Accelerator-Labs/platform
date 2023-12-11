import { clearExploration } from '/js/home/exploration.js';
import { renderCarousel, renderMosaic } from '/js/home/render.js';

async function DOMLoad() {
  const { display } = d3.select('.slides').node().dataset;
  if (display === 'carousel') {
    await renderCarousel();
  } else if (display === 'mosaic') {
    await renderMosaic();
  }

  clearExploration();
}

if (document.readyState !== 'complete') {
  window.addEventListener('load', DOMLoad);
} else {
  DOMLoad()
    .then(() => {})
    .catch((err) => console.error(err));
}
