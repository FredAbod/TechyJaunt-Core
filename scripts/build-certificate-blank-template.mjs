/**
 * Paints out sample course line + certificate ID on the certificate artwork.
 * Output: src/resources/courses/assets/certificate-template-blank.png
 *
 * Masks are pixel-tight (891×622) so the seal, border, and underline stay intact.
 */
import { createCanvas, loadImage } from "canvas";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const srcPath = path.join(
  root,
  "src/resources/courses/assets/certificate-template.png",
);
const outPath = path.join(
  root,
  "src/resources/courses/assets/certificate-template-blank.png",
);

/** Pixel masks on 891×622 artwork — stop before the ribbon seal (~x 585). */
const MASKS_PX = [
  { x: 42, y: 358, w: 542, h: 40 }, // sample course + date (inside white area only)
];

const img = await loadImage(srcPath);
const canvas = createCanvas(img.width, img.height);
const ctx = canvas.getContext("2d");
ctx.drawImage(img, 0, 0);
ctx.fillStyle = "#ffffff";
for (const m of MASKS_PX) {
  ctx.fillRect(m.x, m.y, m.w, m.h);
}
fs.writeFileSync(outPath, canvas.toBuffer("image/png"));
console.log("Wrote", outPath, `${img.width}x${img.height}`);
