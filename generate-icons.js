import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const inputImage = path.join(__dirname, 'public', 'favicon.png');
const outputDir = path.join(__dirname, 'public', 'icons');

async function generateIcons() {
  try {
    // Ensure the output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    console.log('Generating PWA icons...');

    for (const size of sizes) {
      const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);

      await sharp(inputImage)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .toFile(outputPath);

      console.log(`✓ Generated ${size}x${size} icon`);
    }

    console.log('\n✓ All icons generated successfully!');
    console.log(`Icons saved to: ${outputDir}`);
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();
