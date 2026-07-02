import type { NavHudSnapshot } from "@/lib/tmap/nav-hud-snapshot";
import type { TurnIconKind } from "@/lib/tmap/guidance";

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawTurnGlyph(
  ctx: CanvasRenderingContext2D,
  kind: TurnIconKind,
  cx: number,
  cy: number,
  size: number
) {
  ctx.save();
  ctx.strokeStyle = "#93c5fd";
  ctx.fillStyle = "#93c5fd";
  ctx.lineWidth = Math.max(2, size * 0.12);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const s = size * 0.35;
  switch (kind) {
    case "left":
      ctx.beginPath();
      ctx.moveTo(cx + s * 0.4, cy - s);
      ctx.lineTo(cx - s * 0.5, cy);
      ctx.lineTo(cx + s * 0.4, cy + s);
      ctx.stroke();
      break;
    case "right":
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.4, cy - s);
      ctx.lineTo(cx + s * 0.5, cy);
      ctx.lineTo(cx - s * 0.4, cy + s);
      ctx.stroke();
      break;
    case "uturn":
      ctx.beginPath();
      ctx.arc(cx, cy + s * 0.2, s * 0.7, Math.PI * 0.15, Math.PI * 1.35);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.55, cy - s * 0.15);
      ctx.lineTo(cx - s * 0.85, cy - s * 0.45);
      ctx.lineTo(cx - s * 0.45, cy - s * 0.55);
      ctx.stroke();
      break;
    case "arrive":
      ctx.beginPath();
      ctx.arc(cx, cy, s * 0.55, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, cy - s * 0.25);
      ctx.lineTo(cx, cy + s * 0.35);
      ctx.stroke();
      break;
    case "straight":
    default:
      ctx.beginPath();
      ctx.moveTo(cx, cy + s * 0.9);
      ctx.lineTo(cx, cy - s * 0.9);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.45, cy - s * 0.35);
      ctx.lineTo(cx, cy - s * 0.9);
      ctx.lineTo(cx + s * 0.45, cy - s * 0.35);
      ctx.stroke();
      break;
  }
  ctx.restore();
}

/** PiP용 HUD — snapshot 변경 시에만 호출 */
export function renderPipHudCache(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  snapshot: NavHudSnapshot | null
): void {
  ctx.clearRect(0, 0, width, height);
  if (!snapshot?.primary) return;

  const pad = Math.max(8, Math.round(width * 0.035));
  const boxW = Math.min(Math.round(width * 0.58), 360);
  const boxH = Math.max(72, Math.round(height * 0.2));
  const x = pad;
  const y = pad;

  roundRect(ctx, x, y, boxW, boxH, 10);
  ctx.fillStyle = "rgba(17, 24, 39, 0.92)";
  ctx.fill();
  ctx.strokeStyle = "rgba(96, 165, 250, 0.45)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const iconSize = Math.min(boxH * 0.55, 44);
  const iconCx = x + pad + iconSize * 0.55;
  const iconCy = y + boxH / 2;
  drawTurnGlyph(ctx, snapshot.iconKind, iconCx, iconCy, iconSize);

  const textX = iconCx + iconSize * 0.75;
  const textMaxW = x + boxW - pad - textX;
  let textY = y + pad + (snapshot.badge ? 14 : 18);

  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  if (snapshot.badge) {
    ctx.font = `600 ${Math.max(10, Math.round(height * 0.028))}px system-ui, sans-serif`;
    ctx.fillStyle = "#fcd34d";
    ctx.fillText(truncate(ctx, snapshot.badge, textMaxW), textX, textY);
    textY += Math.max(14, Math.round(height * 0.034));
  }

  ctx.font = `700 ${Math.max(14, Math.round(height * 0.042))}px system-ui, sans-serif`;
  ctx.fillStyle = "#f8fafc";
  ctx.fillText(truncate(ctx, snapshot.primary, textMaxW), textX, textY);
  textY += Math.max(18, Math.round(height * 0.048));

  if (snapshot.secondary) {
    ctx.font = `500 ${Math.max(11, Math.round(height * 0.032))}px system-ui, sans-serif`;
    ctx.fillStyle = "#cbd5e1";
    ctx.fillText(truncate(ctx, snapshot.secondary, textMaxW), textX, textY);
  }
}

function truncate(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let trimmed = text;
  while (trimmed.length > 1 && ctx.measureText(`${trimmed}…`).width > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  return `${trimmed}…`;
}
