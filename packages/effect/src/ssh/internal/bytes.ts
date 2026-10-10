/**
 * Byte helpers shared by the SSH modules.
 *
 * @internal
 */

type Bytes = Uint8Array<ArrayBuffer>

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder("utf-8", { fatal: false })

/** @internal */
export const utf8 = (value: string): Bytes => textEncoder.encode(value)

/** @internal */
export const fromUtf8 = (bytes: Uint8Array): string => textDecoder.decode(bytes)

/** @internal */
export const concat = (chunks: ReadonlyArray<Uint8Array>): Bytes => {
  let length = 0
  for (let i = 0; i < chunks.length; i++) length += chunks[i].byteLength
  const out = new Uint8Array(length)
  let offset = 0
  for (let i = 0; i < chunks.length; i++) {
    out.set(chunks[i], offset)
    offset += chunks[i].byteLength
  }
  return out
}

/**
 * Compares two byte arrays without short-circuiting on the first difference.
 *
 * @internal
 */
export const equals = (a: Uint8Array, b: Uint8Array): boolean => {
  if (a.byteLength !== b.byteLength) return false
  let diff = 0
  for (let i = 0; i < a.byteLength; i++) diff |= a[i] ^ b[i]
  return diff === 0
}
