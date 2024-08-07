import { getTranslations } from '/js/config/main.js';
import { POST } from '/js/fetch.js';
import { d3 } from '/js/globals.js';
import { renderFormModal } from '/js/modals.js';

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

export async function selectReviewLanguage(node) {
  const vocabulary = await getTranslations();
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
  // const new_constraint =
  await renderFormModal({ message, formdata, opts });
}

export function nextMissingVal () {
  let nextMedia = d3.select('.media-container .required');
  let nextMeta = d3.select('.meta-container .required');

  if (nextMedia.node()) nextMedia = nextMedia.findAncestor('media-container');
  if (nextMeta.node()) nextMeta = nextMeta.findAncestor('meta-container');

  const targets = [];
  
  d3.selectAll('.media-container, .meta-container')
  .each(function (d) {
    const sel = d3.select(this);
    if (d?.required && !d?.has_content) {
      const { y } = this.getBoundingClientRect();
      targets.push(y);

      sel.selectAll('.media, .meta')
      .classed('status-0', true)
    } else {
      sel.selectAll('.media, .meta')
      .classed('status-0', false)
    }
  });
  
  if (targets.length) {
    window.scrollTo({
      top: targets[0] - 60, // THE -60 IS TO COMPENSATE FOR THE TOP BAND (WHERE THE BUTTON IS)
      left: 0,
      behavior: 'smooth',
    });
  }
  else return null;
}
