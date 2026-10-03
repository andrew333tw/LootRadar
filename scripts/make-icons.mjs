import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

function crc32(buffer) {
  let crc = ~0;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return ~crc >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function png(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  const center = (size - 1) / 2;
  for (let y = 0; y < size; y += 1) {
    const row = y * (size * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x += 1) {
      const dx = x - center;
      const dy = y - center;
      const distance = Math.hypot(dx, dy);
      const offset = row + 1 + x * 4;
      let red = 20;
      let green = 53;
      let blue = 44;
      let alpha = distance < size * 0.48 ? 255 : 0;
      const ring = Math.abs(distance - size * 0.28) < size * 0.012 || Math.abs(distance - size * 0.4) < size * 0.012;
      if (ring) {
        red = 125;
        green = 206;
        blue = 160;
      }
      const sweep = Math.atan2(dy, dx);
      if (distance < size * 0.4 && sweep > -2.2 && sweep < -0.7 && Math.abs(distance - size * 0.22) < size * 0.015) {
        red = 125;
        green = 206;
        blue = 160;
        alpha = 255;
      }
      const box = Math.abs(dx) < size * 0.12 && dy > -size * 0.02 && dy < size * 0.16;
      const bow = Math.abs(dx) < size * 0.12 && dy > -size * 0.1 && dy < -size * 0.02 && Math.abs(dx) > size * 0.02;
      if (box || bow) {
        red = 215;
        green = 177;
        blue = 90;
        alpha = 255;
      }
      raw[offset] = red;
      raw[offset + 1] = green;
      raw[offset + 2] = blue;
      raw[offset + 3] = alpha;
    }
  }
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    signature,
    chunk("IHDR", header),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const directory = path.resolve("public/icons");
fs.mkdirSync(directory, { recursive: true });
fs.writeFileSync(path.join(directory, "icon-192.png"), png(192));
fs.writeFileSync(path.join(directory, "icon-512.png"), png(512));
console.log("wrote public/icons/icon-192.png and icon-512.png");
