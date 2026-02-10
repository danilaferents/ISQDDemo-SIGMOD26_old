import { activeConfig, snapshots } from '../state/AppState.js';
import { msToLabel } from '../utils/mathHelpers.js';
import { updateHudTopInset } from '../utils/domHelpers.js';
import { renderGraph, graphCanvas } from '../graphs/LatencyGraph.js';
import { renderDeployGraph, deployCanvas } from '../graphs/DeploymentGraph.js';

const snapshotsBoxEl = document.getElementById('snapshotsBox');
const setupHUDEl = document.getElementById('setupHUD');

function deleteSnapshotAt(index) {
  if (index < 0 || index >= snapshots.length) return;
  snapshots.splice(index, 1);
  renderSnapshotsList();
}

export function renderSnapshotsList() {
  if (!snapshotsBoxEl) return;
  snapshotsBoxEl.innerHTML = '';

  if (!snapshots.length) {
    const empty = document.createElement('div');
    empty.className = 'small';
    empty.style.opacity = '0.75';
    empty.style.marginTop = '10px';
    empty.textContent = 'No snapshots yet.';
    snapshotsBoxEl.appendChild(empty);
    return;
  }

  for (let i = 0; i < snapshots.length; i += 2) {
    const a = snapshots[i];
    const b = snapshots[i + 1];

    const row = document.createElement('div');
    row.className = 'shotRow';

    function makeTile(snap, index) {
      if (!snap || !snap.dataUrl) return null;

      const tile = document.createElement('div');
      tile.className = 'shotTile';

      const del = document.createElement('button');
      del.className = 'shotTileDel';
      del.type = 'button';
      del.title = 'Delete this graph';
      del.textContent = '\u00D7';
      del.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        deleteSnapshotAt(index);
        updateHudTopInset(setupHUDEl);
      });

      const t = document.createElement('div');
      t.className = 'shotTileTitle';
      t.textContent = `${snap.title} \u2014 ${snap.kind === 'event' ? 'Event-time' : 'Aggregated overhead'}`;

      const m = document.createElement('div');
      m.className = 'shotMeta';

      const img = document.createElement('img');
      img.className = 'shotImg';
      img.src = snap.dataUrl;
      img.alt = t.textContent;

      tile.appendChild(del);
      tile.appendChild(t);
      tile.appendChild(m);
      tile.appendChild(img);

      return tile;
    }

    const tileA = makeTile(a, i);
    const tileB = makeTile(b, i + 1);

    if (tileA) row.appendChild(tileA);
    if (tileB) row.appendChild(tileB);

    snapshotsBoxEl.appendChild(row);
  }
}

export function addSnapshot() {
  renderGraph();
  renderDeployGraph();

  const c = activeConfig;
  const fixed = Math.max(0, c.totalNodes);
  const title =
    `${c.mobileNodes} mobile / ${fixed} fixed / ` +
    `${msToLabel(c.topoChangeMs)} / ${c.reconfigMode} / ${c.queryMode}`;

  snapshots.unshift(
    {
      kind: 'event',
      title,
      dataUrl: graphCanvas.toDataURL('image/png')
    },
    {
      kind: 'deploy',
      title,
      dataUrl: deployCanvas ? deployCanvas.toDataURL('image/png') : null
    }
  );

  renderSnapshotsList();
  updateHudTopInset(setupHUDEl);
}

export function initSnapshotsPanel() {
  renderSnapshotsList();
}
