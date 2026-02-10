export function resizeCanvasToCSS(canvas, ctx) {
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width  = Math.max(1, Math.floor(rect.width  * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));

  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

export function drawAxes(ctx, x0, y0, x1, y1) {
  ctx.strokeStyle = 'rgba(0,0,0,0.30)';
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x0, y1);
  ctx.lineTo(x1, y1);
  ctx.stroke();
}

export function drawBackground(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(0,0,0,0.02)';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
}

export function withClipRect(ctx, x, y, ww, hh, fn) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, ww, hh);
  ctx.clip();
  fn();
  ctx.restore();
}

export function patternDots(ctx, x, y, ww, hh) {
  withClipRect(ctx, x, y, ww, hh, () => {
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    const step = 10;
    for (let yy = y + 4; yy < y + hh; yy += step) {
      for (let xx = x + 4; xx < x + ww; xx += step) {
        ctx.beginPath();
        ctx.arc(xx, yy, 1.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
}

export function patternCrossX(ctx, x, y, ww, hh) {
  withClipRect(ctx, x, y, ww, hh, () => {
    ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.lineWidth = 2;
    const step = 14;
    for (let yy = y - hh; yy < y + hh * 2; yy += step) {
      for (let xx = x - ww; xx < x + ww * 2; xx += step) {
        ctx.beginPath();
        ctx.moveTo(xx, yy);
        ctx.lineTo(xx + 10, yy + 10);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(xx + 10, yy);
        ctx.lineTo(xx, yy + 10);
        ctx.stroke();
      }
    }
  });
}

export function patternDiagonal(ctx, x, y, ww, hh) {
  withClipRect(ctx, x, y, ww, hh, () => {
    ctx.strokeStyle = 'rgba(0,0,0,0.90)';
    ctx.lineWidth = 2;
    const step = 10;
    for (let xx = x - hh; xx < x + ww + hh; xx += step) {
      ctx.beginPath();
      ctx.moveTo(xx, y + hh);
      ctx.lineTo(xx + hh, y);
      ctx.stroke();
    }
  });
}
