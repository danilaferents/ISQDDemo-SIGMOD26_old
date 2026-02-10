export function setControlPanelVisible(setupHUDEl, showControlBtn, visible) {
  if (!setupHUDEl || !showControlBtn) return;
  setupHUDEl.classList.toggle('hidden', !visible);
  showControlBtn.classList.toggle('visible', !visible);
}

export function updateHudTopInset(setupHUDEl) {
  const isHidden = setupHUDEl?.classList.contains('hidden');
  if (isHidden) {
    document.body.style.setProperty('--hudTopInset', '10px');
    return;
  }

  const panel = document.getElementById('setupPanel');
  if (!panel) {
    document.body.style.setProperty('--hudTopInset', '10px');
    return;
  }

  const r = panel.getBoundingClientRect();
  const inset = Math.min(window.innerHeight - 20, Math.ceil(r.bottom + 10));
  document.body.style.setProperty('--hudTopInset', `${inset}px`);
}

export function setConfigOpen(configFieldsEl, configToggleBtn, open, setupHUDEl) {
  if (configFieldsEl) configFieldsEl.style.display = open ? 'block' : 'none';
  if (configToggleBtn) configToggleBtn.classList.toggle('active', open);
  updateHudTopInset(setupHUDEl);
}

export function setLiveGraphsVisible(liveGraphsSectionEl, visible) {
  if (!liveGraphsSectionEl) return;
  liveGraphsSectionEl.classList.toggle('hidden', !visible);
}

export function fillSelectRangeEven(selectEl, min, max) {
  selectEl.innerHTML = '';
  const start = (min % 2 === 0) ? min : (min + 1);
  for (let v = start; v <= max; v += 2) {
    const opt = document.createElement('option');
    opt.value = String(v);
    opt.textContent = String(v);
    selectEl.appendChild(opt);
  }
}
