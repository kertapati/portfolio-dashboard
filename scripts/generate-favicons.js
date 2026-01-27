const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sourceImage = path.join(__dirname, '../public/brand/logo.svg');
const publicDir = path.join(__dirname, '../public');

async function generateFavicons() {
  try {
    // Generate PNG from SVG first (512x512 for high quality)
    const pngBuffer = await sharp(sourceImage)
      .resize(512, 512)
      .png()
      .toBuffer();

    // Save as logo.png
    await sharp(pngBuffer)
      .toFile(path.join(publicDir, 'brand/logo.png'));
    console.log('✓ Generated logo.png');

    // Generate 16x16 favicon
    await sharp(pngBuffer)
      .resize(16, 16)
      .toFile(path.join(publicDir, 'favicon-16x16.png'));
    console.log('✓ Generated favicon-16x16.png');

    // Generate 32x32 favicon
    await sharp(pngBuffer)
      .resize(32, 32)
      .toFile(path.join(publicDir, 'favicon-32x32.png'));
    console.log('✓ Generated favicon-32x32.png');

    // Generate favicon.ico (using 32x32 as base)
    await sharp(pngBuffer)
      .resize(32, 32)
      .png()
      .toFile(path.join(publicDir, 'favicon.ico'));
    console.log('✓ Generated favicon.ico');

    console.log('\nAll favicons generated successfully!');
  } catch (error) {
    console.error('Error generating favicons:', error);
    process.exit(1);
  }
}

generateFavicons();
