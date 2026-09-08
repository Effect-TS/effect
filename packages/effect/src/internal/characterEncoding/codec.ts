import type { Encoding } from "../../CharacterEncoding.ts"
import { concat } from "./types.ts"
import type { Decoder, Encoder, Options } from "./types.ts"

/** Creates a descriptor now, but constructs shared lookup tables only on use. */
export const make = (
  name: string,
  aliases: ReadonlyArray<string>,
  create: () => { readonly encoder: (options: Options) => Encoder; readonly decoder: (options: Options) => Decoder },
  unicode = false
): Encoding => {
  let cached: ReturnType<typeof create> | undefined
  const codec = () => cached ??= create()
  return Object.freeze({
    name,
    aliases: Object.freeze([...aliases]),
    makeEncoder(options: Options) {
      const underlying = codec().encoder(options)
      let bom = unicode && options.addBOM ? underlying.write("\ufeff") : undefined
      const prepend = (bytes: Uint8Array): Uint8Array => {
        if (bom === undefined) return bytes
        const prefix = bom
        bom = undefined
        return concat(prefix, bytes)
      }
      return { write: (text: string) => prepend(underlying.write(text)), end: () => prepend(underlying.end()) }
    },
    makeDecoder(options: Options) {
      const underlying = codec().decoder(options)
      let first = unicode && options.stripBOM !== false
      const strip = (text: string): string => {
        if (!first || text.length === 0) return text
        first = false
        return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
      }
      return { write: (bytes: Uint8Array) => strip(underlying.write(bytes)), end: () => strip(underlying.end()) }
    }
  })
}
