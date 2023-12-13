import { getCurrentLanguage } from '/js/config/main.js';
import { d3 } from '/js/globals.js';
import { getContent, getMediaSize } from '/js/main.js';

export async function renderCarousel() {
  const language = await getCurrentLanguage();
  // const page = JSON.parse(d3.select('data[name="page"]').node().value);

  const container = d3.select('.slides');
  const panel = container.findAncestor('panel');
  const dots = panel.select('.dots');

  const slides = await getContent({ feature: 'samples' });
  if (!slides.length) return panel.remove();

  const slide = container
    .addElems('div', 'slide', slides)
    .addElems('a')
    .attr('href', (d) => `/${language}/view/pad?id=${d.id}`);
  const txt = slide.addElems('div', 'media media-txt');
  txt.addElems('p', 'country').html((d) => d.country);
  txt.addElems('h1', 'title').html((d) => d.title);
  txt.addElems('p', 'snippet').html((d) => {
    if (d.txt?.[0]?.length > 500) {
      return `${d.txt?.[0]
        .slice(0, 500)
        ?.replace(/<\/?[^>]+(>|$)/gi, '')
        .trim()}…`;
    } else {
      return d.txt?.[0]?.replace(/<\/?[^>]+(>|$)/gi, '').trim();
    }
  });
  slide.addElems('img').attr('src', (d) => {
    if (d3.select('data[name="app_storage"]').node()) {
      const app_storage = d3.select('data[name="app_storage"]').node().value;
      return new URL(
        `${app_storage}${d.img[0]?.replace('uploads/sm/', 'uploads/')}`,
      ).href;
    } else {
      return d.img[0]?.replace('uploads/sm/', 'uploads/');
    }
  });

  dots.addElems('div', 'dot', slides);

  animateCarousel(0);
}
function animateCarousel(idx) {
  const carousel = d3.select('.carousel');
  const deck = carousel.select('.slides');
  const slides = carousel.selectAll('.slide');
  const delay = 3000;

  if (idx === slides.size()) idx = 0;
  deck.node().scrollTo({
    top: 0,
    left:
      idx *
      (slides.node().clientWidth ||
        slides.node().offsetWidth ||
        slides.node().scrollWidth),
    behavior: 'smooth',
  });
  slides
    .selectAll('.media-txt')
    .on('mouseover', (_) => clearTimeout(animation))
    .on(
      'mouseout',
      (_) => (animation = setTimeout((_) => animateCarousel(idx + 1), delay)),
    );
  carousel
    .selectAll('.dot')
    .classed('highlight', (d, i) => i === idx)
    .on('click', function (d, i) {
      idx = i;
      clearTimeout(animation);
      animateCarousel(idx);
    });

  let animation = setTimeout((_) => animateCarousel(idx + 1), delay);
}
export async function renderMosaic() {
  const language = await getCurrentLanguage();
  const page = JSON.parse(d3.select('data[name="page"]').node().value);

  const container = d3.select('.slides');
  const panel = container.findAncestor('panel');

  let slides = await getContent({ feature: 'samples' });
  if (!slides.length) return panel.remove();

  // TO DO: LOAD MOSAIC DATA DYNAMICALLY HERE
  const mediaSize = getMediaSize();
  if (mediaSize === 'xs') slides = slides.slice(0, 11);
  else if (mediaSize === 'sm') slides = slides.slice(0, 21);
  else if (mediaSize === 'm') slides = slides.slice(0, 26);
  else if (mediaSize === 'lg') {
    if (page.type === 'private') {
      slides = slides.slice(0, 30);
    } else {
      slides = slides.slice(0, 33);
    }
  } else {
    if (page.type === 'private') {
      slides = slides.slice(0, 40);
    }
  }

  const vignette = container
    .addElems('div', 'slide', slides)
    .addElems('a')
    .attr('href', (d) => `/${language}/view/pad?id=${d.id}`);
  const txt = vignette.addElems('div', 'media media-txt');
  txt.addElems('p', 'country').html((d) => d.country);
  txt.addElems('h1').html((d) => {
    if (d.title?.length > 50) return d.title?.slice(0, 50).trim();
    else return d.title;
  });
  vignette
    .addElems('img')
    .attr('src', (d) => {
      if (d3.select('data[name="app_storage"]').node()) {
        const app_storage = d3.select('data[name="app_storage"]').node().value;
        return new URL(`${app_storage}${d.img[0]}`).href;
      } else {
        return d.img[0];
      }
    })
    .each(function () {
      const imgNode = this;
      const setReady = () => {
        d3.select(imgNode).classed('img-ready', true);
      };
      imgNode.addEventListener('load', setReady);
      if (imgNode.complete) {
        setReady();
      }
    });

  window.onresize = (evt) => {
    renderMosaic();
  };
}
