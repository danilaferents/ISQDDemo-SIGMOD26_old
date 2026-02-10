import { resizeCanvasToCSS, drawBackground, drawAxes,
         patternDots, patternCrossX, patternDiagonal } from './BaseGraph.js';
import { activeConfig } from '../state/AppState.js';

const deployCanvas = document.getElementById('deployCanvas');
const dctx = deployCanvas?.getContext('2d');

function drawDeploymentLatencyStatic() {
  if (!dctx || !deployCanvas) return;

  const ctx = dctx;
  const rect = deployCanvas.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;

  const isHolistic = (activeConfig?.reconfigMode === 'holistic');

  if (!isHolistic) {
    const DEPLOY = 6.4;
    const OPT_TOTAL = 12.0;
    const OPT_LABEL = '12';

    const OPT_ONLY = Math.max(0.0001, OPT_TOTAL - DEPLOY);

    const pSum = 6 + 10 + 4;
    const optParts = {
      applicator: OPT_ONLY * (6 / pSum),
      amender:    OPT_ONLY * (10 / pSum),
      lock:       OPT_ONLY * (4 / pSum),
    };

    const DEPLOY_COLOR = '#79d17c';
    const OPT_COLOR    = '#1f8f3a';

    const Y_MIN2 = 1;
    const Y_MAX2 = 1e3;
    const LOG_MIN2 = Math.log10(Y_MIN2);
    const LOG_MAX2 = Math.log10(Y_MAX2);

    const pad = { l: 56, r: 14, t: 14, b: 36 };
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
      const lv = Math.log10(Math.max(v, Y_MIN2));
      const t = (lv - LOG_MIN2) / (LOG_MAX2 - LOG_MIN2);
      return y0 + (1 - t) * (y1 - y0);
    };

    const SUPER2 = { 0: '\u2070', 1: '\u00B9', 2: '\u00B2', 3: '\u00B3' };
    ctx.font = '11px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    [1, 10, 100, 1000].forEach(v => {
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
      ctx.fillText(`10${SUPER2[expn] ?? ''}`, x0 - 8, y);
    });

    const cx = (x0 + x1) / 2;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillText('2', cx, y1 + 8);

    const barW = Math.min(86, Math.max(58, (x1 - x0) * 0.20));
    const bx0 = cx - barW / 2;

    const OUTLINE = 'rgba(0,0,0,0.85)';
    const OUTLINE_W = 3;

    const yBarBottom = yAt(1);
    const yBarTop    = yAt(OPT_TOTAL);
    const barPixH = yBarBottom - yBarTop;

    const deployPixH = barPixH * 0.50;
    const optPixH    = barPixH * 0.50;

    const yDeployTopPix = yBarTop;
    const yDeployBotPix = yDeployTopPix + deployPixH;

    const yOptTopPix = yDeployBotPix;
    const yOptBotPix = yOptTopPix + optPixH;

    ctx.save();
    ctx.fillStyle = DEPLOY_COLOR;
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = OUTLINE_W;
    ctx.beginPath();
    ctx.rect(bx0, yDeployTopPix, barW, yDeployBotPix - yDeployTopPix);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = OPT_COLOR;
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = OUTLINE_W;
    ctx.beginPath();
    ctx.rect(bx0, yOptTopPix, barW, yOptBotPix - yOptTopPix);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    const optSum = optParts.applicator + optParts.amender + optParts.lock;
    const appPix  = optPixH * (optParts.applicator / optSum);
    const amePix  = optPixH * (optParts.amender    / optSum);
    const lockPix = optPixH * (optParts.lock       / optSum);

    const yAppTop  = yOptBotPix - appPix;
    const yAmeTop  = yAppTop - amePix;
    const yLockTop = yAmeTop - lockPix;

    function drawOptPart(yTop, yBot, patternFn) {
      const hh = (yBot - yTop);
      ctx.save();
      ctx.fillStyle = OPT_COLOR;
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = OUTLINE_W;
      ctx.beginPath();
      ctx.rect(bx0, yTop, barW, hh);
      ctx.fill();
      ctx.stroke();
      patternFn(ctx, bx0, yTop, barW, hh);
      ctx.restore();
    }

    drawOptPart(yAppTop, yOptBotPix, patternDots);
    drawOptPart(yAmeTop, yAppTop, patternCrossX);
    drawOptPart(yLockTop, yAmeTop, patternDiagonal);

    function verticalLabel(text, yMid) {
      ctx.save();
      ctx.translate(cx, yMid);
      ctx.rotate(-Math.PI / 2);
      ctx.font = '900 22px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 0, 0);
      ctx.restore();
    }
    verticalLabel('6.1', (yDeployTopPix + yDeployBotPix) / 2);

    ctx.save();
    ctx.font = '900 30px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
    ctx.fillStyle = '#123cff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(OPT_LABEL, cx, yDeployTopPix - 6);
    ctx.restore();

    ctx.save();
    ctx.translate(18, (y0 + y1) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
    ctx.fillStyle = 'rgba(0,0,0,0.70)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('deployment-latency (s)', 0, 0);
    ctx.restore();

    const lx = x1 - 210;
    const ly = y0 + 8;
    const sw = 34, sh = 18;

    function legendSwatch(y, fill, patternFn, patternOnly=false) {
      ctx.save();
      ctx.lineWidth = 3;
      ctx.strokeStyle = OUTLINE;
      ctx.fillStyle = patternOnly ? 'rgba(255,255,255,0.95)' : fill;

      ctx.beginPath();
      ctx.rect(lx, y, sw, sh);
      ctx.fill();
      ctx.stroke();

      if (patternFn) patternFn(ctx, lx, y, sw, sh);
      ctx.restore();
    }

    function legendText(y, label) {
      ctx.save();
      ctx.font = '800 12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, lx + sw + 10, y + sh / 2);
      ctx.restore();
    }

    legendSwatch(ly, DEPLOY_COLOR, null, false);
    legendText(ly, 'Deployment');

    legendSwatch(ly + 26, OPT_COLOR, null, false);
    legendText(ly + 26, 'Optimization');

    const subY = ly + 58;

    legendSwatch(subY, OPT_COLOR, patternDiagonal, true);
    legendText(subY, 'Applicator');

    legendSwatch(subY + 22, OPT_COLOR, patternCrossX, true);
    legendText(subY + 22, 'Amender');

    legendSwatch(subY + 44, OPT_COLOR, patternDots, true);
    legendText(subY + 44, 'Lock');

    return;
  }

  // ==========================================================
  // HOLISTIC
  // ==========================================================

  const OPT_TOTAL = 20.0;
  const DEPLOY = 10.0;
  const OVERALL = 30.0;

  const optParts = { applicator: 6.0, amender: 10.0, lock: 4.0 };

  const DEPLOY_COLOR = '#ff9a2a';
  const OPT_COLOR    = '#d96a00';

  const Y_MIN2 = 1;
  const Y_MAX2 = 1e3;
  const LOG_MIN2 = Math.log10(Y_MIN2);
  const LOG_MAX2 = Math.log10(Y_MAX2);

  const pad = { l: 56, r: 14, t: 14, b: 36 };
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
    const lv = Math.log10(Math.max(v, Y_MIN2));
    const t = (lv - LOG_MIN2) / (LOG_MAX2 - LOG_MIN2);
    return y0 + (1 - t) * (y1 - y0);
  };

  const SUPER2 = { 0: '\u2070', 1: '\u00B9', 2: '\u00B2', 3: '\u00B3' };
  ctx.font = '11px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  [1, 10, 100, 1000].forEach(v => {
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
    ctx.fillText(`10${SUPER2[expn] ?? ''}`, x0 - 8, y);
  });

  const cx = (x0 + x1) / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillText('2', cx, y1 + 8);

  const barW = Math.min(86, Math.max(58, (x1 - x0) * 0.20));
  const bx0 = cx - barW / 2;

  const OUTLINE = 'rgba(0,0,0,0.85)';
  const OUTLINE_W = 3;

  const yBarBottom = yAt(1);
  const yBarTop    = yAt(OVERALL);
  const barPixH = yBarBottom - yBarTop;

  const deployPixH = barPixH * (DEPLOY / OVERALL);
  const optPixH    = barPixH * (OPT_TOTAL / OVERALL);

  const yDeployTop = yBarTop;
  const yDeployBot = yDeployTop + deployPixH;

  const yOptTop = yDeployBot;
  const yOptBot = yOptTop + optPixH;

  ctx.save();
  ctx.fillStyle = DEPLOY_COLOR;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = OUTLINE_W;
  ctx.beginPath();
  ctx.rect(bx0, yDeployTop, barW, yDeployBot - yDeployTop);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.fillStyle = OPT_COLOR;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = OUTLINE_W;
  ctx.beginPath();
  ctx.rect(bx0, yOptTop, barW, yOptBot - yOptTop);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  const optSum = optParts.applicator + optParts.amender + optParts.lock;
  const appPix  = optPixH * (optParts.applicator / optSum);
  const amePix  = optPixH * (optParts.amender    / optSum);
  const lockPix = optPixH * (optParts.lock       / optSum);

  const yAppTop  = yOptBot - appPix;
  const yAmeTop  = yAppTop - amePix;
  const yLockTop = yAmeTop - lockPix;

  function drawOptPart(yTop, yBot, patternFn) {
    const hh = (yBot - yTop);
    ctx.save();
    ctx.fillStyle = OPT_COLOR;
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = OUTLINE_W;
    ctx.beginPath();
    ctx.rect(bx0, yTop, barW, hh);
    ctx.fill();
    ctx.stroke();
    patternFn(ctx, bx0, yTop, barW, hh);
    ctx.restore();
  }

  drawOptPart(yAppTop, yOptBot, patternDots);
  drawOptPart(yAmeTop, yAppTop, patternCrossX);
  drawOptPart(yLockTop, yAmeTop, patternDiagonal);

  function verticalLabel(text, yMid) {
    ctx.save();
    ctx.translate(cx, yMid);
    ctx.rotate(-Math.PI / 2);
    ctx.font = '900 22px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }
  verticalLabel('10', (yDeployTop + yDeployBot) / 2);

  ctx.save();
  ctx.font = '900 30px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.fillStyle = '#123cff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('30', cx, yDeployTop - 6);
  ctx.restore();

  ctx.save();
  ctx.translate(18, (y0 + y1) / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.fillStyle = 'rgba(0,0,0,0.70)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('deployment-latency (s)', 0, 0);
  ctx.restore();

  const lx = x1 - 210;
  const ly = y0 + 8;
  const sw = 34, sh = 18;

  function legendSwatch(y, fill, patternFn, patternOnly=false) {
    ctx.save();
    ctx.lineWidth = 3;
    ctx.strokeStyle = OUTLINE;
    ctx.fillStyle = patternOnly ? 'rgba(255,255,255,0.95)' : fill;

    ctx.beginPath();
    ctx.rect(lx, y, sw, sh);
    ctx.fill();
    ctx.stroke();

    if (patternFn) patternFn(ctx, lx, y, sw, sh);
    ctx.restore();
  }

  function legendText(y, label) {
    ctx.save();
    ctx.font = '800 12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, lx + sw + 10, y + sh / 2);
    ctx.restore();
  }

  legendSwatch(ly, DEPLOY_COLOR, null, false);
  legendText(ly, 'Deployment');

  legendSwatch(ly + 26, OPT_COLOR, null, false);
  legendText(ly + 26, 'Optimization');

  const subY = ly + 58;

  legendSwatch(subY, OPT_COLOR, patternDiagonal, true);
  legendText(subY, 'Applicator');

  legendSwatch(subY + 22, OPT_COLOR, patternCrossX, true);
  legendText(subY + 22, 'Amender');

  legendSwatch(subY + 44, OPT_COLOR, patternDots, true);
  legendText(subY + 44, 'Lock');
}

export function renderDeployGraph() {
  resizeCanvasToCSS(deployCanvas, dctx);
  drawDeploymentLatencyStatic();
}

export { deployCanvas };
