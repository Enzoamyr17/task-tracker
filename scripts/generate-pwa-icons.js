const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = {
  'icon-192x192.png': 192,
  'icon-512x512.png': 512,
  'badge-72x72.png': 72,
  'checkmark.png': 24,
  'close.png': 24
};

const sourceIcon = path.join(__dirname, '../src/assets/icon.png');
const outputDir = path.join(__dirname, '../public/icons');

// Create icons directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Generate each icon
Object.entries(sizes).forEach(async ([filename, size]) => {
  try {
    await sharp(sourceIcon)
      .resize(size, size)
      .toFile(path.join(outputDir, filename));
    console.log(`Generated ${filename}`);
  } catch (error) {
    console.error(`Error generating ${filename}:`, error);
  }
}); 