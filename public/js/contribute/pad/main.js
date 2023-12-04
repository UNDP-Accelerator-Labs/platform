// INIT THE SOCKET
// const socket = io()
// const socket = io.connect('localhost:3000', {
// 	reconnection: true,
// 	reconnectionDelay: 1000,
// 	reconnectionDelayMax : 5000,
// 	reconnectionAttempts: Infinity
// })

// THE FOLLOWING IS INSPIRED BY:
// https://www.programmersought.com/article/5248306768/
// https://stackoverflow.com/questions/926916/how-to-get-the-bodys-content-of-an-iframe-in-javascript

async function DOMLoad() {
  if (!mediaSize) var mediaSize = getMediaSize();
  const { id, type, source } = JSON.parse(
    d3.select('data[name="pad"]').node()?.value,
  );
  const { metafields } = JSON.parse(
    d3.select('data[name="site"]').node()?.value,
  );
  const mainobject = d3.select('data[name="object"]').node()?.value;

  // if (typeof initExploration !== undefined) { initExploration(); }

  const main = d3.select(`#${mainobject}`);
  await renderPad({ object: mainobject, type, id, main });
  initToolbarInteractions({ metafields, type, main });

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
      if (!queryparams) var queryparams = new URLSearchParams(url.search);
      queryparams.delete('display');

      d3.select('div.display-source a').attr(
        'href',
        `?${queryparams.toString()}`,
      );
    }
  } else if (d3.select('div.display-option.display-source').node()) {
    const url = new URL(window.location);
    if (!queryparams) var queryparams = new URLSearchParams(url.search);
    queryparams.set('display', 'adjacent-source');

    d3.select('div.display-source a').attr(
      'href',
      `?${queryparams.toString()}`,
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
      if (!queryparams) var queryparams = new URLSearchParams(url.search);
      queryparams.delete('display');

      d3.select('div.display-reviews a').attr(
        'href',
        `?${queryparams.toString()}`,
      );
    }
  } else if (d3.select('div.display-option.display-reviews').node()) {
    const url = new URL(window.location); // url IS ALREADY DEFINED SOMEWHERE ELSE
    if (!queryparams) var queryparams = new URLSearchParams(url.search);
    queryparams.set('display', 'adjacent-reviews');

    d3.select('div.display-reviews a').attr(
      'href',
      `?${queryparams.toString()}`,
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

/* // THIS WAS THE OLD LOGIC FOR LOADING ADJACENT PADS
function loadHTML(url, source, target) {
	const iframe = document.createElement('iframe')
	iframe.style.display = 'none'
	iframe.src = url

	if (iframe.attachEvent){
		iframe.attachEvent('onload', function () {
			extractTarget(this, source, target)
		})
	} else {
		iframe.onload = function () {
			extractTarget(this, source, target)
		}
	}

	// TO DO: FINISH HERE
	// renderPad()

	function extractTarget (node, source, target) {
		const doc = d3.select(node.contentDocument || node.contentWindow.document)
			.select(source)
			.attr('id', 'reference')
			// .classed('split-screen', true)
		doc.selectAll('.focus').classed('focus', false)
		doc.select('.pad > .inner > .meta-status').remove()
		doc.select('.pad > .inner > .meta-info').remove()
		doc.select('.pad > .inner > .scroll-nav').remove()
		doc.select('.media-input-group').remove()
		d3.select(target).html(doc.node().outerHTML)
		d3.select(node).remove()
	}
	document.body.appendChild(iframe)
}
*/

async function selectReviewLanguage(node) {
  // THIS IS ALMOST THE SAME AS IN /browse/index.js
  // TO DO: THIS STILL NEEDS SOME WORK
  const { name, value } = node;
  const { id } = JSON.parse(d3.select('data[name="pad"]').node()?.value);

  const target_opts = await POST('/load/templates', { space: 'reviews' }).then(
    (results) => {
      return results.data.map((d) => {
        return {
          label: d.name,
          value: d.language,
          count: d.count,
          disabled: {
            value: d.disabled,
            label: vocabulary['missing reviewers'],
          },
          type: 'radio',
          required: true,
        };
      });
    },
  );

  const formdata = { action: '/request/review', method: 'POST' };
  const message = vocabulary['select review language'];
  const opts = [];
  opts.push({
    node: 'select',
    name: 'language',
    label: vocabulary['select language']['singular'],
    options: target_opts,
  });
  opts.push({
    node: 'input',
    type: 'hidden',
    name: 'id',
    value: id,
  });
  opts.push({
    node: 'button',
    type: 'submit',
    name: name,
    value: value,
    label: vocabulary['submit for review'],
  });
  const new_constraint = await renderFormModal({ message, formdata, opts });
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', DOMLoad);
} else {
  DOMLoad();
}
