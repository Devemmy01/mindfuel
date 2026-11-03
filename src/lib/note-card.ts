// Draws the "Note" share card straight onto a <canvas>.
//
// It used to be a DOM card captured with html-to-image, which on mobile
// Safari dropped images, mis-drew shadows and laid text out at whatever
// width the phone gave the preview. Drawing at a fixed 1080px width makes
// the preview and the saved image identical on every device.

export interface NoteCardInput {
  name: string;
  handle: string;
  date: string;
  prompt: string | null;
  text: string;
  canvasColor: string;
  canvasText: string;
  accent: string;
  avatar: HTMLImageElement | null;
  logo: HTMLImageElement | null;
  fontFamily: string;
}

const W = 1080;
const MIN_H = 1080;
const TARGET_H = 1350; // 4:5, the tallest Instagram feed post
const SIDE = 84;
const CARD_W = W - SIDE * 2;
const PAD = 64;
const INNER_W = CARD_W - PAD * 2;
const AVATAR = 120;
const BODY_SIZES = [48, 44, 40, 36, 34, 32];

type Token = { text: string; hashtag: boolean };
type Line = Token[];

/** Loads an image for drawing, routing remote URLs through the same-origin
 * Next image optimizer: the CSP blocks fetching Cloudinary/Google directly,
 * and a cross-origin image would taint the canvas. */
export async function loadCardImage(src: string, width = 256): Promise<HTMLImageElement> {
  const url = /^https?:/.test(src)
    ? `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=90`
    : src;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Image fetch failed: ${res.status}`);
  const objectUrl = URL.createObjectURL(await res.blob());
  try {
    const img = new Image();
    img.src = objectUrl;
    await img.decode();
    return img;
  } finally {
    // Decoded pixels stay usable for drawImage after revoking.
    setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  }
}

/** Waits for the weights the card uses so the first draw isn't in a fallback font. */
export async function loadCardFonts(fontFamily: string) {
  if (typeof document === "undefined" || !document.fonts) return;
  await Promise.all(
    ["400", "500", "600", "700"].map((weight) =>
      document.fonts.load(`${weight} 40px ${fontFamily}`).catch(() => []),
    ),
  );
}

function font(weight: number, size: number, family: string) {
  return `${weight} ${size}px ${family}`;
}

function wrap(
  ctx: CanvasRenderingContext2D,
  paragraph: string,
  maxWidth: number,
  plainFont: string,
  tagFont: string,
): Line[] {
  const lines: Line[] = [];
  let line: Line = [];
  let width = 0;
  const measure = (t: Token) => {
    ctx.font = t.hashtag ? tagFont : plainFont;
    return ctx.measureText(t.text).width;
  };
  const push = () => {
    while (line.length && !line[line.length - 1].text.trim()) line.pop();
    lines.push(line);
    line = [];
    width = 0;
  };

  for (const part of paragraph.split(/(\s+)/)) {
    if (!part) continue;
    const token = { text: part.replace(/\s+/g, " "), hashtag: /^#\w/.test(part) };
    if (token.text === " " && line.length === 0) continue;
    let w = measure(token);
    if (width + w > maxWidth && line.length) {
      push();
      if (token.text === " ") continue;
    }
    // A single word wider than the line breaks across lines by character.
    if (w > maxWidth) {
      let chunk = "";
      for (const ch of Array.from(token.text)) {
        const next = { ...token, text: chunk + ch };
        if (measure(next) > maxWidth && chunk) {
          line.push({ ...token, text: chunk });
          push();
          chunk = ch;
        } else {
          chunk = next.text;
        }
      }
      token.text = chunk;
      w = measure(token);
    }
    line.push(token);
    width += w;
  }
  if (line.length) push();
  return lines;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function withAlpha(hex: string, alpha: number) {
  const n = parseInt(hex.replace("#", ""), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

export function drawNoteCard(canvas: HTMLCanvasElement, input: NoteCardInput) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const f = input.fontFamily;
  const paragraphs = input.text.split(/\n+/).map((p) => p.trim()).filter(Boolean);

  // --- Measure ---------------------------------------------------------
  const nameX = AVATAR + 32;
  const nameW = INNER_W - nameX;
  const nameLines = wrap(ctx, input.name, nameW, font(700, 44, f), font(700, 44, f)).slice(0, 2);
  const metaText = [input.handle ? `@${input.handle}` : "", input.date].filter(Boolean).join("  ·  ");
  const headerTextH = nameLines.length * 54 + 8 + 40;
  const headerH = Math.max(AVATAR, headerTextH);

  const promptLines = input.prompt
    ? wrap(ctx, input.prompt, INNER_W - 56, font(600, 32, f), font(600, 32, f))
    : [];
  const promptH = promptLines.length ? promptLines.length * 44 + 44 : 0;

  const layoutBody = (size: number) => {
    const lh = Math.round(size * 1.45);
    const gap = Math.round(size * 0.6);
    const blocks = paragraphs.map((p) => wrap(ctx, p, INNER_W, font(500, size, f), font(600, size, f)));
    const h = blocks.reduce((sum, b) => sum + b.length * lh, 0) + Math.max(0, blocks.length - 1) * gap;
    return { size, lh, gap, blocks, h };
  };

  const brandH = 72;
  const brandGap = 56;
  const heightFor = (bodyH: number) => {
    const cardH = PAD + headerH + (promptH ? 44 + promptH : 0) + 40 + bodyH + PAD;
    return { cardH, contentH: cardH + brandGap + brandH };
  };

  let body = layoutBody(BODY_SIZES[0]);
  for (const size of BODY_SIZES) {
    body = layoutBody(size);
    if (heightFor(body.h).contentH + 2 * 110 <= TARGET_H) break;
  }
  const { cardH, contentH } = heightFor(body.h);
  const H = Math.max(MIN_H, contentH + 2 * 110);

  canvas.width = W;
  canvas.height = H;

  // --- Canvas ----------------------------------------------------------
  ctx.fillStyle = input.canvasColor;
  ctx.fillRect(0, 0, W, H);

  // --- Card ------------------------------------------------------------
  const cardX = SIDE;
  const cardY = Math.round((H - contentH) / 2);

  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.22)";
  ctx.shadowBlur = 70;
  ctx.shadowOffsetY = 28;
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, cardX, cardY, CARD_W, cardH, 52);
  ctx.fill();
  ctx.restore();

  const x0 = cardX + PAD;
  let y = cardY + PAD;

  // Avatar with an accent ring.
  const cx = x0 + AVATAR / 2;
  const cy = y + headerH / 2;
  ctx.fillStyle = input.accent;
  ctx.beginPath();
  ctx.arc(cx, cy, AVATAR / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(cx, cy, AVATAR / 2 - 6, 0, Math.PI * 2);
  ctx.fill();
  const r = AVATAR / 2 - 12;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  if (input.avatar) {
    const { naturalWidth: iw, naturalHeight: ih } = input.avatar;
    const s = Math.max((r * 2) / iw, (r * 2) / ih);
    ctx.drawImage(input.avatar, cx - (iw * s) / 2, cy - (ih * s) / 2, iw * s, ih * s);
  } else {
    ctx.fillStyle = input.accent;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.fillStyle = "#ffffff";
    ctx.font = font(700, 52, f);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(Array.from(input.name.trim())[0]?.toUpperCase() ?? "?", cx, cy + 2);
    ctx.textAlign = "left";
  }
  ctx.restore();

  // Name, then handle · date.
  ctx.textBaseline = "alphabetic";
  let ty = y + (headerH - headerTextH) / 2;
  ctx.fillStyle = "#111111";
  ctx.font = font(700, 44, f);
  for (const line of nameLines) {
    ty += 54;
    ctx.fillText(line.map((t) => t.text).join(""), x0 + nameX, ty - 12);
  }
  ctx.fillStyle = "#737373";
  ctx.font = font(400, 32, f);
  ctx.fillText(metaText, x0 + nameX, ty + 8 + 30);
  y += headerH;

  // Prompt chip.
  if (promptLines.length) {
    y += 44;
    ctx.fillStyle = withAlpha(input.accent, 0.1);
    roundRect(ctx, x0, y, INNER_W, promptH, 26);
    ctx.fill();
    ctx.fillStyle = input.accent;
    ctx.font = font(600, 32, f);
    promptLines.forEach((line, i) => {
      ctx.fillText(line.map((t) => t.text).join(""), x0 + 28, y + 22 + 34 + i * 44);
    });
    y += promptH;
  }

  // Body, with hashtags in the accent colour.
  y += 40;
  body.blocks.forEach((lines, bi) => {
    if (bi > 0) y += body.gap;
    for (const line of lines) {
      let lx = x0;
      const baseline = y + Math.round(body.size * 1.05);
      for (const token of line) {
        ctx.font = token.hashtag ? font(600, body.size, f) : font(500, body.size, f);
        ctx.fillStyle = token.hashtag ? input.accent : "#1c1c1c";
        ctx.fillText(token.text, lx, baseline);
        lx += ctx.measureText(token.text).width;
      }
      y += body.lh;
    }
  });

  // --- Brand lockup under the card --------------------------------------
  ctx.font = font(700, 36, f);
  const label = "mind-fuel.app";
  const labelW = ctx.measureText(label).width;
  const badge = brandH;
  const lockW = badge + 20 + labelW;
  const lx = (W - lockW) / 2;
  const ly = cardY + cardH + brandGap;
  if (input.logo) {
    // The app icon (flame on its dark tile), cropped to a circle.
    ctx.save();
    ctx.beginPath();
    ctx.arc(lx + badge / 2, ly + badge / 2, badge / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(input.logo, lx - 4, ly - 4, badge + 8, badge + 8);
    ctx.restore();
  }
  ctx.fillStyle = input.canvasText;
  ctx.textBaseline = "middle";
  ctx.fillText(label, lx + badge + 20, ly + badge / 2 + 2);
  ctx.textBaseline = "alphabetic";
}
