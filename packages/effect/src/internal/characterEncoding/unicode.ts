import { charsToString, concat, empty } from "./types.ts"
import type { Decoder, Encoder, Options } from "./types.ts"

const textEncoder = new TextEncoder()
const nativeBuffer = (globalThis as {
  Buffer?: { from: (text: string, encoding: "utf16le") => Uint8Array<ArrayBuffer> }
}).Buffer

export const encoder = (encoding: string, options: Options): Encoder => {
  let pending = ""
  const utf8 = encoding === "utf8"
  const utf32 = encoding.startsWith("utf32")
  const bigEndian = encoding.endsWith("be")
  const convert = (text: string): Uint8Array => {
    if (utf8) return textEncoder.encode(text)
    if (!utf32) {
      if (!bigEndian && nativeBuffer !== undefined) {
        const buffer = nativeBuffer.from(text, "utf16le")
        // Return a plain Uint8Array without exposing unrelated bytes in a Buffer pool.
        return buffer.byteOffset === 0 && buffer.byteLength === buffer.buffer.byteLength
          ? new Uint8Array(buffer.buffer)
          : new Uint8Array(buffer)
      }
      const output = new Uint8Array(text.length * 2)
      const view = new DataView(output.buffer)
      for (let i = 0; i < text.length; i++) view.setUint16(i * 2, text.charCodeAt(i), !bigEndian)
      return output
    }
    const output = new Uint8Array(text.length * 4)
    const view = new DataView(output.buffer)
    let offset = 0
    for (const char of text) {
      let code = char.codePointAt(0)!
      if (code >= 0xd800 && code <= 0xdfff) code = 0xfffd
      view.setUint32(offset, code, !bigEndian)
      offset += 4
    }
    return output.subarray(0, offset)
  }
  return {
    write(text) {
      text = pending + text
      pending = ""
      // Hold a lead surrogate across chunks; never emit a replacement before
      // the next chunk has had the opportunity to complete the pair.
      if (text.length > 0) {
        const last = text.charCodeAt(text.length - 1)
        if (last >= 0xd800 && last <= 0xdbff) {
          pending = text.slice(-1)
          text = text.slice(0, -1)
        }
      }
      if (options.fatal) validateSurrogates(text)
      return convert(text)
    },
    end() {
      if (pending.length === 0) return empty
      if (options.fatal) throw new RangeError("Incomplete surrogate pair at end of input")
      const result = convert(pending)
      pending = ""
      return result
    }
  }
}

const validateSurrogates = (text: string): void => {
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    if (code < 0xd800 || code > 0xdfff) continue
    const trail = text.charCodeAt(++i)
    if (code >= 0xdc00 || !(trail >= 0xdc00 && trail <= 0xdfff)) {
      throw new RangeError(`Invalid surrogate at UTF-16 offset ${i - 1}`)
    }
  }
}

export const decoder = (encoding: string, options: Options): Decoder => {
  if (encoding === "utf8" || encoding === "utf16le" || encoding === "utf16be") {
    const label = encoding === "utf8" ? "utf-8" : encoding === "utf16le" ? "utf-16le" : "utf-16be"
    const decoder = new TextDecoder(label, { fatal: options.fatal ?? false, ignoreBOM: true })
    return { write: (bytes) => decoder.decode(bytes, { stream: true }), end: () => decoder.decode() }
  }
  let pending = empty
  const width = 4
  const bigEndian = encoding.endsWith("be")
  return {
    write(bytes) {
      bytes = concat(pending, bytes)
      const length = bytes.length - bytes.length % width
      pending = bytes.slice(length)
      const data = new DataView(bytes.buffer, bytes.byteOffset, length)
      const chars = new Uint16Array(length / width * 2)
      let offset = 0
      for (let i = 0; i < length; i += width) {
        let code = data.getUint32(i, !bigEndian)
        if (code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) {
          if (options.fatal) throw new RangeError(`Invalid Unicode scalar at byte offset ${i}`)
          code = 0xfffd
        }
        if (code > 0xffff) {
          code -= 0x10000
          chars[offset++] = 0xd800 | (code >>> 10)
          chars[offset++] = 0xdc00 | (code & 1023)
        } else chars[offset++] = code
      }
      return charsToString(chars, offset)
    },
    end() {
      if (pending.length > 0 && options.fatal) {
        throw new RangeError("Incomplete Unicode character at end of input")
      }
      const result = pending.length > 0 ? "\ufffd" : ""
      pending = empty
      return result
    }
  }
}
