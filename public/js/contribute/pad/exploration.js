import { Exploration } from '/js/exploration.js';
// INIT EXPLORATION
export function initExploration() {
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
}
