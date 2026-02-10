import { DEBUG } from '../state/config.js';
import { settings, exp } from '../state/AppState.js';

const uiEl = document.getElementById('ui');
const trainCountEl = document.getElementById('trainCount');
const trainCountVal = document.getElementById('trainCountVal');
const speedEl = document.getElementById('speed');
const speedVal = document.getElementById('speedVal');
const toggleUIBtn = document.getElementById('toggleUIBtn');

export function initTrainSettings() {
  if (!uiEl) return;
  uiEl.style.display = DEBUG.showTrainSettings ? 'block' : 'none';

  if (speedEl) {
    settings.speedUser = parseFloat(speedEl.value);
  }

  if (DEBUG.showTrainSettings) {
    function syncToggleLabel() {
      toggleUIBtn.textContent = uiEl.classList.contains('collapsed') ? 'Show' : 'Hide';
    }
    syncToggleLabel();
    toggleUIBtn.addEventListener('click', () => {
      uiEl.classList.toggle('collapsed');
      syncToggleLabel();
    });
  }

  syncUI();

  if (speedEl) {
    speedEl.addEventListener('input', () => {
      settings.speedUser = parseFloat(speedEl.value);
      syncUI();
      if (exp.running) settings.speedActive = settings.speedUser;
    });
  }
}

export function syncUI() {
  if (!DEBUG.showTrainSettings) return;
  if (trainCountVal && trainCountEl) {
    trainCountVal.textContent = String(settings.trainCount);
    trainCountEl.value = String(settings.trainCount);
  }
  if (speedVal) speedVal.textContent = settings.speedUser.toFixed(3);
}
