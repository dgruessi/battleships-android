import { writeFileSync, mkdirSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { deflateSync } from 'zlib'

const __dirname = dirname(fileURLToPath(import.meta.url))
const iconsDir = join(__dirname, '..', 'public', 'icons')
mkdirSync(iconsDir, { recursive: true })

function buildCRC32Table() {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
}

const CRC32 = buildCRC32Table()

function crc32(buf) {
  let crc = 0xffffffff
  for (const b of buf) crc = (crc >>> 8) ^ CRC32[(crc ^ b) & 0xff]
  return (crc ^ 0xffffffff) >>> 0
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const t = Buffer.from(type)
  const c = Buffer.alloc(4); c.writeUInt32BE(crc32(Buffer.concat([t, data])))
  return Buffer.concat([len, t, data, c])
}

function buildPNG(size, pixels) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 6  // 8-bit RGBA

  const rows = []
  for (let y = 0; y < size; y++) {
    rows.push(0)  // filter type: None
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      rows.push(pixels[i], pixels[i+1], pixels[i+2], pixels[i+3])
    }
  }

  const idat = deflateSync(Buffer.from(rows), { level: 6 })

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', idat),
    makeChunk('IEND', Buffer.alloc(0)),
  ])
}

function paintIcon(size) {
  const px = new Uint8Array(size * size * 4)

  function rect(x1, y1, x2, y2, r, g, b) {
    const sx1 = Math.round(x1 * size / 512)
    const sy1 = Math.round(y1 * size / 512)
    const sx2 = Math.round(x2 * size / 512)
    const sy2 = Math.round(y2 * size / 512)
    for (let y = sy1; y < sy2; y++) {
      for (let x = sx1; x < sx2; x++) {
        const i = (y * size + x) * 4
        px[i] = r; px[i+1] = g; px[i+2] = b; px[i+3] = 255
      }
    }
  }

  // Navy background
  for (let i = 0; i < px.length; i += 4) {
    px[i] = 10; px[i+1] = 22; px[i+2] = 40; px[i+3] = 255
  }

  // Ship hull (gold)
  rect(96, 290, 416, 350, 201, 168, 76)
  // Bridge (dark blue)
  rect(180, 220, 340, 290, 26, 58, 92)
  // Cannon (gold)
  rect(140, 248, 240, 266, 201, 168, 76)
  // Superstructure detail
  rect(200, 190, 300, 220, 201, 168, 76)

  // Red X hit marker (cross)
  const t = Math.max(1, Math.round(14 * size / 512))
  const x0 = Math.round(330 * size / 512)
  const y0 = Math.round(150 * size / 512)
  const x1 = Math.round(395 * size / 512)
  const y1 = Math.round(215 * size / 512)
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = (x - x0) / (x1 - x0)
      const dy = (y - y0) / (y1 - y0)
      if (Math.abs(dy - dx) < (t / size) * 1.2 || Math.abs(dy - (1 - dx)) < (t / size) * 1.2) {
        const i = (y * size + x) * 4
        if (i >= 0 && i + 3 < px.length) {
          px[i] = 230; px[i+1] = 57; px[i+2] = 70; px[i+3] = 255
        }
      }
    }
  }

  return px
}

for (const size of [192, 512]) {
  const pixels = paintIcon(size)
  const path = join(iconsDir, `icon-${size}.png`)
  writeFileSync(path, buildPNG(size, pixels))
  console.log(`Generated ${path}`)
}

writeFileSync(
  join(iconsDir, 'maskable-512.png'),
  readFileSync(join(iconsDir, 'icon-512.png'))
)
console.log('Generated maskable-512.png')
