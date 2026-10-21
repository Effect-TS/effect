const hex = Array.from({ length: 256 }, (_, byte) => byte.toString(16).padStart(2, "0"))

/** @internal */
export const stringify = (bytes: Uint8Array): string => {
  if (bytes.length < 16) {
    return [
      bytes.subarray(0, 4),
      bytes.subarray(4, 6),
      bytes.subarray(6, 8),
      bytes.subarray(8, 10),
      bytes.subarray(10, 16)
    ].map((segment) => Array.from(segment, (byte) => hex[byte]).join("")).join("-")
  }
  return hex[bytes[0]] + hex[bytes[1]] + hex[bytes[2]] + hex[bytes[3]] + "-" +
    hex[bytes[4]] + hex[bytes[5]] + "-" +
    hex[bytes[6]] + hex[bytes[7]] + "-" +
    hex[bytes[8]] + hex[bytes[9]] + "-" +
    hex[bytes[10]] + hex[bytes[11]] + hex[bytes[12]] + hex[bytes[13]] + hex[bytes[14]] + hex[bytes[15]]
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

const maxV7Timestamp = 2 ** 48 - 1

/** @internal */
export function v7Bytes(timestampMillis: number): Uint8Array<ArrayBuffer>
/** @internal */
export function v7Bytes<A extends ArrayBufferLike>(timestampMillis: number, bytes: Uint8Array<A>): Uint8Array<A>
/** @internal */
export function v7Bytes(timestampMillis: number, bytes: Uint8Array = randomBytes()): Uint8Array {
  const timestamp = Math.min(Math.max(0, Math.trunc(timestampMillis)), maxV7Timestamp)

  bytes[0] = Math.floor(timestamp / 2 ** 40)
  bytes[1] = Math.floor(timestamp / 2 ** 32) & 0xff
  bytes[2] = Math.floor(timestamp / 2 ** 24) & 0xff
  bytes[3] = Math.floor(timestamp / 2 ** 16) & 0xff
  bytes[4] = Math.floor(timestamp / 2 ** 8) & 0xff
  bytes[5] = timestamp & 0xff
  bytes[6] = (bytes[6] & 0x0f) | 0x70
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  return bytes
}

/** @internal */
export const v7String = (timestampMillis: number, bytes?: Uint8Array): string =>
  stringify(bytes === undefined ? v7Bytes(timestampMillis) : v7Bytes(timestampMillis, bytes))
