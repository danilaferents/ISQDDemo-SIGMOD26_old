import { resizeCanvasToCSS } from './BaseGraph.js';
import { Y_MIN, Y_MAX, LOG_MIN, LOG_MAX, SUPER } from '../state/config.js';
import { activeConfig, exp, nowMs } from '../state/AppState.js';
import { niceStep } from '../utils/mathHelpers.js';

const graphCanvas = document.getElementById('graphCanvas');
const gctx = graphCanvas?.getContext('2d');

function drawGraph(points) {
  if (!gctx || !graphCanvas) return;

  const ctx = gctx;
  const rect = graphCanvas.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;

  const pad = { l: 56, r: 14, t: 14, b: 34 };
  const x0 = pad.l;
  const y0 = pad.t;
  const x1 = w - pad.r;
  const y1 = h - pad.b;

  ctx.clearRect(0, 0, w, h);

  ctx.fillStyle = 'rgba(0,0,0,0.02)';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.strokeRect(0.5, 0.5, w - 1, h - 1);

  ctx.strokeStyle = 'rgba(0,0,0,0.30)';
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x0, y1);
  ctx.lineTo(x1, y1);
  ctx.stroke();

  const yAt = (v) => {
    const lv = Math.log10(Math.max(v, Y_MIN));
    const t = (lv - LOG_MIN) / (LOG_MAX - LOG_MIN);
    return y0 + (1 - t) * (y1 - y0);
  };

  ctx.font = '11px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  [10, 100, 1000, 10000].forEach(v => {
    const y = yAt(v);

    ctx.strokeStyle = 'rgba(0,0,0,0.10)';
    ctx.setLineDash([2, 6]);
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x1, y);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.moveTo(x0 - 5, y);
    ctx.lineTo(x0, y);
    ctx.stroke();

    const expn = Math.round(Math.log10(v));
    ctx.fillText(`10${SUPER[expn]}`, x0 - 8, y);
  });

  const hasData = points.length >= 2;

  const tNowSec  = exp.startMs ? ((nowMs() - exp.startMs) / 1000) : 0;
  const tStopSec = exp.startMs ? ((exp.stopMs - exp.startMs) / 1000) : 0;
  const tMaxData = hasData ? points[points.length - 1].tSec : 0;

  const tMaxAxis = exp.running ? tNowSec : Math.max(tStopSec, tMaxData);

  const isHolistic = activeConfig.reconfigMode === 'holistic';
  const tMin = (!exp.running) ? 0 : Math.max(0, tMaxAxis - 150);

  const xAtT = (t) => {
    const tt = (t - tMin) / Math.max(1e-6, (tMaxAxis - tMin));
    return x0 + tt * (x1 - x0);
  };

  ctx.font = '11px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  const span = Math.max(0.001, (tMaxAxis - tMin));
  const MAX_TICKS = 10;

  const step = niceStep(span / MAX_TICKS);
  let tTick = Math.ceil(tMin / step) * step;

  for (; tTick <= tMaxAxis + 1e-6; tTick += step) {
    const x = xAtT(tTick);

    ctx.strokeStyle = 'rgba(0,0,0,0.10)';
    ctx.setLineDash([2, 6]);
    ctx.beginPath();
    ctx.moveTo(x, y0);
    ctx.lineTo(x, y1);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.moveTo(x, y1);
    ctx.lineTo(x, y1 + 5);
    ctx.stroke();

    const isIntish = Math.abs(step - Math.round(step)) < 1e-6;
    const label = isIntish ? String(Math.round(tTick)) : (step < 1 ? tTick.toFixed(1) : tTick.toFixed(0));
    ctx.fillText(label, x, y1 + 8);
  }

  function smoothV(i, win) {
    let s = 0, n = 0;
    for (let k = -win; k <= win; k++) {
      const j = i + k;
      if (j < 0 || j >= points.length) continue;
      s += points[j].v;
      n++;
    }
    return n ? (s / n) : points[i].v;
  }

  if (points.length >= 2) {
    ctx.fillStyle = isHolistic
      ? 'rgba(255, 138, 0, 0.80)'
      : 'rgba(115, 190, 110, 0.80)';

    ctx.lineJoin = 'round';
    ctx.lineCap  = 'round';

    const band = 16;
    const win = isHolistic ? 2 : 4;

    ctx.beginPath();

    let started = false;

    for (let i = 0; i < points.length; i++) {
      const pt = points[i];
      if (pt.tSec < tMin || pt.tSec > tMaxAxis) continue;

      const x = xAtT(pt.tSec);
      const v = smoothV(i, win);
      const y = yAt(v) - band;

      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    }

    for (let i = points.length - 1; i >= 0; i--) {
      const pt = points[i];
      if (pt.tSec < tMin || pt.tSec > tMaxAxis) continue;

      const x = xAtT(pt.tSec);
      const v = smoothV(i, win);
      const y = yAt(v) + band;

      ctx.lineTo(x, y);
    }

    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = 'rgba(0,0,0,0.70)';
  ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('runtime (sec.)', (x0 + x1) / 2, h - 10);

  ctx.save();
  ctx.translate(18, (y0 + y1) / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('event-time latency', 0, 0);
  ctx.restore();

  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  const status = exp.running ? (exp.frozen ? 'RUNNING (graph frozen)' : 'RUNNING') : 'STOPPED';
  ctx.fillText(status, x1, y0);

  ctx.textAlign = 'right';
  const rt = exp.running ? ((nowMs() - exp.startMs)/1000) : ((exp.stopMs - exp.startMs)/1000);
  const rtSafe = Number.isFinite(rt) ? rt : 0;
  ctx.fillText(`${rtSafe.toFixed(1)}s`, x1 - 6, y0 + 12);
}

export function renderGraph() {
  resizeCanvasToCSS(graphCanvas, gctx);
  drawGraph(exp.points);
}

export { graphCanvas };
