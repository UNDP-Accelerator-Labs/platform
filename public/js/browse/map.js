import { Entry } from '/js/browse/render.js';
import { getCurrentLanguage, getTranslations } from '/js/config/main.js';
import { POST } from '/js/fetch.js';
import { L, d3 } from '/js/globals.js';
import { getContent, multiSelection } from '/js/main.js';

async function onLoad() {
  const object = d3.select('data[name="object"]').node().value;
  const space = d3.select('data[name="space"]').node().value;
  const page = JSON.parse(d3.select('data[name="page"]').node().value);
  let { lnglat: centerpoint } = JSON.parse(
    d3.select('data[name="location"]').node().value,
  );
  if (!centerpoint) centerpoint = null;

  let clusters = await getContent({ feature: 'locations' });
  clusters = clusters.filter((cur) => cur !== null);

  // THE LEAFLET CODE
  const drawMap = true;

  if (drawMap) {
    const map = L.map('map', { boxZoom: false, minZoom: 2 });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap contributors</a>',
      maxZoom: 19,
    }).addTo(map);

    if (!clusters.length) {
      if (!centerpoint) {
        map.fitWorld();
      } else {
        map.setView([centerpoint.lat, centerpoint.lng], 2);
      }
    } else {
      d3.select('.map-container').classed('hide', false);

      // const singlepin =
      L.divIcon({
        className: 'single-pin',
        iconAnchor: [0, 24],
        labelAnchor: [-6, 0],
        popupAnchor: [0, -36],
        html: '<i class="material-icons google-translate-attr">place</i>',
      });

      clusters.forEach((d) => {
        const markerScale = d3
          .scaleLinear()
          .domain([1, d3.max(d, (c) => c.properties.count)])
          .range([10, 50]);

        d.markers = d.map((c) => {
          const clusterpin = L.divIcon({
            className: 'cluster-pin',
            iconSize: markerScale(c.properties.count),
            popupAnchor: [0, -markerScale(c.properties.count)],
            html: `${c.properties.count}`,
          });
          const marker = L.marker(
            [c.geometry.coordinates[1], c.geometry.coordinates[0]],
            { icon: clusterpin },
          ).on('click', function () {
            return loadPopup(this._popup, c.properties.pads);
          });
          marker.bindPopup();
          return marker;
        });
      });

      async function loadPopup(popup, pads, page = 1) {
        const language = await getCurrentLanguage();
        const vocabulary = await getTranslations(language);
        const { data, count } = await POST(
          `/${language}/browse/pads/${space}`,
          {
            pads,
            page,
          },
        ); // TO DO: CHANGE TO getContent
        const max_pages = Math.ceil(pads.length / count);

        let idx = 0;

        const section = document.createElement('section');
        section.classList.add('container');
        section.classList.add(object);
        // const body =
        d3.select(section)
          .addElems('div', 'layout columns', [data])
          .on('scroll', function () {
            const slide = d3.select(this).select('article');
            const slidewidth =
              slide.node().clientWidth ||
              slide.node().offsetWidth ||
              slide.node().scrollWidth ||
              300;
            if (this.scrollLeft % slidewidth === 0) {
              idx = Math.round(this.scrollLeft / slidewidth);
              d3.selectAll('.dot').classed('highlight', (d, i) => i === idx);
              d3.selectAll('button.slide-nav').classed('hide', (d) => {
                const deck = d3.select('.layout.columns');
                const slides = deck.selectAll('article.pad');
                return (
                  (d.class === 'prev' && idx === 0) ||
                  (d.class === 'next' && idx === slides.size() - 1)
                );
              });
            }
          })
          .each(function (d) {
            const section = d3.select(this);

            d.forEach((c) => {
              const entry = new Entry({
                parent: section,
                data: c,
                display: 'columns',
                language,
                vocabulary,
                object,
                space,
                modules: JSON.parse(
                  d3.select('data[name="site"]').node()?.value,
                ).modules,
                pinboards: JSON.parse(
                  d3.select('data[name="pinboards"]').node()?.value || '[]',
                ),
                engagementtypes: JSON.parse(
                  d3.select('data[name="engagementtypes"]').node()?.value,
                ),
                rights: JSON.parse(
                  d3.select('data[name="rights"]').node()?.value,
                ),
                app_storage: d3.select('data[name="app_storage"]').node()
                  ?.value,
                page,
              });
              // CREATE ALIAS FOR render
              const render = entry.render;
              render.img(entry.head);
              render.actions(entry.head);
              render.title(entry.body);
              render.owner(entry.body);
              if (c.img?.length === 0) render.txt(entry.body);
              if (page === 'private') {
                render.metainfo(entry.body);
                render.followup(entry.body);
              }
              render.tags(entry.body);
              // if (getMediaSize() !== 'xs') render.stats(entry.foot)
              render.engagement(entry.foot);
              render.pin(entry.foot);
              render.delete(entry.outer);
            });

            const pagination = section
              .addElems('nav', 'pagination')
              .addElems('div', 'inner');
            pagination
              .addElems('div', 'caroussel')
              .addElems('div', 'dots')
              .addElems(
                'div',
                'dot',
                new Array(d.length).fill(0).map((c, i) => i + 1),
              );

            pagination
              .addElems('ul')
              .addElems(
                'li',
                null,
                new Array(max_pages).fill(0).map((c, i) => i + 1),
              )
              .addElems('a', 'page-link')
              .classed('active', (c) => c === page)
              .attr('data-page', (c) => c)
              .html((c) => c)
              .on('click', (c) => {
                return loadPopup(popup, pads, c);
              });
          });

        function animateCarousel(idx) {
          const deck = d3.select('.layout.columns');
          const slides = deck.selectAll('article.pad');
          // const delay = 3000;

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
          d3.selectAll('.caroussel .dots .dot')
            .classed('highlight', (d, i) => i === idx)
            .on('click', function (d, i) {
              idx = i;
              animateCarousel(idx);
            });
        }

        popup.setContent(section);
        animateCarousel(0);
      }

      // const locations = clusters.last().markers
      // (<%- JSON.stringify(locals.locations || []) %>).map(d => {
      // 	let centerpoints = d.location?.centerpoints || [d.location?.centerpoint] || []
      // 	centerpoints = centerpoints.filter(c => c?.lat && c?.lng)
      // 	return centerpoints.map(c => {
      // 		return L.marker([c.lat, c.lng], { icon: singlepin })
      // 			// .on('click', _ => window.location = `?pads=${c.id}`)
      // 			.on('click', function () { loadPopup(this._popup, c.id) })
      // 			.bindPopup()
      // 	})
      // }).flat()

      let group;
      const bounds = L.featureGroup(clusters.last().markers);

      if (Math.max(...clusters.map((d) => d.length)) > 1) {
        map.fitBounds(bounds.getBounds(), { padding: [15, 15] });
      } else if (Math.max(...clusters.map((d) => d.length)) === 1) {
        map.fitBounds(bounds.getBounds(), { padding: [15, 15] });
        map.setZoom(10);
      } else {
        map.setView([centerpoint.lat, centerpoint.lng], 2);
      }

      function setZoomLayer(map, group, clusters) {
        const currentZoom = map.getZoom();
        if (group) map.removeLayer(group);

        if (currentZoom < 4) group = L.featureGroup(clusters[0].markers);
        // else if (currentZoom < 6) group = L.featureGroup(clusters[1].markers)
        else group = L.featureGroup(clusters.last().markers);

        group.addTo(map);

        return group;
      }
      group = setZoomLayer(map, group, clusters);

      // ONLY CHANGE CLUSTERS IF THERE ARE DIFFERENT CLUSTER LEVELS IN THE DATA
      if (clusters.length > 1) {
        map.on('zoomend', (_) => {
          group = setZoomLayer(map, group, clusters);
        });
      }

      d3.select('.map-container')
        .call(multiSelection, {
          class: '.leaflet-marker-icon',
          constraint: (evt) => evt.ctrlKey || evt.metaKey,
        })
        .on('mousedown', (_) => {
          const evt = d3.event;
          if (evt.ctrlKey || evt.metaKey) map.dragging.disable();
        })
        .on('mouseup', (_) => {
          map.dragging.enable();
        });

      // SWITCH MAP TYPE: THIS IS NOT USED FOR NOW // TO DO
      d3.selectAll('.map-container a.mtype').each(function () {
        const sel = d3.select(this);
        const url = new URL(window.location);
        const queryparams = new URLSearchParams(url.search);
        queryparams.set('mtype', sel.attr('data-type'));
        sel.attr('href', `?${queryparams.toString()}`);
      });
      // SWITCH MAP SIZE
      d3.select('.map-container a.mscale').attr('href', function () {
        const url = new URL(window.location);
        const queryparams = new URLSearchParams(url.search);
        if (page.mapscale === 'contain') {
          queryparams.set('mscale', 'full-screen');
        } else {
          queryparams.set('mscale', 'contain');
        }
        return `?${queryparams.toString()}`;
      });
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', onLoad);
} else {
  await onLoad();
}
