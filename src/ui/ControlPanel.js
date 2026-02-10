import { activeConfig, setActiveConfig } from '../state/AppState.js';
import { updateHudTopInset, setControlPanelVisible, setConfigOpen, fillSelectRangeEven } from '../utils/domHelpers.js';
import { clampEven, msToLabel } from '../utils/mathHelpers.js';

const setupHUDEl = document.getElementById('setupHUD');
const hideControlBtn = document.getElementById('hideControlBtn');
const showControlBtn = document.getElementById('showControlBtn');

const totalNodesEl = document.getElementById('totalNodes');
const mobileNodesEl = document.getElementById('mobileNodes');
const cameraModeEl  = document.getElementById('cameraMode');
const reconfigModeEl = document.getElementById('reconfigMode');
const queryModeEl = document.getElementById('queryMode');

const configToggleBtn = document.getElementById('configToggleBtn');
const configFieldsEl  = document.getElementById('configFields');

const configTitleEl = document.getElementById('configTitle');
const runStateTitleEl = document.getElementById('runStateTitle');

let configOpen = true;

export function getSetupHUDEl() { return setupHUDEl; }

export function initControlPanel() {
  // Hide/show control panel
  hideControlBtn?.addEventListener('click', () => {
    setControlPanelVisible(setupHUDEl, showControlBtn, false);
    updateHudTopInset(setupHUDEl);
  });
  showControlBtn?.addEventListener('click', () => {
    setControlPanelVisible(setupHUDEl, showControlBtn, true);
    updateHudTopInset(setupHUDEl);
  });
  setControlPanelVisible(setupHUDEl, showControlBtn, true);
  updateHudTopInset(setupHUDEl);

  // Config selects
  fillSelectRangeEven(totalNodesEl, 2, 16);
  totalNodesEl.value = '8';

  rebuildMobileOptionsPreserveSelection();
  mobileNodesEl.value = '4';

  cameraModeEl.value = '1000';
  reconfigModeEl.value = 'holistic';
  queryModeEl.value = 'stateful';

  setConfigTitleFromActive();
  setRunStateLabel('idle');

  totalNodesEl.addEventListener('change', () => {
    const total = clampEven(parseInt(totalNodesEl.value, 10) || 8, 2, 16);
    totalNodesEl.value = String(total);
    rebuildMobileOptionsPreserveSelection();
    updateHudTopInset(setupHUDEl);
    setConfigTitleFromActive();
  });

  mobileNodesEl.addEventListener('change', () => {
    const total = parseInt(totalNodesEl.value, 10);
    const maxMobile = Math.min(total, 8);
    const m = clampEven(parseInt(mobileNodesEl.value, 10) || 4, 2, maxMobile);
    mobileNodesEl.value = String(m);
    updateHudTopInset(setupHUDEl);
    setConfigTitleFromActive();
  });

  // Config collapse
  configToggleBtn?.addEventListener('click', () => {
    configOpen = !configOpen;
    setConfigOpen(configFieldsEl, configToggleBtn, configOpen, setupHUDEl);
  });
  setConfigOpen(configFieldsEl, configToggleBtn, true, setupHUDEl);
}

function rebuildMobileOptionsPreserveSelection() {
  const total = parseInt(totalNodesEl.value, 10);
  const maxMobile = Math.min(total, 8);
  const current = parseInt(mobileNodesEl.value || '4', 10);
  fillSelectRangeEven(mobileNodesEl, 2, maxMobile);
  const clamped = clampEven(current, 2, maxMobile);
  mobileNodesEl.value = String(clamped);
}

export function setConfigTitleFromActive() {
  const c = activeConfig;
  const fixed = Math.max(0, c.totalNodes);
  const base =
    `${c.mobileNodes} mobile / ${fixed} fixed/ ` +
    `${msToLabel(c.topoChangeMs)} / ${c.reconfigMode} / ${c.queryMode}`;
  if (configTitleEl) configTitleEl.textContent = base;
}

export function setRunStateLabel(text) {
  if (runStateTitleEl) runStateTitleEl.textContent = text;
}

export function readFormConfig() {
  const total = clampEven(parseInt(totalNodesEl.value, 10) || 8, 2, 16);
  totalNodesEl.value = String(total);

  const maxMobile = Math.min(total, 8);
  const mobile = clampEven(parseInt(mobileNodesEl.value, 10) || 4, 2, maxMobile);
  mobileNodesEl.value = String(mobile);

  return {
    totalNodes: total,
    mobileNodes: mobile,
    topoChangeMs: parseInt(cameraModeEl.value, 10),
    reconfigMode: reconfigModeEl.value,
    queryMode: queryModeEl.value
  };
}

export function getApplyConfigBtn() { return document.getElementById('applyConfigBtn'); }
export function getStopBtn() { return document.getElementById('stopBtn'); }
export function getResetViewBtn() { return document.getElementById('resetViewBtn'); }

export { setupHUDEl };
