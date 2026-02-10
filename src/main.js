import * as THREE from 'three';
import { INIT } from './state/config.js';
import {
  activeConfig, setActiveConfig, exp, resetExperimentGraph,
  settings, scenario, trainData, nowMs
} from './state/AppState.js';
import { renderer, scene, camera, controls, setOrbitView, handleResize } from './core/ThreeScene.js';
import { loadModel } from './core/ModelLoader.js';
import {
  setMapOverlayVisible, buildEdgeCenters, initTrainConnections,
  ensureTrainCount, updateConnections, animateTrainsWithSpeed
} from './core/TrainSimulation.js';
import { renderGraph } from './graphs/LatencyGraph.js';
import { renderDeployGraph } from './graphs/DeploymentGraph.js';
import { renderTopology } from './graphs/TopologyGraph.js';
import {
  initControlPanel, setConfigTitleFromActive, setRunStateLabel,
  readFormConfig, getApplyConfigBtn, getStopBtn, getResetViewBtn
} from './ui/ControlPanel.js';
import { initScenarioManager, applyScenarioLayout } from './ui/ScenarioManager.js';
import { initSnapshotsPanel, addSnapshot } from './ui/SnapshotsPanel.js';
import { initTrainSettings, syncUI } from './ui/TrainSettings.js';
import { updateHudTopInset, setLiveGraphsVisible } from './utils/domHelpers.js';
import { clampY, clampEven } from './utils/mathHelpers.js';

// DOM refs
const setupHUDEl = document.getElementById('setupHUD');
const liveGraphsSectionEl = document.getElementById('liveGraphsSection');
const applyConfigBtn = getApplyConfigBtn();
const stopBtn = getStopBtn();
const resetViewBtn = getResetViewBtn();

// Initialize all UI
initControlPanel();
initScenarioManager();
initSnapshotsPanel();
initTrainSettings();

// Experiment data generation
function genBaseline() {
  const base = 60;
  const jitter = (Math.random() - 0.5) * base * 0.35;
  const tinySpike = (Math.random() < 0.01) ? Math.random() * 500 : 0;
  return clampY(base + jitter + tinySpike);
}

// Experiment start/stop
function startExperiment() {
  const cfg = readFormConfig();
  setActiveConfig(cfg);

  setConfigTitleFromActive();

  setLiveGraphsVisible(liveGraphsSectionEl, true);
  setRunStateLabel('running');

  settings.trainCount = activeConfig.mobileNodes;
  syncUI();
  ensureTrainCount(settings.trainCount);

  const edgeCount = Math.max(2, activeConfig.totalNodes);
  buildEdgeCenters(edgeCount);
  initTrainConnections();
  setMapOverlayVisible(scenario.map);

  settings.speedActive = settings.speedUser;

  resetExperimentGraph();
  exp.running = true;
  exp.startMs = nowMs();
  exp.lastTopoEventMs = exp.startMs;
  exp.stopMs = exp.startMs;

  stopBtn.disabled = false;
  applyConfigBtn.textContent = 'Apply (Restart)';

  clearInterval(exp.tickTimer);
  exp.tickTimer = setInterval(() => {
    if (!exp.running) return;

    const tMs = nowMs();
    const tSec = (tMs - exp.startMs) / 1000;

    const sinceTopo = tMs - exp.lastTopoEventMs;
    const topoEvent = sinceTopo >= activeConfig.topoChangeMs;
    if (topoEvent) exp.lastTopoEventMs = tMs;

    if (activeConfig.reconfigMode === 'holistic') {
      const base = genBaseline();

      if (topoEvent && exp.holistic.phase === 'idle') {
        exp.holistic.phase = 'ramping';
        exp.holistic.rampStartMs = tMs;
        exp.holistic.baseAtRampStart = base;
        exp.holistic.jumpTarget = clampY(3500 + Math.random() * 2500);
      }

      if (exp.holistic.phase === 'idle') {
        exp.points.push({ tSec, v: base });
      } else if (exp.holistic.phase === 'ramping') {
        const u = (tMs - exp.holistic.rampStartMs) / exp.holistic.rampDurationMs;
        const uu = Math.min(1, Math.max(0, u));
        const eased = uu * uu * (3 - 2 * uu);

        const v = exp.holistic.baseAtRampStart +
          eased * (exp.holistic.jumpTarget - exp.holistic.baseAtRampStart) +
          (Math.random() - 0.5) * 120;

        exp.points.push({ tSec, v: clampY(v) });

        if (uu >= 1) {
          exp.holistic.phase = 'frozen';
          exp.frozen = true;
        }
      }
    }

    if (activeConfig.reconfigMode === 'incremental') {
      const baseline = genBaseline();
      if (topoEvent) {
        const spike = 900 + Math.random() * 250;
        exp.points.push({ tSec, v: clampY(spike) });
      } else {
        exp.points.push({ tSec, v: baseline });
      }
    }

    if (scenario.shots) renderGraph();
  }, 10);

  if (scenario.shots) { renderGraph(); }
}

function stopExperiment() {
  if (!exp.running) return;

  if (scenario.shots) { renderGraph(); renderDeployGraph(); }

  exp.running = false;
  exp.stopMs = nowMs();

  clearInterval(exp.tickTimer);
  exp.tickTimer = null;

  exp.scrollAfterStop = false;
  settings.speedActive = 0;

  stopBtn.disabled = true;

  addSnapshot();

  setLiveGraphsVisible(liveGraphsSectionEl, false);
  setRunStateLabel(`stopped @ ${((exp.stopMs - exp.startMs)/1000).toFixed(1)}s`);
}

applyConfigBtn.addEventListener('click', startExperiment);
stopBtn.addEventListener('click', stopExperiment);

// Reset
function resetRunAndTrainsToStart() {
  exp.running = false;
  exp.frozen = false;
  exp.scrollAfterStop = false;

  clearInterval(exp.tickTimer);
  exp.tickTimer = null;

  exp.points = [];
  exp.lastTopoEventMs = 0;
  exp.startMs = 0;
  exp.stopMs = 0;

  settings.speedActive = 0;

  for (let i = 0; i < trainData.length; i++) trainData[i].u = 0;

  stopBtn.disabled = true;
  applyConfigBtn.textContent = 'Apply (Start)';

  setConfigTitleFromActive();
  setRunStateLabel('idle');

  setLiveGraphsVisible(liveGraphsSectionEl, true);

  if (scenario.shots) { renderGraph(); renderDeployGraph(); }
}

resetViewBtn?.addEventListener('click', () => {
  setOrbitView(controls.target, INIT.cam.dist, INIT.cam.yaw, INIT.cam.elev);
  resetRunAndTrainsToStart();
});

// Load model
loadModel(scene, controls, () => {
  setOrbitView(controls.target, INIT.cam.dist, INIT.cam.yaw, INIT.cam.elev);

  ensureTrainCount(settings.trainCount);
  for (let i = 0; i < trainData.length; i++) trainData[i].u = i / Math.max(1, trainData.length);

  const edgeCount = Math.max(2, activeConfig.totalNodes);
  buildEdgeCenters(edgeCount);
  initTrainConnections();

  setMapOverlayVisible(scenario.map);
});

// Animation loop
const clock = new THREE.Clock();

function animate() {
  const dt = Math.min(clock.getDelta(), 0.05);

  animateTrainsWithSpeed(dt, settings.speedActive);
  updateConnections();

  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();

// Resize
addEventListener('resize', () => {
  handleResize();
  renderGraph();
  renderDeployGraph();
  renderTopology();
  updateHudTopInset(setupHUDEl);
});

// Initial canvas render
renderGraph();
renderDeployGraph();
renderTopology();
updateHudTopInset(setupHUDEl);
