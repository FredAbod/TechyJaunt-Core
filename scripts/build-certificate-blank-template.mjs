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

/** White-out regions (fractions of image size) — covers all sample dynamic text. */
const MASKS_FRACTION = [
  { x: 0.07, y: 0.385, w: 0.86, h: 0.12 }, // recipient name
  { x: 0.05, y: 0.49, w: 0.9, h: 0.17 }, // course + date
  { x: 0.6, y: 0.7, w: 0.38, h: 0.15 }, // certificate ID
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
