/**
 * Paints out sample name/course/ID on the certificate artwork.
 * Output: src/resources/courses/assets/certificate-template-blank.png
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

/** Only the center dynamic-text bands — keep seal + right border art intact. */
const MASKS_FRACTION = [
  { x: 0.1, y: 0.405, w: 0.58, h: 0.09 }, // recipient name
  { x: 0.08, y: 0.495, w: 0.62, h: 0.125 }, // course + date
  { x: 0.64, y: 0.735, w: 0.33, h: 0.075 }, // certificate ID (footer only)
];

const img = await loadImage(srcPath);
const canvas = createCanvas(img.width, img.height);
const ctx = canvas.getContext("2d");
ctx.drawImage(img, 0, 0);
ctx.fillStyle = "#ffffff";
for (const m of MASKS_FRACTION) {
  ctx.fillRect(
    m.x * img.width,
    m.y * img.height,
    m.w * img.width,
    m.h * img.height,
  );
}
fs.writeFileSync(outPath, canvas.toBuffer("image/png"));
console.log("Wrote", outPath, `${img.width}x${img.height}`);
