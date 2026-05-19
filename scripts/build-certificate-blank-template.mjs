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

/**
 * Erase only dynamic placeholder text (name line, course line, cert ID).
 * Stops before the seal (~x 72%) so ribbons/border stay intact.
 */
const MASKS_FRACTION = [
  { x: 0.1, y: 0.412, w: 0.58, h: 0.068 }, // recipient name line
  { x: 0.04, y: 0.472, w: 0.68, h: 0.1 }, // "For completing…" + course + date
  { x: 0.54, y: 0.655, w: 0.44, h: 0.12 }, // certificate ID block (footer right)
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
