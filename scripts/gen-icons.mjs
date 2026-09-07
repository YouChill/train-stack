// Generator ikon PWA (node scripts/gen-icons.mjs).
//
// Manifest i iOS wymagają PNG-ów — SVG w manifeście jest w Chrome zawodny,
// a apple-touch-icon musi być PNG-iem. W repo nie ma żadnej zależności
// graficznej (ani ImageMagick w środowisku), więc PNG składamy ręcznie:
// nagłówki + zlib deflate. Skrypt jest w repo, żeby ikony dało się odtworzyć
// i podmienić motyw jednym uruchomieniem, zamiast trzymać nietykalne binaria.
//
// Znak: trzy rosnące słupki (postęp treningowy) w kolorze lime na granacie —
// te same kolory co --chrome-bg i akcent w src/styles.js.
import zlib from 'node:zlib'
import fs from 'node:fs'
import path from 'node:path'

const NAVY = [0x1a, 0x22, 0x33]
const LIME = [0xb4, 0xf1, 0x3a]
const OUT = path.join(process.cwd(), 'public')

const crcTable = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let c = -1
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

// RGBA, 8 bitów na kanał, bez filtrowania (bajt 0 na początku każdej linii).
function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8      // bit depth
  ihdr[9] = 6      // color type: truecolour with alpha
  const raw = Buffer.alloc(height * (width * 4 + 1))
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// Zaokrąglony prostokąt w znormalizowanych współrzędnych [0,1].
const inRoundRect = (x, y, x0, y0, x1, y1, r) => {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false
  const cx = Math.min(Math.max(x, x0 + r), x1 - r)
  const cy = Math.min(Math.max(y, y0 + r), y1 - r)
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r
}

// Trzy rosnące słupki. `scale` ścieśnia znak do bezpiecznego pola (maskable
// przycina wszystko poza środkowymi 80%).
function bars(x, y, scale = 1) {
  const s = (v) => 0.5 + (v - 0.5) * scale
  const geo = [
    [0.22, 0.50], [0.43, 0.34], [0.64, 0.20],
  ]
  for (const [bx, top] of geo) {
    const x0 = s(bx), x1 = s(bx + 0.14)
    const y0 = s(top), y1 = s(0.78)
    if (inRoundRect(x, y, x0, y0, x1, y1, (x1 - x0) / 2)) return true
  }
  return false
}

// 4×4 supersampling — bez tego krawędzie słupków są schodkowe przy 72 px.
function render(size, { bg, fg, rounded, scale = 1 }) {
  const px = Buffer.alloc(size * size * 4)
  const SS = 4
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let bgHits = 0, fgHits = 0
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = (x + (sx + 0.5) / SS) / size
          const v = (y + (sy + 0.5) / SS) / size
          const inBg = !bg ? false : rounded ? inRoundRect(u, v, 0, 0, 1, 1, 0.22) : true
          if (inBg) bgHits++
          if (bars(u, v, scale)) fgHits++
        }
      }
      const n = SS * SS
      const a = Math.max(bg ? bgHits / n : 0, fgHits / n)
      const mix = fgHits / n
      const i = (y * size + x) * 4
      const base = bg || [0, 0, 0]
      for (let c = 0; c < 3; c++) {
        px[i + c] = a === 0 ? 0 : Math.round((base[c] * (a - mix) + fg[c] * mix) / a)
      }
      px[i + 3] = Math.round(a * 255)
    }
  }
  return encodePng(size, size, px)
}

fs.mkdirSync(OUT, { recursive: true })

const files = [
  ['icon-192.png', render(192, { bg: NAVY, fg: LIME, rounded: true })],
  ['icon-512.png', render(512, { bg: NAVY, fg: LIME, rounded: true })],
  // maskable: pełne tło (Android sam przycina) + znak w środkowych 80%
  ['icon-512-maskable.png', render(512, { bg: NAVY, fg: LIME, rounded: false, scale: 0.8 })],
  ['apple-touch-icon.png', render(180, { bg: NAVY, fg: LIME, rounded: false })],
  // badge na pasku stanu Androida musi być monochromatyczny na przezroczystym
  ['badge-72.png', render(72, { bg: null, fg: [255, 255, 255] })],
]

for (const [name, buf] of files) {
  fs.writeFileSync(path.join(OUT, name), buf)
  console.log(`${name} — ${buf.length} B`)
}

fs.writeFileSync(path.join(OUT, 'favicon.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="#1a2233"/>
  <g fill="#b4f13a">
    <rect x="22" y="50" width="14" height="28" rx="7"/>
    <rect x="43" y="34" width="14" height="44" rx="7"/>
    <rect x="64" y="20" width="14" height="58" rx="7"/>
  </g>
</svg>
`)
console.log('favicon.svg')
