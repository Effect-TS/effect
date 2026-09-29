/**
 * UTF-16LE text helpers shared by the TDS codec and NTLM.
 *
 * TDS sends every identifier and Unicode value as UTF-16LE. Node's `Buffer`
 * has native UCS-2 routines that beat any JavaScript loop on long strings;
 * they are used when the runtime provides them and accepts a plain
 * `Uint8Array`, and a portable path covers every other runtime.
 */

/** Up to this many code units a `String.fromCharCode` loop beats a native call. */
const shortStringLimit = 16

const probe = <A>(f: A | undefined, check: (f: A) => boolean): A | undefined => {
  if (typeof f !== "function") return undefined
  try {
    return check(f) ? f : undefined
  } catch {
    return undefined
  }
}

type Slice = (this: Uint8Array, start: number, end: number) => string
type Write = (this: Uint8Array, value: string, offset: number, length: number) => number

const bufferPrototype = (globalThis as any).Buffer?.prototype

/** Node's own UCS-2 decoder, when it works on a plain `Uint8Array`. */
const ucs2Slice: Slice | undefined = probe<Slice>(
  bufferPrototype?.ucs2Slice,
  (slice) => slice.call(new Uint8Array([0x41, 0, 0xbb, 0x03]), 0, 4) === "Aλ"
)

/** Node's own UCS-2 encoder, when it works on a plain `Uint8Array`. */
const ucs2Write: Write | undefined = probe<Write>(bufferPrototype?.ucs2Write, (write) => {
  const bytes = new Uint8Array(4)
  return write.call(bytes, "Aλ", 0, 4) === 4 && bytes[0] === 0x41 && bytes[2] === 0xbb && bytes[3] === 0x03
})

const decoder = new TextDecoder("utf-16le")

/** @internal */
export const decodeUtf16 = (bytes: Uint8Array, offset: number, size: number): string => {
  const units = size >>> 1
  if (units <= shortStringLimit) {
    let text = ""
    for (let i = 0; i < units; i++) {
      const index = offset + i * 2
      text += String.fromCharCode(bytes[index] | (bytes[index + 1] << 8))
    }
    return text
  }
  if (ucs2Slice !== undefined) return ucs2Slice.call(bytes, offset, offset + units * 2)
  return decoder.decode(new Uint8Array(bytes.buffer, bytes.byteOffset + offset, units * 2))
}

/**
 * Writes `value` at `offset` and returns the number of bytes written. The
 * caller reserves `value.length * 2` bytes first.
 *
 * @internal
 */
export const writeUtf16 = (bytes: Uint8Array, offset: number, value: string): number => {
  const length = value.length
  if (length > shortStringLimit && ucs2Write !== undefined) {
    return ucs2Write.call(bytes, value, offset, length * 2)
  }
  for (let i = 0; i < length; i++) {
    const code = value.charCodeAt(i)
    bytes[offset + i * 2] = code
    bytes[offset + i * 2 + 1] = code >>> 8
  }
  return length * 2
}

/** @internal */
export const encodeUtf16 = (value: string): Uint8Array => {
  const bytes = new Uint8Array(value.length * 2)
  writeUtf16(bytes, 0, value)
  return bytes
}

/**
 * The UTF-8 length of `value` without encoding it. `VARCHAR` parameter lengths
 * are declared from it before the value is transcoded to the collation's code
 * page, as tedious did.
 *
 * @internal
 */
export const utf8Length = (value: string): number => {
  let length = 0
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i)
    if (code < 0x80) length += 1
    else if (code < 0x800) length += 2
    else if (code >= 0xd800 && code <= 0xdbff && i + 1 < value.length) {
      const next = value.charCodeAt(i + 1)
      if (next >= 0xdc00 && next <= 0xdfff) {
        length += 4
        i++
      } else length += 3
    } else length += 3
  }
  return length
}
