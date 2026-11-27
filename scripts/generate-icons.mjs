import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

/**
 * SyncFav 아이콘 생성기 (외부 의존성 없음, 4x4 슈퍼샘플링 안티앨리어싱)
 * 디자인: 딥 옵시디언 둥근 사각형 위에 중앙의 별(★)을 감싸고 도는 두 개의 동기화 순환 화살표(Sync Arrows)
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
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
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

function pointInPolygon(px, py, verts) {
  let inside = false;
  for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
    const [xi, yi] = verts[i];
    const [xj, yj] = verts[j];
    const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function makeStarVerts(cx, cy, outerR, innerR) {
  const verts = [];
  for (let i = 0; i < 10; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? outerR : innerR;
    verts.push([cx + Math.cos(angle) * r, cy + Math.sin(angle) * r]);
  }
  return verts;
}

function makeArrowHead(tipX, tipY, dirAngle, headLen, headWidth) {
  // 화살촉 삼각형 (tip에서 뒤쪽으로 headLen, 좌우로 headWidth/2)
  const backX = tipX - Math.cos(dirAngle) * headLen;
  const backY = tipY - Math.sin(dirAngle) * headLen;
  const perpX = -Math.sin(dirAngle) * (headWidth / 2);
  const perpY = Math.cos(dirAngle) * (headWidth / 2);
  return [
    [tipX, tipY],
    [backX + perpX, backY + perpY],
    [backX - perpX, backY - perpY],
  ];
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

function angleInArc(angle, start, end) {
  // angle in [-PI, PI] -> normalize to [0, 2PI)
  const norm = (a) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const a = norm(angle);
  const s = norm(start);
  const e = norm(end);
  if (s <= e) return a >= s && a <= e;
  return a >= s || a <= e;
}

function renderIcon(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const radius = size * 0.23;
  const cx = size / 2;
  const cy = size / 2;

  // 중앙 별(★)
  const starVerts = makeStarVerts(cx, cy + size * 0.015, size * 0.205, size * 0.09);

  // 별을 감싸고 도는 2개의 순환 동기화 원호 (시계방향)
  const ringR = size * 0.345;
  const halfStroke = Math.max(size * 0.048, size <= 16 ? 0.95 : 1.4);

  // 상단 원호: -155도 ~ -25도 (화살촉은 -20도 방향, 시계방향 접선 = +70도)
  const deg = (d) => (d * Math.PI) / 180;
  const arc1Start = deg(-152);
  const arc1End = deg(-26);
  // 하단 원호: +28도 ~ +154도
  const arc2Start = deg(28);
  const arc2End = deg(154);

  const headLen = size * 0.145;
  const headWidth = size * 0.14;

  // 상단 원호 끝점 화살촉
  const tip1Angle = deg(-14);
  const tip1X = cx + Math.cos(tip1Angle) * ringR;
  const tip1Y = cy + Math.sin(tip1Angle) * ringR;
  const arrow1 = makeArrowHead(tip1X, tip1Y, tip1Angle + Math.PI / 2 - deg(10), headLen, headWidth);

  // 하단 원호 끝점 화살촉
  const tip2Angle = deg(166);
  const tip2X = cx + Math.cos(tip2Angle) * ringR;
  const tip2Y = cy + Math.sin(tip2Angle) * ringR;
  const arrow2 = makeArrowHead(tip2X, tip2Y, tip2Angle + Math.PI / 2 - deg(10), headLen, headWidth);

  // 둥근 끝 캡 위치 (원호 시작점)
  const cap1X = cx + Math.cos(arc1Start) * ringR;
  const cap1Y = cy + Math.sin(arc1Start) * ringR;
  const cap2X = cx + Math.cos(arc2Start) * ringR;
  const cap2Y = cy + Math.sin(arc2Start) * ringR;

  const samplesPerAxis = size <= 32 ? 4 : 3;
  const totalSamples = samplesPerAxis * samplesPerAxis;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let rAcc = 0;
      let gAcc = 0;
      let bAcc = 0;
      let aAcc = 0;

      for (let sy = 0; sy < samplesPerAxis; sy++) {
        for (let sx = 0; sx < samplesPerAxis; sx++) {
          const px = x + (sx + 0.5) / samplesPerAxis;
          const py = y + (sy + 0.5) / samplesPerAxis;
          if (!inRoundedRect(px, py, size, radius)) continue;

          const dx = px - cx;
          const dy = py - cy;
          const dist = Math.hypot(dx, dy);
          const ang = Math.atan2(dy, dx);

          const inStar = pointInPolygon(px, py, starVerts);
          const onRingBand = Math.abs(dist - ringR) <= halfStroke;
          const inArc1 = onRingBand && angleInArc(ang, arc1Start, arc1End);
          const inArc2 = onRingBand && angleInArc(ang, arc2Start, arc2End);
          const inCap1 = Math.hypot(px - cap1X, py - cap1Y) <= halfStroke;
          const inCap2 = Math.hypot(px - cap2X, py - cap2Y) <= halfStroke;
          const inArrow1 = pointInPolygon(px, py, arrow1);
          const inArrow2 = pointInPolygon(px, py, arrow2);

          if (inStar) {
            // 선명한 웜 골드/앰버 별 (#FBBF24 -> #FDE68A)
            const t = Math.max(0, Math.min(1, (py - (cy - size * 0.2)) / (size * 0.4)));
            rAcc += Math.round(253 * (1 - t) + 245 * t);
            gAcc += Math.round(224 * (1 - t) + 158 * t);
            bAcc += Math.round(71 * (1 - t) + 11 * t);
            aAcc += 255;
          } else if (inArc1 || inArc2 || inCap1 || inCap2 || inArrow1 || inArrow2) {
            // 상단 원호는 crisp white, 하단 원호는 soft cyan-mint (#38BDF8 / #E2E8F0)
            const isUpper = inArc1 || inCap1 || inArrow1;
            if (isUpper) {
              rAcc += 248;
              gAcc += 250;
              bAcc += 252;
            } else {
              rAcc += 56;
              gAcc += 189;
              bAcc += 248;
            }
            aAcc += 255;
          } else {
            // 깊은 옵시디언 네이비 배경 (#0F172A -> #090D16) + 미세한 상단 광택
            const t = py / size;
            rAcc += Math.round(24 * (1 - t) + 10 * t);
            gAcc += Math.round(30 * (1 - t) + 14 * t);
            bAcc += Math.round(46 * (1 - t) + 24 * t);
            aAcc += 255;
          }
        }
      }

      const idx = (y * size + x) * 4;
      const alpha = Math.round(aAcc / totalSamples);
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
console.log('Generated Star-Sync icons in assets/icons (16, 32, 48, 128)');
