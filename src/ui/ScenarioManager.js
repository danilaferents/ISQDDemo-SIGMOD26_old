import { scenario } from '../state/AppState.js';
import { renderer } from '../core/ThreeScene.js';
import { setMapOverlayVisible } from '../core/TrainSimulation.js';
import { updateHudTopInset } from '../utils/domHelpers.js';
import { renderGraph } from '../graphs/LatencyGraph.js';
import { renderTopology } from '../graphs/TopologyGraph.js';

const scenarioVizBtn   = document.getElementById('scenarioViz');
const scenarioTopoBtn  = document.getElementById('scenarioTopo');
const scenarioShotsBtn = document.getElementById('scenarioShots');

const topologyHUDEl = document.getElementById('topologyHUD');
const snapshotsHUDEl = document.getElementById('snapshotsHUD');
const setupHUDEl = document.getElementById('setupHUD');

function setBtnActive(btn, on) {
  btn?.classList.toggle('active', !!on);
}

export function applyScenarioLayout() {
  const mapOn = scenario.map;
  const topoOn = scenario.topo;
  const shotsOn = scenario.shots;

  const noOverlap = mapOn && topoOn && shotsOn;
  document.body.classList.toggle('noOverlapHUD', noOverlap);

  setBtnActive(scenarioVizBtn, mapOn);
  setBtnActive(scenarioTopoBtn, topoOn);
  setBtnActive(scenarioShotsBtn, shotsOn);

  renderer.domElement.style.display = mapOn ? 'block' : 'none';

  if (snapshotsHUDEl) snapshotsHUDEl.style.display = shotsOn ? 'block' : 'none';
  if (topologyHUDEl) topologyHUDEl.style.display = topoOn ? 'block' : 'none';

  if (!mapOn && !topoOn && !shotsOn) {
    renderer.domElement.style.display = 'none';
    if (topologyHUDEl) topologyHUDEl.style.display = 'none';
    if (snapshotsHUDEl) snapshotsHUDEl.style.display = 'none';
    document.body.classList.remove('splitMode','soloTopo','soloShots');
    updateHudTopInset(setupHUDEl);
    return;
  }

  const split = !mapOn && (topoOn || shotsOn);
  document.body.classList.toggle('splitMode', split);
  document.body.classList.remove('soloTopo', 'soloShots');

  if (shotsOn) { renderGraph(); }
  if (topoOn) renderTopology();

  setMapOverlayVisible(mapOn);
  updateHudTopInset(setupHUDEl);
}

export function initScenarioManager() {
  scenarioVizBtn?.addEventListener('click', () => { scenario.map = !scenario.map; applyScenarioLayout(); });
  scenarioTopoBtn?.addEventListener('click', () => { scenario.topo = !scenario.topo; applyScenarioLayout(); });
  scenarioShotsBtn?.addEventListener('click', () => { scenario.shots = !scenario.shots; applyScenarioLayout(); });

  scenario.map = true;
  applyScenarioLayout();
}
