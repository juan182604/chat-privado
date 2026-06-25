/**
 * Generate PWA icons (192, 512, 180 apple-touch-icon, 32 favicon) from an SVG.
 * Uses sharp (already installed).
 */
import sharp from 'sharp'
import { promises as fs } from 'fs'
import path from 'path'

const PUBLIC = path.join(process.cwd(), 'public')

// SVG source: chat bubble with gradient + "ID" text representing the unique 6-char ID concept
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10b981"/>
      <stop offset="100%" stop-color="#06b6d4"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000" flood-opacity="0.3"/>
    </filter>
  </defs>
  <!-- Rounded square background -->
  <rect width="512" height="512" rx="112" fill="url(#bg)"/>
  <!-- Chat bubble -->
  <path d="M 128 168 Q 128 128 168 128 L 344 128 Q 384 128 384 168 L 384 296 Q 384 336 344 336 L 216 336 L 168 384 L 176 336 Q 128 336 128 296 Z" fill="white" filter="url(#shadow)"/>
  <!-- ID text -->
  <text x="256" y="248" font-family="system-ui, -apple-system, sans-serif" font-size="96" font-weight="800" fill="#0f766e" text-anchor="middle" letter-spacing="-2">ID</text>
  <!-- 6 dots representing the 6-char unique ID -->
  <g fill="#10b981">
    <circle cx="200" cy="300" r="6"/>
    <circle cx="224" cy="300" r="6"/>
    <circle cx="248" cy="300" r="6"/>
    <circle cx="272" cy="300" r="6"/>
    <circle cx="296" cy="300" r="6"/>
    <circle cx="320" cy="300" r="6"/>
  </g>
</svg>`

async function main() {
  await fs.mkdir(PUBLIC, { recursive: true })
  const svgBuffer = Buffer.from(SVG)

  // 512x512 — required for PWA
  await sharp(svgBuffer).resize(512, 512).png().toFile(path.join(PUBLIC, 'icon-512.png'))
  console.log('✓ icon-512.png')

  // 192x192 — required for PWA
  await sharp(svgBuffer).resize(192, 192).png().toFile(path.join(PUBLIC, 'icon-192.png'))
  console.log('✓ icon-192.png')

  // 180x180 — apple-touch-icon for iOS
  await sharp(svgBuffer).resize(180, 180).png().toFile(path.join(PUBLIC, 'apple-touch-icon.png'))
  console.log('✓ apple-touch-icon.png')

  // 32x32 favicon
  await sharp(svgBuffer).resize(32, 32).png().toFile(path.join(PUBLIC, 'favicon-32.png'))
  console.log('✓ favicon-32.png')

  // 16x16 favicon
  await sharp(svgBuffer).resize(16, 16).png().toFile(path.join(PUBLIC, 'favicon-16.png'))
  console.log('✓ favicon-16.png')

  // ICO favicon (sharp can't make .ico directly; we use the 32px PNG as favicon)
  await fs.copyFile(path.join(PUBLIC, 'favicon-32.png'), path.join(PUBLIC, 'favicon.ico'))
  console.log('✓ favicon.ico')

  // Maskable icon (same as 512 but with padding for safe zone)
  // For maskable, the safe zone is the inner 80%. We add a background fill.
  await sharp(svgBuffer)
    .resize(512, 512, { fit: 'contain', background: { r: 16, g: 185, b: 129, alpha: 1 } })
    .png()
    .toFile(path.join(PUBLIC, 'icon-maskable-512.png'))
  console.log('✓ icon-maskable-512.png')

  console.log('\nAll icons generated successfully.')
}

main().catch((e) => { console.error(e); process.exit(1) })
