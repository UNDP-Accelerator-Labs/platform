import { getTranslations } from '/js/config/main.js';
import { d3 } from '/js/globals.js';

// INSPIRED BY https://stackoverflow.com/questions/995168/textarea-to-resize-based-on-content-length
export async function changeLabel(node, focus) {
  const vocabulary = await getTranslations();
  for (const label of node.labels) {
    const sel = d3.select(label);
    const username = d3.select('data[name="username"]').node()?.value;
    if (focus || node.value.trim().length > 0) sel.html(username);
    else sel.html(vocabulary['comment publicly']);
  }
}

export function adjustarea(node) {
  node.style.height = `${node.scrollHeight - 20}px`; // WE HAVE A 2x10px PADDING IN THE CSS
  const submit = d3
    .select(node.parentNode)
    .select('button[type=submit]')
    .node();
  submit.disabled = node.value.trim().length === 0;
}
