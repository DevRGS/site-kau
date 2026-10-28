import sharp from "sharp";
import { mkdir } from "node:fs/promises";

await mkdir("public/images", { recursive: true });
await sharp("image1.png")
  .resize(900, null, { withoutEnlargement: true })
  .webp({ quality: 88 })
  .toFile("public/images/encomendas.webp");
await sharp("image2.png")
  .extract({ left: 0, top: 0, width: 640, height: 548 })
  .resize(1000)
  .webp({ quality: 88 })
  .toFile("public/images/hero-perfumes.webp");
await sharp("image2.png")
  .extract({ left: 0, top: 652, width: 640, height: 395 })
  .resize(900)
  .webp({ quality: 88 })
  .toFile("public/images/body-mists.webp");
const crops = [
  ["yara-rose", { left: 388, top: 0, width: 252, height: 530 }],
  ["yara-moi", { left: 183, top: 145, width: 240, height: 385 }],
  ["bare-vanilla", { left: 210, top: 680, width: 137, height: 355 }],
  ["coconut-passion", { left: 453, top: 680, width: 150, height: 355 }],
];
for (const [name, crop] of crops) {
  const original = sharp("image2.png").extract(crop);
  const backdrop = await original
    .clone()
    .resize(600, 650, { fit: "cover" })
    .blur(35)
    .modulate({ brightness: 1.05, saturation: 0.7 })
    .toBuffer();
  const front = await original
    .clone()
    .resize(510, 570, { fit: "inside" })
    .toBuffer();
  await sharp(backdrop)
    .composite([{ input: front, gravity: "centre" }])
    .webp({ quality: 86 })
    .toFile(`public/images/${name}.webp`);
}
console.log("Imagens locais prontas e otimizadas em WebP.");
