import { MultiByte } from "./multiByte.ts"
import * as MultiByteData from "./multiByteData.ts"
import { SingleByte } from "./singleByte.ts"
import * as SingleByteData from "./singleByteData.ts"
import { concat } from "./types.ts"
import type { Decoder, Encoder, Options } from "./types.ts"
import * as Unicode from "./unicode.ts"

const unicodeAliases: Readonly<Record<string, string>> = {
  utf8: "utf8",
  unicode11utf8: "utf8",
  utf16le: "utf16le",
  ucs2: "utf16le",
  ucs2le: "utf16le",
  utf16be: "utf16be",
  ucs2be: "utf16be",
  utf32le: "utf32le",
  ucs4le: "utf32le",
  utf32be: "utf32be",
  ucs4be: "utf32be"
}

export const names: ReadonlyArray<string> = Object.freeze([
  "utf8",
  "utf16le",
  "utf16be",
  "utf32le",
  "utf32be",
  ...Object.keys(SingleByteData.definitions),
  ...Object.keys(MultiByteData.definitions)
].sort())

export const normalize = (label: string): string => {
  let name = label.replace(/^[\t\n\f\r ]+|[\t\n\f\r ]+$/g, "").toLowerCase()
  for (let i = 0; i < name.length; i++) {
    const code = name.charCodeAt(i)
    if (
      code <= 8 || code === 11 || (code >= 14 && code <= 31) || (code >= 127 && code <= 160) || code === 0x2028 ||
      code === 0x2029
    ) {
      throw new RangeError(`Unknown encoding: ${label}`)
    }
  }
  name = name.replace(/:\d{4}$|[^0-9a-z]/g, "")
  const seen = new Set<string>()
  while (!seen.has(name)) {
    seen.add(name)
    if (Object.hasOwn(unicodeAliases, name)) return unicodeAliases[name]
    if (Object.hasOwn(SingleByteData.definitions, name) || Object.hasOwn(MultiByteData.definitions, name)) return name
    const next = Object.hasOwn(SingleByteData.aliases, name) ?
      SingleByteData.aliases[name]
      : Object.hasOwn(MultiByteData.aliases, name)
      ? MultiByteData.aliases[name]
      : undefined
    if (next === undefined) break
    name = next
  }
  throw new RangeError(`Unknown encoding: ${label}`)
}

const codecs = new Map<string, SingleByte | MultiByte>()
const codec = (name: string): SingleByte | MultiByte => {
  const cached = codecs.get(name)
  if (cached !== undefined) return cached
  const result = Object.hasOwn(SingleByteData.definitions, name)
    ? new SingleByte(SingleByteData.definitions[name])
    : new MultiByte(MultiByteData.definitions[name])
  codecs.set(name, result)
  return result
}

export const encoder = (label: string, options: Options): Encoder => {
  const name = normalize(label)
  const unicode = Object.hasOwn(unicodeAliases, name)
  const underlying = unicode ? Unicode.encoder(name, options) : codec(name).encoder(options)
  let bom = unicode && options.addBOM ? underlying.write("\ufeff") : undefined
  const prepend = (bytes: Uint8Array): Uint8Array => {
    if (bom === undefined) return bytes
    const prefix = bom
    bom = undefined
    return concat(prefix, bytes)
  }
  return { write: (text) => prepend(underlying.write(text)), end: () => prepend(underlying.end()) }
}

export const decoder = (label: string, options: Options): Decoder => {
  const name = normalize(label)
  const unicode = Object.hasOwn(unicodeAliases, name)
  const underlying = unicode ? Unicode.decoder(name, options) : codec(name).decoder(options)
  let first = unicode && options.stripBOM !== false
  const strip = (text: string): string => {
    if (!first || text.length === 0) return text
    first = false
    return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
  }
  return { write: (bytes) => strip(underlying.write(bytes)), end: () => strip(underlying.end()) }
}
