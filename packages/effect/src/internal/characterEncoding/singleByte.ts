// Table-driven approach adapted from iconv-lite (MIT); attribution is included
// with singleByteData.ts. Codec instances cache tables, not conversion state.
import { charsToString, empty } from "./types.ts"
import type { Decoder, Encoder, Options } from "./types.ts"

export class SingleByte {
  readonly decodeTable: Uint16Array
  readonly encodeTable = new Uint8Array(65536).fill(63)
  readonly representable = new Uint8Array(65536)

  constructor(chars: string) {
    if (chars.length === 128) {
      chars = String.fromCharCode(...Array.from({ length: 128 }, (_, i) => i)) + chars
    }
    this.decodeTable = new Uint16Array(256)
    for (let i = 0; i < 256; i++) {
      const code = chars.charCodeAt(i)
      this.decodeTable[i] = code
      this.encodeTable[code] = i
      if (code !== 0xfffd) this.representable[code] = 1
    }
  }

  encoder(options: Options): Encoder {
    const table = this.encodeTable
    if (!options.fatal) {
      return {
        write(text) {
          const result = new Uint8Array(text.length)
          for (let i = 0; i < text.length; i++) result[i] = table[text.charCodeAt(i)]
          return result
        },
        end: () => empty
      }
    }
    const representable = this.representable
    return {
      write(text) {
        const result = new Uint8Array(text.length)
        for (let i = 0; i < text.length; i++) {
          const code = text.charCodeAt(i)
          if (!representable[code]) throw new RangeError(`Unrepresentable character at UTF-16 offset ${i}`)
          result[i] = table[code]
        }
        return result
      },
      end: () => empty
    }
  }

  decoder(options: Options): Decoder {
    const table = this.decodeTable
    if (!options.fatal) {
      return {
        write(bytes) {
          const chars = new Uint16Array(bytes.length)
          for (let i = 0; i < bytes.length; i++) chars[i] = table[bytes[i]]
          return charsToString(chars, chars.length)
        },
        end: () => ""
      }
    }
    return {
      write(bytes) {
        const chars = new Uint16Array(bytes.length)
        for (let i = 0; i < bytes.length; i++) {
          const code = table[bytes[i]]
          if (code === 0xfffd && options.fatal) throw new RangeError(`Invalid byte at offset ${i}`)
          chars[i] = code
        }
        return charsToString(chars, chars.length)
      },
      end: () => ""
    }
  }
}
