import { Exploration } from '/js/exploration.js';
import { d3 } from '/js/globals.js';
// INIT EXPLORATION

function initExploration() {
  const pad = JSON.parse(d3.select('data[name="pad"]')?.node()?.value);
  const exploration = new Exploration();
  exploration.setUseFullPromptForSelect(true);
  exploration.updateExplorationList(() => {
    const docBtn = d3.select('div.exploration-local');
    const data = { id: pad.id };
    if (data.id) {
      docBtn.data([data]);
      exploration.setVisible(true);
      exploration.addDocButtons(docBtn, false);
    }
  });
  return exploration;
}

let cachedExploration = null;

export async function getExploration() {
  if (!cachedExploration) {
    cachedExploration = initExploration();
  }
  return cachedExploration;
}
