import { Exploration } from '/js/exploration.js';
import { POST } from '/js/fetch.js';
import { d3 } from '/js/globals.js';
// INIT EXPLORATION

async function initExploration() {
  const pad = JSON.parse(d3.select('data[name="pad"]')?.node()?.value);
  const db = await POST('/load/metadata', { feature: 'ownDB' });
  const exploration = new Exploration(db.ownDB);
  exploration.setUseFullPromptForSelect(true);
  await exploration.updateExplorationList(async () => {
    const docBtn = d3.select('div.exploration-local');
    const data = { id: pad.id };
    if (data.id) {
      docBtn.data([data]);
      exploration.setVisible(true);
      await exploration.addDocButtons(docBtn, false);
    }
  });
  return exploration;
}

let cachedExploration = null;

export async function getExploration() {
  if (!cachedExploration) {
    cachedExploration = await initExploration();
  }
  return cachedExploration;
}
