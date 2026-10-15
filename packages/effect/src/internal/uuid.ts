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

/** @internal */
export const v4Bytes = <A extends ArrayBufferLike>(bytes: Uint8Array<A>): Uint8Array<A> => {
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  return bytes
}

/** @internal */
export const v4String = (bytes: Uint8Array): string => stringify(v4Bytes(bytes))

const maxV7Timestamp = 2 ** 48 - 1

/** @internal */
export const v7Bytes = <A extends ArrayBufferLike>(timestampMillis: number, bytes: Uint8Array<A>): Uint8Array<A> => {
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
export const v7String = (timestampMillis: number, bytes: Uint8Array): string =>
  stringify(v7Bytes(timestampMillis, bytes))
