import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const PUBLIC_DIR = path.join(process.cwd(), "public");

// Simple branded icon: a rounded dark-slate square with a white "R" mark.
function svgIcon(size) {
  const radius = Math.round(size * 0.22);
  const fontSize = Math.round(size * 0.56);
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" fill="#0f172a" />
  <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle"
        font-family="Arial, Helvetica, sans-serif" font-weight="700"
        font-size="${fontSize}" fill="#ffffff">R</text>
</svg>`;
}

async function main() {
  await mkdir(PUBLIC_DIR, { recursive: true });

  const targets = [
    { file: "icon-192.png", size: 192 },
    { file: "icon-512.png", size: 512 },
    { file: "apple-touch-icon.png", size: 180 },
    { file: "favicon-32.png", size: 32 },
  ];

  for (const { file, size } of targets) {
    const svg = Buffer.from(svgIcon(size));
    await sharp(svg).resize(size, size).png().toFile(path.join(PUBLIC_DIR, file));
    console.log("Generated", file);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
