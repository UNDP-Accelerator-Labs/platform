import { adjustarea, changeLabel } from '/js/contribute/comment/main.js';
import { d3 } from '/js/globals.js';
import { fixLabel } from '/js/main.js';

function onLoad() {
  d3.selectAll('textarea[name="message"]')
    .on('focus', async function () {
      await changeLabel(this, true);
    })
    .on('keyup', function () {
      adjustarea(this);
    })
    .on('change', function () {
      fixLabel(this);
    })
    .on('blur', async function () {
      await changeLabel(this, false);
    });

  d3.selectAll('footer textarea').each(function () {
    adjustarea(this);
  });

  d3.selectAll('.expand-collapsed').on('click', function () {
    const collapsed = this.nextElementSibling;
    if (collapsed.classList.contains('collapsed'))
      collapsed.style.maxHeight = `${collapsed.scrollHeight}px`;
    d3.select(this.remove());
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', onLoad);
} else {
  onLoad();
}
