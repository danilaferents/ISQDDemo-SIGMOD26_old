import { resizeCanvasToCSS } from './BaseGraph.js';

const topoCanvas = document.getElementById('topologyCanvas');
const tctx = topoCanvas?.getContext('2d');

function autoFit(ctx, w, h, DW, DH, drawFn) {
  const pad = 18;

  const sx = (w - pad * 2) / DW;
  const sy = (h - pad * 2) / DH;
  const fit = Math.min(sx, sy);

  const s = Math.min(fit * 1.05, 1.10);

  ctx.save();
  ctx.translate((w - DW * s) / 2, (h - DH * s) / 2);
  ctx.scale(s, s);
  drawFn();
  ctx.restore();
}

function drawRectNode(ctx, x, y, label, opts = {}) {
  const ww = opts.w ?? 74;
  const hh = opts.h ?? 34;
  const rr = opts.r ?? 10;
  const stroke = opts.stroke ?? '#243cff';
  const fill = opts.fill ?? 'rgba(255,255,255,0.85)';

  const x0 = x - ww / 2;
  const y0 = y - hh / 2;

  ctx.save();
  ctx.lineWidth = 3;
  ctx.strokeStyle = stroke;
  ctx.fillStyle = fill;

  ctx.beginPath();
  const r = Math.min(rr, ww / 2, hh / 2);
  ctx.moveTo(x0 + r, y0);
  ctx.arcTo(x0 + ww, y0,      x0 + ww, y0 + hh, r);
  ctx.arcTo(x0 + ww, y0 + hh, x0,      y0 + hh, r);
  ctx.arcTo(x0,      y0 + hh, x0,      y0,      r);
  ctx.arcTo(x0,      y0,      x0 + ww, y0,      r);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#111';
  ctx.font = '700 13px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x, y);

  ctx.restore();
}

function drawArrow(ctx, x1, y1, x2, y2, color = '#243cff', w = 3) {
  const head = 12;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const a = Math.atan2(dy, dx);

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - head * Math.cos(a - Math.PI/7), y2 - head * Math.sin(a - Math.PI/7));
  ctx.lineTo(x2 - head * Math.cos(a + Math.PI/7), y2 - head * Math.sin(a + Math.PI/7));
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawTopologyPlaceholder() {
  if (!tctx || !topoCanvas) return;

  const ctx = tctx;
  const rect = topoCanvas.getBoundingClientRect();
  const W = rect.width;
  const H = rect.height;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(0,0,0,0.01)';
  ctx.fillRect(0, 0, W, H);

  const M = 4;
  const F = 8;

  function drawArrowOffset(x1, y1, x2, y2, color, w, offsetPx = 0) {
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    drawArrow(ctx, x1 + nx * offsetPx, y1 + ny * offsetPx, x2 + nx * offsetPx, y2 + ny * offsetPx, color, w);
  }

  const DW = 860;
  const DH = 420;

  autoFit(ctx, W, H, DW, DH, () => {
    const cx = DW * 0.5;

    const nodeH = 34;
    const yGap  = 68;

    const mobile = Array.from({ length: M }, (_, i) => ({ id: `MN${i}`, label: `MN${i+1}`, kind: 'mobile' }));
    const fixed  = Array.from({ length: F }, (_, i) => ({ id: `FN${i}`, label: `FN${i+1}`, kind: 'fixed' }));

    const layers = [mobile, fixed];

    let prev = fixed.map(n => ({ ...n }));
    let level = 0;
    while (prev.length > 1) {
      const next = [];
      for (let i = 0; i < prev.length; i += 2) {
        const left = prev[i];
        const right = prev[i + 1];
        const id = `N${level}_${Math.floor(i / 2)}`;
        next.push({
          id,
          label: id,
          kind: 'internal',
          children: right ? [left.id, right.id] : [left.id]
        });
      }
      layers.push(next);
      prev = next.map(n => ({ ...n }));
      level++;
    }

    const baseY = DH - 50;
    const pos = new Map();

    const maxCount = Math.max(1, ...layers.map(L => L.length || 1));
    const spacing = Math.min(130, Math.max(78, (DW - 120) / Math.max(1, (maxCount - 1))));

    function layerXs(count) {
      const totalW = (count - 1) * spacing;
      const start = cx - totalW / 2;
      return Array.from({ length: count }, (_, i) => start + i * spacing);
    }

    {
      const y = baseY - 1 * (nodeH + yGap);
      const xs = layerXs(fixed.length);
      for (let i = 0; i < fixed.length; i++) pos.set(fixed[i].id, { x: xs[i], y });
    }

    {
      const y = baseY - 0 * (nodeH + yGap);
      for (let i = 0; i < mobile.length; i++) {
        const fnPos = pos.get(`FN${i}`);
        const x = fnPos ? fnPos.x : (cx + (i - (mobile.length-1)/2) * spacing);
        pos.set(mobile[i].id, { x, y });
      }
    }

    for (let li = 2; li < layers.length; li++) {
      const L = layers[li];
      const y = baseY - li * (nodeH + yGap);
      const xs = layerXs(L.length);
      for (let i = 0; i < L.length; i++) pos.set(L[i].id, { x: xs[i], y });
    }

    for (let i = 0; i < M; i++) {
      const fnA = pos.get(`FN${2 * i}`);
      const fnB = pos.get(`FN${2 * i + 1}`);
      if (!fnA || !fnB) continue;

      const mn = pos.get(`MN${i}`);
      if (!mn) continue;

      mn.x = (fnA.x + fnB.x) * 0.5;
    }

    const NODE_H = 34;
    const EDGE_GAP = 8;

    const topOf = (id) => {
      const p = pos.get(id);
      return { x: p.x, y: p.y - (NODE_H / 2 + EDGE_GAP) };
    };

    const bottomOf = (id) => {
      const p = pos.get(id);
      return { x: p.x, y: p.y + (NODE_H / 2 + EDGE_GAP) };
    };

    for (let li = 2; li < layers.length; li++) {
      for (const parent of layers[li]) {
        const kids = parent.children || [];
        kids.forEach((kidId, k) => {
          const a = topOf(kidId);
          const b = bottomOf(parent.id);
          const off = (kids.length === 1) ? 0 : (k === 0 ? -7 : +7);
          drawArrowOffset(a.x, a.y, b.x, b.y, '#111111', 3, off);
        });
      }
    }

    for (let i = 0; i < M; i++) {
      const mId = `MN${i}`;
      const redFixedIdx = 2 * i;
      const greenFixedIdx = 2 * i + 1;

      if (redFixedIdx < F) {
        const a = topOf(mId);
        const b = bottomOf(`FN${redFixedIdx}`);
        drawArrowOffset(a.x, a.y, b.x, b.y, '#ff2b2b', 3, -8);
      }
      if (greenFixedIdx < F) {
        const a = topOf(mId);
        const b = bottomOf(`FN${greenFixedIdx}`);
        drawArrowOffset(a.x, a.y, b.x, b.y, '#17b34a', 3, +8);
      }
    }

    for (const L of layers) {
      for (const n of L) {
        const p = pos.get(n.id);
        const stroke =
          (n.kind === 'mobile') ? '#ff8a00' :
          (n.kind === 'fixed')  ? '#243cff' :
                                  '#111111';
        drawRectNode(ctx, p.x, p.y, n.label, { stroke });
      }
    }
  });
}

export function renderTopology() {
  resizeCanvasToCSS(topoCanvas, tctx);
  drawTopologyPlaceholder();
}
