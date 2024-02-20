import { d3 } from '/js/globals.js';

let renderCount = 0;

export function isLoading(value) {
  if (value) {
    renderCount += 1;
    // NOTE: ensures spinner is only shown if an action takes longer than 500ms
    setTimeout(() => {
      if (renderCount > 0) {
        d3.select('#loader').style('display', 'block');
      }
    }, 500);
  } else {
    renderCount -= 1;
    // NOTE: ensures spinner is never shown shorter than 200ms which causes blinking
    setTimeout(() => {
      if (renderCount <= 0) {
        d3.select('#loader').style('display', 'none');
      }
    }, 200);
  }
}
