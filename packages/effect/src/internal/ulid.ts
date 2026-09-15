const maxTimestamp = 2 ** 48 - 1
const base32Chars = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"

/** @internal */
export const ulidString = (timestampMillis: number, bytes: Uint8Array): string => {
  if (bytes.length !== 10) {
    throw new Error(`ULID randomness must be exactly 10 bytes, received ${bytes.length}`)
  }
  if (!Number.isInteger(timestampMillis) || timestampMillis < 0 || timestampMillis > maxTimestamp) {
    throw new RangeError(`ULID timestamp must be an integer between 0 and ${maxTimestamp}, received ${timestampMillis}`)
  }

  let timestamp = timestampMillis
  let out = ""
  for (let i = 0; i < 10; i++) {
    out = base32Chars[timestamp % 32] + out
    timestamp = Math.floor(timestamp / 32)
  }

  let accumulator = 0
  let bits = 0
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
