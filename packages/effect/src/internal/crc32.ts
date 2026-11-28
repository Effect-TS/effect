// CRC-32 shared by `effect/encoding/Zip` and the gzip decoder of
// `effect/encoding/Compression`.

// CRC-32 (IEEE) lookup tables for sixteen bytes at a time
const CRC_TABLE = (() => {
  const table = new Int32Array(16 * 256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  for (let n = 0; n < 256; n++) {
    let c = table[n]
    for (let k = 1; k < 16; k++) {
      c = table[c & 0xff] ^ (c >>> 8)
      table[k * 256 + n] = c
    }
  }
  return table
})()

const littleEndian = new Uint8Array(new Uint32Array([1]).buffer)[0] === 1

/**
 * Continues the CRC-32 (IEEE, as in zip and gzip) `crc` over `bytes`; start
 * from 0.
 *
 * @internal
 */
export const crc32 = (crc: number, bytes: Uint8Array): number => {
  const t = CRC_TABLE
  let c = ~crc
  let i = 0
  const length = bytes.length
  // Reading whole words is faster than combining bytes, but needs aligned,
  // little-endian words
  if (littleEndian && length >= 64) {
    for (; ((bytes.byteOffset + i) & 3) !== 0; i++) c = t[(c ^ bytes[i]) & 0xff] ^ (c >>> 8)
    const count = ((length - i) >>> 4) << 2
    const words = new Int32Array(bytes.buffer, bytes.byteOffset + i, count)
    for (let j = 0; j < count; j += 4) {
      const a = c ^ words[j]
      const b = words[j + 1]
      const d = words[j + 2]
      const e = words[j + 3]
      c = t[3840 + (a & 0xff)] ^ t[3584 + ((a >>> 8) & 0xff)] ^ t[3328 + ((a >>> 16) & 0xff)] ^
        t[3072 + (a >>> 24)] ^ t[2816 + (b & 0xff)] ^ t[2560 + ((b >>> 8) & 0xff)] ^
        t[2304 + ((b >>> 16) & 0xff)] ^ t[2048 + (b >>> 24)] ^ t[1792 + (d & 0xff)] ^
        t[1536 + ((d >>> 8) & 0xff)] ^ t[1280 + ((d >>> 16) & 0xff)] ^ t[1024 + (d >>> 24)] ^
        t[768 + (e & 0xff)] ^ t[512 + ((e >>> 8) & 0xff)] ^ t[256 + ((e >>> 16) & 0xff)] ^ t[e >>> 24]
    }
    i += count * 4
  }
  for (; i + 16 <= length; i += 16) {
    const a = c ^ (bytes[i] | (bytes[i + 1] << 8) | (bytes[i + 2] << 16) | (bytes[i + 3] << 24))
    c = t[3840 + (a & 0xff)] ^ t[3584 + ((a >>> 8) & 0xff)] ^ t[3328 + ((a >>> 16) & 0xff)] ^
      t[3072 + (a >>> 24)] ^ t[2816 + bytes[i + 4]] ^ t[2560 + bytes[i + 5]] ^ t[2304 + bytes[i + 6]] ^
      t[2048 + bytes[i + 7]] ^ t[1792 + bytes[i + 8]] ^ t[1536 + bytes[i + 9]] ^ t[1280 + bytes[i + 10]] ^
      t[1024 + bytes[i + 11]] ^ t[768 + bytes[i + 12]] ^ t[512 + bytes[i + 13]] ^ t[256 + bytes[i + 14]] ^
      t[bytes[i + 15]]
  }
  for (; i < length; i++) c = t[(c ^ bytes[i]) & 0xff] ^ (c >>> 8)
  return ~c >>> 0
}
