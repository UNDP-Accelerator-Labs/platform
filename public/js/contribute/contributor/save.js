import { d3 } from '/js/globals.js';

export function partialSave() {
  // CHECK WHETHER GOOD TO SAVE
  const metastatus = d3
    .select('.meta-status')
    .classed('status-0 status-1', false);

  if (
    d3
      .selectAll('input:required')
      .filter(function () {
        return !(this.validity.valid && !this.classList.contains('error'));
      })
      .size() === 0
  ) {
    metastatus
      .classed('status-1', true)
      .select('button')
      .attr('disabled', null);
  } else {
    metastatus
      .classed('status-0', true)
      .select('button')
      .attr('disabled', true);
  }
}
