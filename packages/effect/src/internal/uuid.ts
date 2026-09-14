const hex = (byte: number): string => byte.toString(16).padStart(2, "0")

/** @internal */
export const stringify = (bytes: Uint8Array): string => {
  const segments = [
    bytes.subarray(0, 4),
    bytes.subarray(4, 6),
    bytes.subarray(6, 8),
    bytes.subarray(8, 10),
    bytes.subarray(10, 16)
  ]

  return segments.map((segment) => Array.from(segment, hex).join("")).join("-")
}

const randomBytes = (): Uint8Array<ArrayBuffer> => globalThis.crypto.getRandomValues(new Uint8Array(16))

/** @internal */
export function v4Bytes(): Uint8Array<ArrayBuffer>
/** @internal */
export function v4Bytes<A extends ArrayBufferLike>(bytes: Uint8Array<A>): Uint8Array<A>
/** @internal */
export function v4Bytes(bytes: Uint8Array = randomBytes()): Uint8Array {
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  return bytes
}

/** @internal */
export const v4String = (bytes?: Uint8Array): string => stringify(bytes === undefined ? v4Bytes() : v4Bytes(bytes))

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

/** @internal */
export function v7Bytes(timestampMillis: number): Uint8Array<ArrayBuffer>
/** @internal */
export function v7Bytes<A extends ArrayBufferLike>(timestampMillis: number, bytes: Uint8Array<A>): Uint8Array<A>
/** @internal */
export function v7Bytes(timestampMillis: number, bytes: Uint8Array = randomBytes()): Uint8Array {
  writeTimestamp(timestampMillis, bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x70
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  return bytes
}

/** @internal */
export const v7String = (timestampMillis: number, bytes?: Uint8Array): string =>
  stringify(bytes === undefined ? v7Bytes(timestampMillis) : v7Bytes(timestampMillis, bytes))

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
  const buffer = new Uint8Array(16)
  writeTimestamp(timestampMillis, buffer)
  buffer.set(bytes.subarray(0, 10), 6)
  return base32(buffer)
}
