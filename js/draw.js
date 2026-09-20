/** 共用畫布工具：高解析度適配、圓角、中國風雲紋與印章。 */
(function (global) {
  const SERIF =
    '"Kaiti TC", "BiauKai", "DFKai-SB", "STKaiti", "KaiTi", "Songti TC", "Noto Serif TC", serif';
  const SANS =
    '"PingFang HK", "PingFang TC", "Noto Sans TC", "Microsoft JhengHei", sans-serif';

  function fit(canvas) {
    const dpr = Math.min(global.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, w: w, h: h, dpr: dpr };
  }

  function roundRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  /** 單朵祥雲，用於邊框裝飾。 */
  function cloud(ctx, x, y, s, color, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha === undefined ? 0.5 : alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, s * 0.09);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(x, y, s * 0.42, Math.PI * 0.15, Math.PI * 1.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + s * 0.62, y + s * 0.12, s * 0.3, Math.PI * 0.9, Math.PI * 2.1);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x - s * 0.55, y + s * 0.16, s * 0.26, Math.PI * 1.0, Math.PI * 2.2);
    ctx.stroke();
    ctx.restore();
  }

  /** 四角雲紋，讓棋盤有卷軸邊的感覺。 */
  function cornerClouds(ctx, w, h, s, color, alpha) {
    cloud(ctx, s * 1.1, s * 1.0, s, color, alpha);
    ctx.save();
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    cloud(ctx, s * 1.1, s * 1.0, s, color, alpha);
    ctx.restore();
    ctx.save();
    ctx.translate(0, h);
    ctx.scale(1, -1);
    cloud(ctx, s * 1.1, s * 1.0, s, color, alpha);
    ctx.restore();
    ctx.save();
    ctx.translate(w, h);
    ctx.scale(-1, -1);
    cloud(ctx, s * 1.1, s * 1.0, s, color, alpha);
    ctx.restore();
  }

  /** 朱紅印章，畫在角落做落款。 */
  function seal(ctx, x, y, size, text) {
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = "#c0392b";
    ctx.fillStyle = "rgba(192, 57, 43, 0.16)";
    ctx.lineWidth = Math.max(1.5, size * 0.07);
    roundRect(ctx, x, y, size, size, size * 0.16);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#e05a48";
    ctx.font = "700 " + size * 0.36 + "px " + SERIF;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const chars = Array.from(text || "").slice(0, 4);
    if (chars.length <= 2) {
      chars.forEach(function (ch, i) {
        ctx.fillText(ch, x + size / 2, y + size * (0.32 + i * 0.36));
      });
    } else {
      chars.forEach(function (ch, i) {
        const cx = x + size * (i % 2 === 0 ? 0.31 : 0.69);
        const cy = y + size * (i < 2 ? 0.31 : 0.69);
        ctx.fillText(ch, cx, cy);
      });
    }
    ctx.restore();
  }

  function glowText(ctx, text, x, y, font, color, glow, blur) {
    ctx.save();
    ctx.font = font;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = glow || color;
    ctx.shadowBlur = blur === undefined ? 12 : blur;
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  global.FanwenDraw = {
    SERIF: SERIF,
    SANS: SANS,
    fit: fit,
    roundRect: roundRect,
    cloud: cloud,
    cornerClouds: cornerClouds,
    seal: seal,
    glowText: glowText,
  };
})(window);
