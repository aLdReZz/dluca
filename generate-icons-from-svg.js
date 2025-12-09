// Generate PNG icons from SVG using sharp
// Run with: node generate-icons-from-svg.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateIcons() {
    try {

        const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
        const iconsDir = path.join(__dirname, 'public', 'icons');

        // Create icons directory if it doesn't exist
        if (!fs.existsSync(iconsDir)) {
            fs.mkdirSync(iconsDir, { recursive: true });
            console.log('✓ Created public/icons/ directory');
        }

        const svgBuffer = fs.readFileSync(path.join(__dirname, 'logo_no_circle.svg'));

        console.log('\nGenerating circular icons...\n');

        // Generate each size with circular mask
        for (const size of sizes) {
            // Create circular mask
            const circle = Buffer.from(
                `<svg width="${size}" height="${size}">
                    <circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="white"/>
                </svg>`
            );

            // Resize logo and apply circular mask
            const logo = await sharp(svgBuffer)
                .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
                .png()
                .toBuffer();

            await sharp(logo)
                .composite([{
                    input: circle,
                    blend: 'dest-in'
                }])
                .png()
                .toFile(path.join(iconsDir, `icon-${size}x${size}.png`));
            console.log(`✓ Generated icon-${size}x${size}.png (circular)`);
        }

        // Generate circular favicon
        const faviconSize = 48;
        const faviconCircle = Buffer.from(
            `<svg width="${faviconSize}" height="${faviconSize}">
                <circle cx="${faviconSize/2}" cy="${faviconSize/2}" r="${faviconSize/2}" fill="white"/>
            </svg>`
        );

        const faviconLogo = await sharp(svgBuffer)
            .resize(faviconSize, faviconSize, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
            .png()
            .toBuffer();

        await sharp(faviconLogo)
            .composite([{
                input: faviconCircle,
                blend: 'dest-in'
            }])
            .png()
            .toFile(path.join(__dirname, 'public', 'favicon.png'));
        console.log('✓ Generated favicon.png (circular)');

        console.log('\n✅ All icons generated successfully!');

    } catch (error) {
        console.error('Error generating icons:', error.message);
        process.exit(1);
    }
}

generateIcons();
