import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

/**
 * 외부 라이브러리 없이 순수 Node.js로 SyncFav 아이콘 PNG(16/32/48/128)를 생성한다.
 * 둥근 사각형 그라디언트 배경(#3b82f6 -> #06b6d4) 위에 흰색 5각 별(★)을 렌더링한다.
 */

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

function pointInStar(px, py, cx, cy, outerR, innerR) {
  // 10개 꼭짓점(5각 별) 폴리곤 ray-casting
  const verts = [];
  for (let i = 0; i < 10; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? outerR : innerR;
    verts.push([cx + Math.cos(angle) * r, cy + Math.sin(angle) * r]);
  }
  let inside = false;
  for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
    const [xi, yi] = verts[i];
    const [xj, yj] = verts[j];
    const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function inRoundedRect(x, y, size, radius) {
  const min = radius;
  const max = size - radius;
  if (x >= min && x <= max) return true;
  if (y >= min && y <= max) return true;
  const cx = x < min ? min : max;
  const cy = y < min ? min : max;
  return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2;
}

function renderIcon(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const radius = size * 0.22;
  const cx = size / 2;
  const cy = size / 2 + size * 0.02;
  const outerR = size * 0.34;
  const innerR = size * 0.15;

  // 2x2 슈퍼샘플링 안티앨리어싱
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let rAcc = 0;
      let gAcc = 0;
      let bAcc = 0;
      let aAcc = 0;

      for (let sy = 0; sy < 2; sy++) {
        for (let sx = 0; sx < 2; sx++) {
          const px = x + (sx + 0.5) / 2;
          const py = y + (sy + 0.5) / 2;
          if (!inRoundedRect(px, py, size, radius)) continue;

          if (pointInStar(px, py, cx, cy, outerR, innerR)) {
            rAcc += 255;
            gAcc += 255;
            bAcc += 255;
            aAcc += 255;
          } else {
            const t = (px + py) / (2 * size);
            // #3b82f6 (59,130,246) -> #06b6d4 (6,182,212)
            rAcc += Math.round(59 * (1 - t) + 6 * t);
            gAcc += Math.round(130 * (1 - t) + 182 * t);
            bAcc += Math.round(246 * (1 - t) + 212 * t);
            aAcc += 255;
          }
        }
      }

      const idx = (y * size + x) * 4;
      const samples = 4;
      const alpha = Math.round(aAcc / samples);
      rgba[idx] = alpha > 0 ? Math.round(rAcc / (aAcc / 255)) : 0;
      rgba[idx + 1] = alpha > 0 ? Math.round(gAcc / (aAcc / 255)) : 0;
      rgba[idx + 2] = alpha > 0 ? Math.round(bAcc / (aAcc / 255)) : 0;
      rgba[idx + 3] = alpha;
    }
  }

  return encodePng(size, size, rgba);
}

const outDir = path.resolve('assets/icons');
fs.mkdirSync(outDir, { recursive: true });

for (const size of [16, 32, 48, 128]) {
  const png = renderIcon(size);
  fs.writeFileSync(path.join(outDir, `icon${size}.png`), png);
}
console.log('Generated icons in assets/icons (16, 32, 48, 128)');
