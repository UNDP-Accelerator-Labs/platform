import { POST } from '/js/fetch.js';
import { limitLength, updateTab } from '/js/main.js';
// THIS IS TO SAVE PPINBOARDS
export async function partialSave(object, id) {
  if (!object) object = 'pinboard';

  if (object === 'pinboard') {
    let title = d3.select('main .inner .head .title').node().innerText.trim();
    if (title) title = limitLength(title, 99);
    const description = d3
      .select('main .inner .head .description.lead')
      .node()
      .innerHTML.trim();
    const displayopts = {};

    d3.selectAll('#pinboard-display-opts input[type=checkbox]').each(
      function () {
        displayopts[this.name] = this.checked;
      },
    );

    const res = await POST(
      '/save/pinboard',
      Object.assign(displayopts, { id, title, description }),
    );
    if (res.status === 200) {
      console.log('saved');
      const { datum } = res;
      updateTab(datum.title);

      // TO DO: UPDATE THIS TO USE THE RENDER FUNCTIONS BELOW
      // d3.selectAll('.pin, .pinboard').html(d => d.title = datum.title)
      d3.selectAll('.pin label.name').html((d) => (d.title = datum.title));
    }
  } else if (object.includes('section')) {
    console.log('save section');

    const li = d3.select('.pinboard-sections li.editing');

    const obj = {};
    obj.id = id;

    if (object === 'section-title') {
      obj.title =
        li.select('button div.section-title').node()?.innerText.trim() || '';
    } else if (object === 'section-description') {
      obj.description =
        d3
          .select('div.pinboard-sections-container div.description')
          .node()
          ?.innerText.trim() || '';
    }

    const res = await POST('/save/pinboard-section', obj);
    if (res.status === 200) {
      console.log('saved');

      if (li.node()) {
        li.classed('editing', false);
        li.select('div').classed('focus', false);
        const a = li.select('a');

        if (a.node()) {
          const href = a.attr('data-href');
          a.attrs({
            href: href,
            'data-href': null,
          });
          li.select('button div.section-title').node().contentEditable = false;
        }
      }
    }
  }
}
