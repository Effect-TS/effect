const maxTimestamp = 2 ** 48 - 1

const writeTimestamp = (timestampMillis: number, bytes: Uint8Array): void => {
  const timestamp = Math.min(Math.max(0, Math.trunc(timestampMillis)), maxTimestamp)

  bytes[0] = Math.floor(timestamp / 2 ** 40)
  bytes[1] = Math.floor(timestamp / 2 ** 32) & 0xff
  bytes[2] = Math.floor(timestamp / 2 ** 24) & 0xff
  bytes[3] = Math.floor(timestamp / 2 ** 16) & 0xff
  bytes[4] = Math.floor(timestamp / 2 ** 8) & 0xff
  bytes[5] = timestamp & 0xff
}

const base32Chars = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"

// 128 bits are left-padded with two zero bits so that they split into 26 five-bit
// groups, which keeps the encoding lexicographically ordered.
const base32 = (bytes: Uint8Array): string => {
  let accumulator = 0
  let bits = 2
  let out = ""

  for (const byte of bytes) {
    accumulator = (accumulator << 8) | byte
    bits += 8
    while (bits >= 5) {
      bits -= 5
      out += base32Chars[(accumulator >>> bits) & 0x1f]
    }
    accumulator &= (1 << bits) - 1
  }

  return out
}

// A ULID is a 48-bit big-endian timestamp followed by 80 bits of randomness,
// rendered as 26 Crockford base32 characters.
/** @internal */
export const ulidString = (timestampMillis: number, bytes: Uint8Array): string => {
  if (bytes.length !== 10) {
    throw new Error(`ULID randomness must be exactly 10 bytes, received ${bytes.length}`)
  }
  const buffer = new Uint8Array(16)
  writeTimestamp(timestampMillis, buffer)
  buffer.set(bytes, 6)
  return base32(buffer)
}
