import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputPath = path.join(__dirname, 'src', 'assets', 'images', 'expensetrack_logo_1781299964788.jpg');
const publicDir = path.join(__dirname, 'public');

// Output paths
const output192Path = path.join(publicDir, 'icon-192.png');
const output512Path = path.join(publicDir, 'icon-512.png');
const outputPngPath = path.join(publicDir, 'icon.png');
const outputSvgPath = path.join(publicDir, 'icon.svg');

async function run() {
  try {
    console.log('Generating high-quality icons from:', inputPath);

    // Verify input file exists
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Input file not found: ${inputPath}`);
    }

    // Ensure public directory exists
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    // 1. Create 192x192 PNG
    await sharp(inputPath)
      .resize(192, 192, {
        fit: 'contain',
        background: { r: 10, g: 10, b: 10, alpha: 1 } // #0a0a0a matches premium dark background
      })
      .png()
      .toFile(output192Path);
    console.log('Created 192x192 icon at:', output192Path);

    // 2. Create 512x512 PNG
    const png512Buffer = await sharp(inputPath)
      .resize(512, 512, {
        fit: 'contain',
        background: { r: 10, g: 10, b: 10, alpha: 1 }
      })
      .png()
      .toBuffer();

    // Save 512 PNGs
    fs.writeFileSync(output512Path, png512Buffer);
    fs.writeFileSync(outputPngPath, png512Buffer);
    console.log('Created 512x512 icons in public folder.');

    // 3. Create SVG that wraps the base64-encoded 512x512 PNG
    const base64Png = png512Buffer.toString('base64');
    
    // Create actual SVG content
    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="112" fill="#0a0a0a" />
  <image href="data:image/png;base64,${base64Png}" x="0" y="0" width="512" height="512" />
</svg>`;

    fs.writeFileSync(outputSvgPath, svgContent);
    console.log('Created base64 wrapper SVG at:', outputSvgPath);

    console.log('All icons generated successfully!');
  } catch (err) {
    console.error('Error during generation:', err);
    process.exit(1);
  }
}

run();
