import { Bytes } from "effect"
import * as Thrift from "effect/encoding/Thrift"

// Builders of synthetic Parquet files, shared by the Parquet reader tests and
// the tests of the Arrow adapter.

// ---------------------------------------------------------------------------
// Synthetic files, written with the Thrift writer
// ---------------------------------------------------------------------------

export const text = (s: string) => new TextEncoder().encode(s)

export type V = Thrift.Value
export const I8 = (value: number): V => ({ _tag: "I8", value })
export const I32 = (value: number): V => ({ _tag: "I32", value })
export const I64 = (value: number): V => ({ _tag: "I64", value: BigInt(value) })
export const Bool = (value: boolean): V => ({ _tag: "Bool", value })
export const Str = (value: string): V => ({ _tag: "Binary", value: text(value) })
export const List = (elementType: Thrift.TypeName, elements: ReadonlyArray<V>): V => ({
  _tag: "List",
  elementType,
  elements
})
export const Struct = (fields: { readonly [id: number]: V | undefined }): V => ({
  _tag: "Struct",
  fields: Object.entries(fields).flatMap(([id, value]) => value === undefined ? [] : [{ id: Number(id), value }])
})
export const thrift = (value: V): Uint8Array => {
  const writer = Thrift.makeWriter()
  writer.writeValue(value)
  return writer.finish()
}
export const bytes = (...parts: ReadonlyArray<Uint8Array | ReadonlyArray<number>>): Uint8Array =>
  Bytes.concat(parts.map((part) => Uint8Array.from(part)))
export const u32 = (n: number) => [n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, n >>> 24]
export const uleb = (n: number): Array<number> => n < 0x80 ? [n] : [(n & 0x7f) | 0x80, ...uleb(Math.floor(n / 0x80))]
export const int32s = (...values: ReadonlyArray<number>) => new Uint8Array(Int32Array.from(values).buffer)
export const plainBinary = (...values: ReadonlyArray<string>) =>
  bytes(...values.flatMap((v) => [u32(text(v).length), text(v)]))
/** RLE/bit-packed hybrid runs of repeated values: [value, count] pairs. */
export const runs = (width: number, ...pairs: ReadonlyArray<readonly [number, number]>) =>
  bytes(...pairs.map(([value, count]) => [...uleb(count * 2), ...u32(value).slice(0, (width + 7) >> 3)]))
export const lengthPrefixed = (data: Uint8Array) => bytes(u32(data.length), data)

export const Type = {
  BOOLEAN: 0,
  INT32: 1,
  INT64: 2,
  INT96: 3,
  FLOAT: 4,
  DOUBLE: 5,
  BYTE_ARRAY: 6,
  FIXED_LEN_BYTE_ARRAY: 7
}
export const REQUIRED = 0
export const OPTIONAL = 1
export const REPEATED = 2
export const PLAIN = 0
export const PLAIN_DICTIONARY = 2
export const RLE = 3
export const BIT_PACKED = 4
export const DELTA_BINARY_PACKED = 5
export const DELTA_LENGTH_BYTE_ARRAY = 6
export const DELTA_BYTE_ARRAY = 7
export const RLE_DICTIONARY = 8
export const BYTE_STREAM_SPLIT = 9
export const ALP = 10
export const GZIP = 2

export const element = (name: string, options: {
  readonly type?: number | undefined
  readonly typeLength?: number | undefined
  readonly repetition?: number | undefined
  readonly children?: number | undefined
  readonly convertedType?: number | undefined
  readonly scale?: number | undefined
  readonly precision?: number | undefined
  /** A LogicalType union: a struct with one field. */
  readonly logicalType?: V | undefined
  readonly fieldId?: number | undefined
}): V =>
  Struct({
    1: options.type === undefined ? undefined : I32(options.type),
    2: options.typeLength === undefined ? undefined : I32(options.typeLength),
    3: options.repetition === undefined ? undefined : I32(options.repetition),
    4: Str(name),
    5: options.children === undefined ? undefined : I32(options.children),
    6: options.convertedType === undefined ? undefined : I32(options.convertedType),
    7: options.scale === undefined ? undefined : I32(options.scale),
    8: options.precision === undefined ? undefined : I32(options.precision),
    9: options.fieldId === undefined ? undefined : I32(options.fieldId),
    10: options.logicalType
  })
export const root = (children: number) => element("schema", { children })

/** `crc` is the unsigned CRC-32, which the header holds as a signed i32. */
export const page = (
  type: number,
  header: { readonly [id: number]: V },
  body: Uint8Array,
  uncompressedSize = body.length,
  crc?: number
) =>
  bytes(
    thrift(Struct({
      1: I32(type),
      2: I32(uncompressedSize),
      3: I32(body.length),
      4: crc === undefined ? undefined : I32(crc | 0),
      ...header
    })),
    body
  )
export const dataPage = (numValues: number, body: Uint8Array, options?: {
  readonly encoding?: number | undefined
  readonly levels?: number | undefined
  readonly uncompressedSize?: number | undefined
  readonly crc?: number | undefined
}) =>
  page(
    0,
    {
      5: Struct({
        1: I32(numValues),
        2: I32(options?.encoding ?? PLAIN),
        3: I32(options?.levels ?? RLE),
        4: I32(options?.levels ?? RLE)
      })
    },
    body,
    options?.uncompressedSize,
    options?.crc
  )
export const dictionaryPage = (
  numValues: number,
  body: Uint8Array,
  encoding = PLAIN,
  options?: { readonly uncompressedSize?: number | undefined; readonly crc?: number | undefined }
) => page(2, { 7: Struct({ 1: I32(numValues), 2: I32(encoding) }) }, body, options?.uncompressedSize, options?.crc)
export const dataPageV2 = (options: {
  readonly numValues: number
  readonly numNulls: number
  readonly numRows: number
  readonly encoding?: number | undefined
  readonly repetition?: Uint8Array
  readonly definition?: Uint8Array
  readonly values: Uint8Array
  readonly compressed?: boolean | undefined
  readonly uncompressedSize?: number | undefined
  /** Defaults to the length of `definition`. */
  readonly definitionLength?: number | undefined
  /** Defaults to the length of `repetition`. */
  readonly repetitionLength?: number | undefined
  /** Computes the CRC from the page's bytes: levels, then values. */
  readonly crc?: ((body: Uint8Array) => number) | undefined
}) => {
  const repetition = options.repetition ?? new Uint8Array(0)
  const definition = options.definition ?? new Uint8Array(0)
  const body = bytes(repetition, definition, options.values)
  return page(
    3,
    {
      8: Struct({
        1: I32(options.numValues),
        2: I32(options.numNulls),
        3: I32(options.numRows),
        4: I32(options.encoding ?? PLAIN),
        5: I32(options.definitionLength ?? definition.length),
        6: I32(options.repetitionLength ?? repetition.length),
        7: options.compressed === undefined ? undefined : Bool(options.compressed)
      })
    },
    body,
    options.uncompressedSize,
    options.crc?.(body)
  )
}

export interface Chunk {
  readonly type: number
  readonly path: ReadonlyArray<string>
  readonly pages: ReadonlyArray<Uint8Array>
  readonly numValues: number
  readonly codec?: number | undefined
  /** Whether the first page is a dictionary page. */
  readonly dictionary?: boolean | undefined
  readonly statistics?: V | undefined
  readonly chunk?: { readonly [id: number]: V } | undefined
}

/** Writes a Parquet file with one row group. */
export const file = (options: {
  readonly schema: ReadonlyArray<V>
  readonly numRows: number
  readonly chunks: ReadonlyArray<Chunk>
  readonly metadata?: { readonly [id: number]: V } | undefined
}): Uint8Array => {
  const body: Array<Uint8Array> = []
  let offset = 4
  const columns = options.chunks.map((chunk) => {
    const data = bytes(...chunk.pages)
    const meta = Struct({
      1: I32(chunk.type),
      2: List("I32", [I32(PLAIN), I32(RLE)]),
      3: List("Binary", chunk.path.map(Str)),
      4: I32(chunk.codec ?? 0),
      5: I64(chunk.numValues),
      6: I64(data.length),
      7: I64(data.length),
      9: I64(chunk.dictionary === true ? offset + chunk.pages[0].length : offset),
      11: chunk.dictionary === true ? I64(offset) : undefined,
      12: chunk.statistics
    })
    body.push(data)
    const column = Struct({ 2: I64(offset), 3: meta, ...chunk.chunk })
    offset += data.length
    return column
  })
  const footer = thrift(Struct({
    1: I32(1),
    2: List("Struct", options.schema),
    3: I64(options.numRows),
    4: List("Struct", [Struct({ 1: List("Struct", columns), 2: I64(offset - 4), 3: I64(options.numRows) })]),
    ...options.metadata
  }))
  return bytes(text("PAR1"), ...body, footer, u32(footer.length), text("PAR1"))
}

export type Annotation = Omit<Parameters<typeof element>[1], "type" | "repetition" | "children">

/** A file with one top-level column. */
export const flat = (options: {
  readonly type: number
  readonly repetition: number
  readonly numRows: number
  /** Defaults to `numRows`. */
  readonly numValues?: number | undefined
  readonly pages: ReadonlyArray<Uint8Array>
  readonly typeLength?: number | undefined
  readonly codec?: number | undefined
  readonly dictionary?: boolean | undefined
  readonly statistics?: V | undefined
  readonly chunk?: { readonly [id: number]: V } | undefined
  readonly metadata?: { readonly [id: number]: V } | undefined
  readonly annotation?: Annotation | undefined
}) =>
  file({
    schema: [
      root(1),
      element("x", {
        type: options.type,
        repetition: options.repetition,
        typeLength: options.typeLength,
        ...options.annotation
      })
    ],
    numRows: options.numRows,
    chunks: [{ ...options, path: ["x"], numValues: options.numValues ?? options.numRows }],
    metadata: options.metadata
  })

/** A file with one required top-level column of `n` values in one data page. */
export const requiredColumn = (type: number, n: number, data: Uint8Array, options?: {
  readonly encoding?: number | undefined
  readonly typeLength?: number | undefined
  readonly codec?: number | undefined
  readonly uncompressedSize?: number | undefined
  readonly annotation?: Annotation | undefined
  readonly crc?: number | undefined
}) =>
  flat({
    type,
    repetition: REQUIRED,
    numRows: n,
    typeLength: options?.typeLength,
    codec: options?.codec,
    annotation: options?.annotation,
    pages: [dataPage(n, data, options)]
  })

/** DELTA_BINARY_PACKED for at most 128 small values: one block of four miniblocks. */
export const delta = (values: ReadonlyArray<number>): Uint8Array => {
  const zigzag = (n: number) => n < 0 ? -2 * n - 1 : 2 * n
  const header = [...uleb(128), 4, ...uleb(values.length), ...uleb(zigzag(values[0] ?? 0))]
  if (values.length <= 1) return new Uint8Array(header)
  const deltas = values.slice(1).map((v, i) => v - values[i])
  const min = Math.min(...deltas)
  const relative = deltas.map((d) => d - min)
  const width = 32 - Math.clz32(Math.max(...relative))
  const miniblocks = Math.ceil(relative.length / 32)
  const packed = new Uint8Array(miniblocks * 32 * width / 8)
  relative.forEach((value, i) => {
    for (let b = 0; b < width; b++) if ((value >> b) & 1) packed[(i * width + b) >> 3] |= 1 << ((i * width + b) & 7)
  })
  return bytes(header, uleb(zigzag(min)), [0, 1, 2, 3].map((m) => m < miniblocks ? width : 0), packed)
}
