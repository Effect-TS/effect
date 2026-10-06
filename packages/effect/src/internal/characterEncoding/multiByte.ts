// Table format and trie layout derived from iconv-lite (MIT). See the generated
// mapping files for upstream revision and full attribution. Conversion state
// belongs to each encoder/decoder, while immutable lookup tables are shared.
import { charsToString, concat, empty } from "./types.ts"
import type { Decoder, Encoder, Mapping, Options } from "./types.ts"

const branch = -1000
const sequence = -10
const node = () => new Int32Array(256).fill(-1)
const floorIndex = (values: ReadonlyArray<number>, value: number): number => {
  let low = 0
  let high = values.length
  while (low < high) {
    const middle = (low + high) >>> 1
    if (values[middle] <= value) low = middle + 1
    else high = middle
  }
  return low - 1
}

export class MultiByte {
  readonly nodes = [node()]
  readonly sequences: Array<string> = []
  readonly encodeTable = new Int32Array(65536).fill(-1)
  readonly astral = new Map<number, number>()
  readonly encodeSequences = new Map<number, Array<{ readonly text: string; readonly code: number }>>()
  readonly mapping: Mapping
  private maxEncodeBytes = 1
  private maxDecodeUnits = 1

  constructor(mapping: Mapping) {
    this.mapping = mapping
    if (mapping.ranges) this.maxEncodeBytes = 4
    for (const chunk of mapping.table) {
      const address = parseInt(String(chunk[0]), 16)
      const bytes: Array<number> = []
      for (let value = address; value > 255; value >>>= 8) bytes.unshift((value >>> 8) & 255)
      let table = this.nodes[0]
      for (const byte of bytes) {
        if (table[byte] === -1) {
          table[byte] = branch - this.nodes.length
          this.nodes.push(node())
        }
        table = this.nodes[branch - table[byte]]
      }
      let offset = address & 255
      for (let i = 1; i < chunk.length; i++) {
        const part = chunk[i]
        if (typeof part === "number") {
          let code = table[offset - 1] + 1
          for (let j = 0; j < part; j++) table[offset++] = code++
        } else {
          for (let j = 0; j < part.length;) {
            const code = part.codePointAt(j)!
            j += code > 0xffff ? 2 : 1
            if (code > 0xff0 && code <= 0xfff) {
              const length = 0xfff - code + 2
              table[offset++] = sequence - this.sequences.length
              this.sequences.push(part.slice(j, j + length))
              j += length
            } else table[offset++] = code
          }
        }
      }
    }
    const skips = new Set<number>()
    for (const skip of mapping.encodeSkipVals ?? []) {
      if (typeof skip === "number") skips.add(skip)
      else for (let i = skip.from; i <= skip.to; i++) skips.add(i)
    }
    const set = (unicode: number, code: number) => {
      if (unicode <= 0xffff) {
        if (this.encodeTable[unicode] === -1) this.encodeTable[unicode] = code
      } else if (!this.astral.has(unicode)) this.astral.set(unicode, code)
    }
    const visit = (index: number, prefix: number, depth: number, encode = true): void => {
      const table = this.nodes[index]
      for (let i = 0; i < 256; i++) {
        const code = prefix * 256 + i
        const unicode = table[i]
        // Derive allocation bounds from the table, including decode-only entries.
        if (unicode >= 0 || (unicode <= sequence && unicode > branch)) {
          this.maxEncodeBytes = Math.max(this.maxEncodeBytes, depth)
          const units = unicode >= 0 ? (unicode > 0xffff ? 2 : 1) : this.sequences[sequence - unicode].length
          this.maxDecodeUnits = Math.max(this.maxDecodeUnits, Math.ceil(units / depth))
        }
        const encodable = encode && !skips.has(code)
        if (unicode <= branch) {
          // Even an encoder-skipped subtree remains reachable by the decoder.
          visit(branch - unicode, code, depth + 1, encodable)
          continue
        }
        if (!encodable) continue
        if (unicode >= 0) set(unicode, code)
        else if (unicode <= sequence) {
          const text = this.sequences[sequence - unicode]
          const first = text.codePointAt(0)!
          const entries = this.encodeSequences.get(first) ?? []
          entries.push({ text, code })
          this.encodeSequences.set(first, entries)
        }
      }
    }
    visit(0, 0, 1)
    for (const [char, code] of Object.entries(mapping.encodeAdd ?? {})) {
      set(char.codePointAt(0)!, code)
      this.maxEncodeBytes = Math.max(this.maxEncodeBytes, code > 0xffffff ? 4 : code > 0xffff ? 3 : code > 255 ? 2 : 1)
    }
  }

  private encoderSimple(options: Options): Encoder {
    // No sequence lookups or GB18030 range handling in the common table-only path.
    const table = this.encodeTable
    const astral = this.astral
    const capacity = this.maxEncodeBytes
    let lead = -1
    const convert = (chunk: string, final: boolean): Uint8Array => {
      const text = lead === -1 ? chunk : String.fromCharCode(lead) + chunk
      lead = -1
      const output = new Uint8Array(text.length * capacity)
      let offset = 0
      for (let i = 0; i < text.length; i++) {
        const start = i
        let unicode = text.charCodeAt(i)
        if (unicode >= 0xd800 && unicode <= 0xdbff) {
          if (!final && i + 1 === text.length) {
            lead = unicode
            break
          }
          const trail = text.charCodeAt(i + 1)
          if (trail >= 0xdc00 && trail <= 0xdfff) {
            unicode = 0x10000 + (unicode - 0xd800) * 1024 + trail - 0xdc00
            i++
          }
        }
        let code = unicode <= 0xffff ? table[unicode] : astral.get(unicode) ?? -1
        if (code === -1) {
          if (options.fatal) throw new RangeError(`Unrepresentable character at UTF-16 offset ${start}`)
          code = 63
        }
        if (code > 0xffffff) output[offset++] = code >>> 24
        if (code > 0xffff) output[offset++] = code >>> 16
        if (code > 0xff) output[offset++] = code >>> 8
        output[offset++] = code
      }
      return output.subarray(0, offset)
    }
    return { write: (text) => convert(text, false), end: () => convert("", true) }
  }

  encoder(options: Options): Encoder {
    if (!this.mapping.ranges && this.encodeSequences.size === 0) return this.encoderSimple(options)
    let pending = ""
    const table = this.encodeTable
    const ranges = this.mapping.ranges
    const convert = (chunk: string, final: boolean): Uint8Array => {
      const text = pending + chunk
      pending = ""
      const output = new Uint8Array(text.length * this.maxEncodeBytes)
      let offset = 0
      for (let i = 0; i < text.length;) {
        const start = i
        let unicode = text.charCodeAt(i)
        if (!final && unicode >= 0xd800 && unicode <= 0xdbff && i + 1 === text.length) {
          pending = text.slice(i)
          break
        }
        let width = 1
        if (unicode >= 0xd800 && unicode <= 0xdbff && i + 1 < text.length) {
          const trail = text.charCodeAt(i + 1)
          if (trail >= 0xdc00 && trail <= 0xdfff) {
            unicode = 0x10000 + (unicode - 0xd800) * 1024 + trail - 0xdc00
            width = 2
          }
        }
        let code = unicode < 65536 ? table[unicode] : this.astral.get(unicode) ?? -1
        let consumed = width
        const sequences = this.encodeSequences.get(unicode)
        if (sequences !== undefined) {
          let incomplete = false
          for (const entry of sequences) {
            if (text.startsWith(entry.text, i)) {
              if (entry.text.length > consumed) {
                code = entry.code
                consumed = entry.text.length
              }
            } else if (!final && entry.text.startsWith(text.slice(i))) incomplete = true
          }
          if (incomplete) {
            pending = text.slice(i)
            break
          }
        }
        i += consumed
        if (code === -1 && ranges && !(unicode >= 0xd800 && unicode <= 0xdfff)) {
          const index = floorIndex(ranges.uChars, unicode)
          if (index >= 0) {
            let pointer = ranges.gbChars[index] + unicode - ranges.uChars[index]
            output[offset++] = 0x81 + Math.floor(pointer / 12600)
            pointer %= 12600
            output[offset++] = 0x30 + Math.floor(pointer / 1260)
            pointer %= 1260
            output[offset++] = 0x81 + Math.floor(pointer / 10)
            output[offset++] = 0x30 + pointer % 10
            continue
          }
        }
        if (code === -1) {
          if (options.fatal) throw new RangeError(`Unrepresentable character at UTF-16 offset ${start}`)
          code = 63
        }
        if (code > 0xffffff) output[offset++] = code >>> 24
        if (code > 0xffff) output[offset++] = code >>> 16
        if (code > 0xff) output[offset++] = code >>> 8
        output[offset++] = code
      }
      return output.subarray(0, offset)
    }
    return { write: (text) => convert(text, false), end: () => convert("", true) }
  }

  decoder(options: Options): Decoder {
    let pending = empty
    const ranges = this.mapping.ranges
    const convert = (chunk: Uint8Array, final: boolean): string => {
      const bytes = concat(pending, chunk)
      pending = empty
      const chars = new Uint16Array(bytes.length * this.maxDecodeUnits)
      let output = 0
      let start = 0
      const append = (unicode: number) => {
        if (unicode > 0xffff) {
          unicode -= 0x10000
          chars[output++] = 0xd800 | (unicode >>> 10)
          chars[output++] = 0xdc00 | (unicode & 1023)
        } else chars[output++] = unicode
      }
      while (start < bytes.length) {
        let index = 0
        let end = start
        let unicode = -1
        let incomplete = false
        if (
          ranges && bytes[start] >= 0x81 && bytes[start] <= 0xfe && bytes[start + 1] >= 0x30 && bytes[start + 1] <= 0x39
        ) {
          if (start + 2 >= bytes.length || (bytes[start + 2] >= 0x81 && bytes[start + 2] <= 0xfe)) {
            if (start + 3 >= bytes.length) incomplete = true
            else if (bytes[start + 3] >= 0x30 && bytes[start + 3] <= 0x39) {
              const pointer = (bytes[start] - 0x81) * 12600 + (bytes[start + 1] - 0x30) * 1260 +
                (bytes[start + 2] - 0x81) * 10 + bytes[start + 3] - 0x30
              const range = floorIndex(ranges.gbChars, pointer)
              unicode = range < 0 ? -1 : ranges.uChars[range] + pointer - ranges.gbChars[range]
              if (unicode > 0x10ffff || (unicode >= 0xd800 && unicode <= 0xdfff)) unicode = -1
              end = start + 4
            }
          }
        } else {
          while (end < bytes.length) {
            unicode = this.nodes[index][bytes[end++]]
            if (unicode > branch) break
            index = branch - unicode
          }
          incomplete = unicode <= branch
        }
        if (incomplete && !final) {
          pending = bytes.slice(start)
          break
        }
        if (incomplete || unicode === -1) {
          if (options.fatal) throw new RangeError(`Invalid or incomplete byte sequence at offset ${start}`)
          chars[output++] = 0xfffd
          start++
        } else {
          if (unicode <= sequence) {
            const text = this.sequences[sequence - unicode]
            for (let i = 0; i < text.length; i++) chars[output++] = text.charCodeAt(i)
          } else append(unicode)
          start = end
        }
      }
      return charsToString(chars, output)
    }
    return { write: (bytes) => convert(bytes, false), end: () => convert(empty, true) }
  }
}
