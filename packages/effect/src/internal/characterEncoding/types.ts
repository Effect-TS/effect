export interface Mapping {
  readonly table: ReadonlyArray<ReadonlyArray<string | number>>
  readonly encodeAdd?: Readonly<Record<string, number>>
  readonly encodeSkipVals?: ReadonlyArray<number | { readonly from: number; readonly to: number }>
  readonly ranges?: { readonly uChars: ReadonlyArray<number>; readonly gbChars: ReadonlyArray<number> }
}

export interface Encoder {
  readonly write: (text: string) => Uint8Array
  readonly end: () => Uint8Array
}

export interface Decoder {
  readonly write: (bytes: Uint8Array) => string
  readonly end: () => string
}

export interface Options {
  readonly fatal?: boolean
  readonly stripBOM?: boolean
  readonly addBOM?: boolean
}

export const empty = new Uint8Array(0)

export const concat = (a: Uint8Array, b: Uint8Array): Uint8Array => {
  if (a.length === 0) return b
  if (b.length === 0) return a
  const result = new Uint8Array(a.length + b.length)
  result.set(a)
  result.set(b, a.length)
  return result
}

const littleEndian = new Uint8Array(new Uint16Array([1]).buffer)[0] === 1
const ucs2Slice: ((this: Uint8Array, start: number, end: number) => string) | undefined = (globalThis as {
  Buffer?: { prototype?: { ucs2Slice?: (this: Uint8Array, start: number, end: number) => string } }
}).Buffer?.prototype?.ucs2Slice

export const charsToString = (chars: Uint16Array, length: number): string => {
  if (littleEndian && ucs2Slice !== undefined) {
    const bytes = new Uint8Array(chars.buffer, chars.byteOffset, length * 2)
    return ucs2Slice.call(bytes, 0, bytes.length)
  }
  let result = ""
  for (let offset = 0; offset < length; offset += 8192) {
    result += String.fromCharCode(...chars.subarray(offset, Math.min(offset + 8192, length)))
  }
  return result
}
