import { assert, describe, it } from "@effect/vitest"
import { Bytes, Cause, Effect, Exit } from "effect"
import * as Hex from "effect/encoding/Hex"
import * as Parquet from "effect/encoding/Parquet"
import * as Thrift from "effect/encoding/Thrift"
import { readFileSync } from "node:fs"
import { crc32, gunzipSync, gzipSync } from "node:zlib"

// Two kinds of evidence:
// - "pyarrow fixtures": files written by pyarrow, read back and compared with
//   gold.json. Interoperability evidence; see fixtures/parquet/README.md.
// - "conformance": one test per assertion of apache-parquet-format 2.14.0,
//   named after its id. fixtures/parquet/CONFORMANCE.md maps every assertion to
//   its test, or says why it has none.
type Gold = null | boolean | number | string | ReadonlyArray<Gold>
interface GoldFile {
  readonly name: string
  readonly numRows: number
  readonly rowGroups: ReadonlyArray<{
    readonly numRows: number
    readonly columns: ReadonlyArray<{
      readonly codec: Parquet.CompressionCodec
      readonly encodings: ReadonlyArray<Parquet.Encoding>
    }>
  }>
  readonly columns: ReadonlyArray<{
    readonly path: ReadonlyArray<string>
    readonly physicalType: string
    readonly typeLength: number | null
    readonly maxDefinitionLevel: number
    readonly maxRepetitionLevel: number
    readonly convertedType: string | null
    readonly logicalType: Parquet.LogicalType | null
    readonly values: ReadonlyArray<Gold>
  }>
}

const gold: { readonly writer: string; readonly files: ReadonlyArray<GoldFile> } = JSON.parse(
  readFileSync(new URL("../fixtures/parquet/gold.json", import.meta.url), "utf8")
)
const fixture = (name: string) =>
  Parquet.fromBytes(new Uint8Array(readFileSync(new URL("../fixtures/parquet/" + name, import.meta.url))))

const gzip: Parquet.Decompress = (data) => Effect.sync(() => new Uint8Array(gunzipSync(data)))

/** Turns a column's layers and values back into one nested value per row, like gold.json. */
const rows = (column: Parquet.Column): Array<Gold> => {
  const { layers, values } = column
  const bit = (bits: Uint8Array, i: number) => (bits[i >> 3] >> (i & 7) & 1) === 1
  const leaf = (j: number): Gold => {
    switch (values.type) {
      case "BOOLEAN":
        return bit(values.values, j)
      case "INT64":
        return String(values.values[j])
      case "INT32":
      case "FLOAT":
      case "DOUBLE":
        return values.values[j]
      case "BYTE_ARRAY":
        return Hex.encode(values.values.subarray(values.offsets[j], values.offsets[j + 1]))
      case "INT96":
        return Hex.encode(values.values.subarray(j * 12, j * 12 + 12))
      case "FIXED_LEN_BYTE_ARRAY":
        return Hex.encode(values.values.subarray(j * values.width, (j + 1) * values.width))
    }
  }
  // The value below node i, at slot j of node i's slots (i = -1 for the rows)
  const below = (i: number, j: number): Gold => {
    if (i === layers.length - 1) return leaf(j)
    const next = layers[i + 1]
    if (next.offsets === undefined) return at(i + 1, j)
    const out: Array<Gold> = []
    for (let k = next.offsets[j]; k < next.offsets[j + 1]; k++) out.push(below(i + 1, k))
    return out
  }
  const at = (i: number, j: number): Gold => {
    const validity = layers[i].validity
    return validity !== undefined && !bit(validity, j) ? null : below(i, j)
  }
  return Array.from({ length: column.numRows }, (_, row) => below(-1, row))
}

// ---------------------------------------------------------------------------
// Synthetic files, written with the Thrift writer
// ---------------------------------------------------------------------------

const text = (s: string) => new TextEncoder().encode(s)

type V = Thrift.Value
const I8 = (value: number): V => ({ _tag: "I8", value })
const I32 = (value: number): V => ({ _tag: "I32", value })
const I64 = (value: number): V => ({ _tag: "I64", value: BigInt(value) })
const Bool = (value: boolean): V => ({ _tag: "Bool", value })
const Str = (value: string): V => ({ _tag: "Binary", value: text(value) })
const List = (elementType: Thrift.TypeName, elements: ReadonlyArray<V>): V => ({ _tag: "List", elementType, elements })
const Struct = (fields: { readonly [id: number]: V | undefined }): V => ({
  _tag: "Struct",
  fields: Object.entries(fields).flatMap(([id, value]) => value === undefined ? [] : [{ id: Number(id), value }])
})
const thrift = (value: V): Uint8Array => {
  const writer = Thrift.makeWriter()
  writer.writeValue(value)
  return writer.finish()
}
const bytes = (...parts: ReadonlyArray<Uint8Array | ReadonlyArray<number>>): Uint8Array =>
  Bytes.concat(parts.map((part) => Uint8Array.from(part)))
const u32 = (n: number) => [n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, n >>> 24]
const uleb = (n: number): Array<number> => n < 0x80 ? [n] : [(n & 0x7f) | 0x80, ...uleb(Math.floor(n / 0x80))]
const int32s = (...values: ReadonlyArray<number>) => new Uint8Array(Int32Array.from(values).buffer)
const plainBinary = (...values: ReadonlyArray<string>) =>
  bytes(...values.flatMap((v) => [u32(text(v).length), text(v)]))
/** RLE/bit-packed hybrid runs of repeated values: [value, count] pairs. */
const runs = (width: number, ...pairs: ReadonlyArray<readonly [number, number]>) =>
  bytes(...pairs.map(([value, count]) => [...uleb(count * 2), ...u32(value).slice(0, (width + 7) >> 3)]))
const lengthPrefixed = (data: Uint8Array) => bytes(u32(data.length), data)

const Type = { BOOLEAN: 0, INT32: 1, INT64: 2, INT96: 3, FLOAT: 4, DOUBLE: 5, BYTE_ARRAY: 6, FIXED_LEN_BYTE_ARRAY: 7 }
const REQUIRED = 0
const OPTIONAL = 1
const REPEATED = 2
const PLAIN = 0
const PLAIN_DICTIONARY = 2
const RLE = 3
const BIT_PACKED = 4
const DELTA_BINARY_PACKED = 5
const DELTA_LENGTH_BYTE_ARRAY = 6
const DELTA_BYTE_ARRAY = 7
const RLE_DICTIONARY = 8
const BYTE_STREAM_SPLIT = 9
const ALP = 10
const GZIP = 2

const element = (name: string, options: {
  readonly type?: number | undefined
  readonly typeLength?: number | undefined
  readonly repetition?: number | undefined
  readonly children?: number | undefined
  readonly convertedType?: number | undefined
  readonly scale?: number | undefined
  readonly precision?: number | undefined
  /** A LogicalType union: a struct with one field. */
  readonly logicalType?: V | undefined
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
    10: options.logicalType
  })
const root = (children: number) => element("schema", { children })

/** `crc` is the unsigned CRC-32, which the header holds as a signed i32. */
const page = (
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
const dataPage = (numValues: number, body: Uint8Array, options?: {
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
const dictionaryPage = (
  numValues: number,
  body: Uint8Array,
  encoding = PLAIN,
  options?: { readonly uncompressedSize?: number | undefined; readonly crc?: number | undefined }
) => page(2, { 7: Struct({ 1: I32(numValues), 2: I32(encoding) }) }, body, options?.uncompressedSize, options?.crc)
const dataPageV2 = (options: {
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

interface Chunk {
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
const file = (options: {
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

type Annotation = Omit<Parameters<typeof element>[1], "type" | "repetition" | "children">

/** A file with one top-level column. */
const flat = (options: {
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
const requiredColumn = (type: number, n: number, data: Uint8Array, options?: {
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

const int32s3 = requiredColumn(Type.INT32, 3, int32s(1, 2, 3))

/** DELTA_BINARY_PACKED for at most 128 small values: one block of four miniblocks. */
const delta = (values: ReadonlyArray<number>): Uint8Array => {
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

const metadataOf = (bytes: Uint8Array) => Parquet.readMetadata(Parquet.fromBytes(bytes))
type ReadOptions = Omit<Parameters<typeof Parquet.readColumn>[2], "rowGroup" | "column">
const read = Effect.fnUntraced(function*(bytes: Uint8Array, options?: ReadOptions) {
  const source = Parquet.fromBytes(bytes)
  const metadata = yield* Parquet.readMetadata(source)
  return yield* Parquet.readColumn(source, metadata, { rowGroup: 0, column: 0, ...options })
})
const values = (bytes: Uint8Array, options?: ReadOptions) => Effect.map(read(bytes, options), rows)
const failsWith = Effect.fnUntraced(function*<A>(
  effect: Effect.Effect<A, Parquet.ParquetError>,
  kind: Parquet.ParquetError["kind"],
  message?: RegExp
) {
  const error = yield* Effect.flip(effect)
  assert.isTrue(Parquet.isParquetError(error))
  assert.strictEqual(error.kind, kind, error.message)
  if (message !== undefined) assert.match(error.message, message)
})

describe("Parquet", () => {
  describe("pyarrow " + gold.writer + " fixtures", () => {
    for (const file of gold.files) {
      it.effect(file.name, () =>
        Effect.gen(function*() {
          const source = fixture(file.name)
          const metadata = yield* Parquet.readMetadata(source)
          assert.strictEqual(metadata.numRows, file.numRows)
          assert.strictEqual(metadata.createdBy, "parquet-cpp-arrow version " + gold.writer)
          assert.deepStrictEqual(
            metadata.rowGroups.map((group) => ({
              numRows: group.numRows,
              columns: group.columns.map((chunk) => ({
                codec: chunk.metaData!.codec,
                encodings: [...chunk.metaData!.encodings].sort()
              }))
            })),
            file.rowGroups.map((group) => ({
              numRows: group.numRows,
              columns: group.columns.map((c) => ({ codec: c.codec, encodings: [...c.encodings].sort() }))
            }))
          )
          assert.strictEqual(metadata.columns.length, file.columns.length)
          for (let c = 0; c < file.columns.length; c++) {
            const expected = file.columns[c]
            const descriptor = metadata.columns[c]
            const leaf = descriptor.nodes[descriptor.nodes.length - 1]
            assert.deepStrictEqual({
              path: descriptor.path,
              physicalType: descriptor.physicalType,
              typeLength: descriptor.typeLength ?? null,
              maxDefinitionLevel: descriptor.maxDefinitionLevel,
              maxRepetitionLevel: descriptor.maxRepetitionLevel,
              convertedType: leaf.convertedType ?? null,
              logicalType: leaf.logicalType ?? null
            }, {
              path: expected.path,
              physicalType: expected.physicalType,
              typeLength: expected.typeLength,
              maxDefinitionLevel: expected.maxDefinitionLevel,
              maxRepetitionLevel: expected.maxRepetitionLevel,
              convertedType: expected.convertedType,
              logicalType: expected.logicalType
            })
            const values: Array<Gold> = []
            for (let g = 0; g < metadata.rowGroups.length; g++) {
              const column = yield* Parquet.readColumn(source, metadata, {
                rowGroup: g,
                column: c,
                codecs: { GZIP: gzip }
              })
              values.push(...rows(column))
            }
            assert.deepStrictEqual(values, expected.values, expected.path.join("."))
          }
        }))
    }
  })
  describe("conformance (apache-parquet-format-2.14.0)", () => {
    const optionalInt32 = (pages: ReadonlyArray<Uint8Array>, numRows: number, codec?: number) =>
      flat({ type: Type.INT32, repetition: OPTIONAL, numRows, pages, codec })
    const repeatedInt32 = (pages: ReadonlyArray<Uint8Array>, numRows: number, numValues: number) =>
      flat({ type: Type.INT32, repetition: REPEATED, numRows, numValues, pages })
    // def levels 1, 0, 1 as RLE runs, for a column with one optional node
    const someNull = runs(1, [1, 1], [0, 1], [1, 1])
    /**
     * A file with one required column `x` that has statistics in TYPE_ORDER, and no rows. The annotation is on `x`,
     * or without a `type` on a group around it.
     */
    const annotated = (type: number | undefined, annotation: Annotation) => {
      const leaf = type ?? Type.BYTE_ARRAY
      return file({
        schema: type === undefined
          ? [
            root(1),
            element("g", { repetition: REQUIRED, children: 1, ...annotation }),
            element("x", { type: leaf, repetition: REQUIRED })
          ]
          : [root(1), element("x", { type, repetition: REQUIRED, ...annotation })],
        numRows: 0,
        chunks: [{ type: leaf, path: type === undefined ? ["g", "x"] : ["x"], numValues: 0, pages: [] }],
        metadata: { 7: List("Struct", [Struct({ 1: Struct({}) })]) }
      })
    }
    /** What the reader says about the annotated node and the order of column `x`. */
    const annotationOf = (bytes: Uint8Array) =>
      Effect.map(metadataOf(bytes), ({ columns: [column] }) => ({
        logicalType: column.nodes[0].logicalType,
        convertedType: column.nodes[0].convertedType,
        columnOrder: column.columnOrder
      }))
    const empty = Struct({})
    const TIME = 7
    const TIMESTAMP = 8
    /** A TimeType or TimestampType with a TimeUnit union, or without its unit. */
    const temporal = (member: number, unit: V | undefined) => Struct({ [member]: Struct({ 1: Bool(true), 2: unit }) })

    describe("README.md#file-format", () => {
      it.effect("PQ-FILE-1 MUST start and end with the magic number PAR1", () =>
        Effect.gen(function*() {
          assert.deepStrictEqual(yield* values(int32s3), [1, 2, 3])
          const badTrailer = int32s3.slice()
          badTrailer[badTrailer.length - 1] = 0x30
          yield* failsWith(metadataOf(badTrailer), "Malformed", /end with the magic number/)
          const badHeader = int32s3.slice()
          badHeader[3] = 0x30
          yield* failsWith(metadataOf(badHeader), "Malformed", /start with the magic number/)
        }))

      it.effect("PQ-FILE-2 MUST find the metadata from the 4-byte little-endian length before the final magic", () =>
        Effect.gen(function*() {
          const n = int32s3.length
          const metadata = yield* metadataOf(int32s3)
          assert.strictEqual(metadata.rowGroups[0].columns[0].metaData?.dataPageOffset, 4)
          const tooLong = int32s3.slice()
          tooLong.set(u32(n - 11), n - 8)
          yield* failsWith(metadataOf(tooLong), "Malformed", /footer length/)
          const garbage = bytes(text("PAR1"), [0x19, 0xfc], u32(2), text("PAR1"))
          yield* failsWith(metadataOf(garbage), "Malformed", /invalid Thrift metadata/)
        }))
    })

    describe("parquet.thrift FileMetaData", () => {
      it.effect("PQ-META-1 SHOULD accept versions 1 and 2 interchangeably (L1411-1413)", () =>
        Effect.gen(function*() {
          const v2 = flat({
            type: Type.INT32,
            repetition: REQUIRED,
            numRows: 3,
            pages: [dataPage(3, int32s(1, 2, 3))],
            metadata: { 1: I32(2) }
          })
          assert.strictEqual((yield* metadataOf(v2)).version, 2)
          assert.deepStrictEqual(yield* values(v2), yield* values(int32s3))
        }))

      it.effect("PQ-META-2 MUST give a column order per leaf column, in schema order (L1440-1455)", () =>
        Effect.gen(function*() {
          const make = (orders: ReadonlyArray<V>) =>
            file({
              schema: [
                root(2),
                element("a", { type: Type.INT32, repetition: REQUIRED }),
                element("b", { type: Type.DOUBLE, repetition: REQUIRED })
              ],
              numRows: 0,
              chunks: [
                { type: Type.INT32, path: ["a"], numValues: 0, pages: [] },
                { type: Type.DOUBLE, path: ["b"], numValues: 0, pages: [] }
              ],
              metadata: { 7: List("Struct", orders) }
            })
          const metadata = yield* metadataOf(make([Struct({ 1: Struct({}) }), Struct({ 2: Struct({}) })]))
          assert.deepStrictEqual(metadata.columns.map((c) => c.columnOrder), ["TYPE_ORDER", "IEEE_754_TOTAL_ORDER"])
          yield* failsWith(metadataOf(make([Struct({ 1: Struct({}) })])), "Malformed", /column orders/)
        }))

      it.effect("PQ-META-3 MUST reject a negative num_rows in the file or a row group (L1058-1059, L1426-1427)", () =>
        Effect.gen(function*() {
          const make = (file_: number, rowGroup: number) =>
            metadataOf(file({
              schema: [root(1), element("x", { type: Type.INT32, repetition: REQUIRED })],
              numRows: rowGroup,
              chunks: [{ type: Type.INT32, path: ["x"], numValues: 0, pages: [] }],
              metadata: { 3: I64(file_) }
            }))
          const metadata = yield* make(0, 0)
          assert.deepStrictEqual([metadata.numRows, metadata.rowGroups[0].numRows], [0, 0])
          yield* failsWith(make(0, -1), "Malformed", /RowGroup\.num_rows is -1/)
          yield* failsWith(make(-1, 0), "Malformed", /FileMetaData\.num_rows is -1/)
        }))
    })

    describe("parquet.thrift SchemaElement", () => {
      it.effect("PQ-SCHEMA-1 MUST give every node but the root a repetition (L535-537)", () =>
        failsWith(
          metadataOf(file({
            schema: [root(1), element("x", { type: Type.INT32 })],
            numRows: 0,
            chunks: [{ type: Type.INT32, path: ["x"], numValues: 0, pages: [] }]
          })),
          "Malformed",
          /repetition/
        ))

      it.effect("PQ-SCHEMA-2 MUST rebuild the schema tree from its depth-first elements and num_children (L518-523, L542-547)", () =>
        Effect.gen(function*() {
          const schema = [
            root(2),
            element("a", { repetition: OPTIONAL, children: 2 }),
            element("b", { type: Type.INT32, repetition: REPEATED }),
            element("c", { type: Type.BYTE_ARRAY, repetition: OPTIONAL }),
            element("d", { type: Type.FIXED_LEN_BYTE_ARRAY, typeLength: 16, repetition: REQUIRED })
          ]
          const chunks = [
            { type: Type.INT32, path: ["a", "b"], numValues: 0, pages: [] },
            { type: Type.BYTE_ARRAY, path: ["a", "c"], numValues: 0, pages: [] },
            { type: Type.FIXED_LEN_BYTE_ARRAY, path: ["d"], numValues: 0, pages: [] }
          ]
          const metadata = yield* metadataOf(file({ schema, numRows: 0, chunks }))
          assert.deepStrictEqual(metadata.schema.children?.map((n) => n.name), ["a", "d"])
          assert.deepStrictEqual(metadata.schema.children?.[0].children?.map((n) => n.name), ["b", "c"])
          assert.deepStrictEqual(metadata.columns.map((c) => [c.path, c.physicalType, c.typeLength]), [
            [["a", "b"], "INT32", undefined],
            [["a", "c"], "BYTE_ARRAY", undefined],
            [["d"], "FIXED_LEN_BYTE_ARRAY", 16]
          ])
          yield* failsWith(
            metadataOf(file({ schema: schema.slice(0, 4), numRows: 0, chunks })),
            "Malformed",
            /ends inside a group/
          )
        }))
    })

    describe("LogicalTypes.md", () => {
      it.effect("PQ-LT-1 MUST handle an unknown TIMESTAMP unit as an unsupported feature (#timestamp)", () =>
        Effect.gen(function*() {
          const TIMESTAMP_MICROS = 10
          const timestamp = (unit: number) =>
            annotated(Type.INT64, {
              logicalType: temporal(TIMESTAMP, Struct({ [unit]: empty })),
              convertedType: TIMESTAMP_MICROS
            })
          assert.deepStrictEqual((yield* annotationOf(timestamp(3))).logicalType, {
            type: "TIMESTAMP",
            isAdjustedToUTC: true,
            unit: "NANOS"
          })
          // a fourth unit, which must not read as the legacy TIMESTAMP_MICROS
          yield* failsWith(metadataOf(timestamp(4)), "Unsupported", /TIMESTAMP unit 4/)
        }))

      it.effect("PQ-LT-2 MUST reject a TIME or TIMESTAMP without its unit (parquet.thrift L370-373, L380-383)", () =>
        Effect.gen(function*() {
          const make = (member: number, unit: V | undefined) =>
            metadataOf(annotated(Type.INT64, { logicalType: temporal(member, unit) }))
          yield* failsWith(make(TIMESTAMP, undefined), "Malformed", /TimestampType\.unit is missing/)
          yield* failsWith(make(TIME, undefined), "Malformed", /TimeType\.unit is missing/)
          // a TimeUnit union with no member
          yield* failsWith(make(TIMESTAMP, empty), "Malformed", /TimestampType\.unit is missing/)
        }))

      it.effect("PQ-LT-3 SHOULD ignore an unrecognized logical type and the column's order (#unsupported-logical-types)", () =>
        Effect.gen(function*() {
          assert.deepStrictEqual(yield* annotationOf(annotated(Type.INT64, {})), {
            logicalType: undefined,
            convertedType: undefined,
            columnOrder: "TYPE_ORDER"
          })
          // member 99 of the LogicalType union, which 2.14.0 doesn't have
          assert.deepStrictEqual(yield* annotationOf(annotated(Type.INT64, { logicalType: Struct({ 99: empty }) })), {
            logicalType: undefined,
            convertedType: undefined,
            columnOrder: undefined
          })
          // the converted type doesn't stand in for a logical type that is there but ignored (#convertedtype)
          for (const type of [Type.BYTE_ARRAY, undefined]) {
            const annotation = { logicalType: Struct({ 99: empty }), convertedType: type === undefined ? 3 : 0 }
            assert.deepStrictEqual(yield* annotationOf(annotated(type, annotation)), {
              logicalType: undefined,
              convertedType: undefined,
              columnOrder: type === undefined ? "TYPE_ORDER" : undefined
            })
          }
        }))

      const GROUP = undefined
      const FIXED = Type.FIXED_LEN_BYTE_ARRAY
      const logical = (member: number, fields: { readonly [id: number]: V } = {}): Annotation => ({
        logicalType: Struct({ [member]: Struct(fields) })
      })
      const integer = (bitWidth: number, isSigned: boolean) => logical(10, { 1: I8(bitWidth), 2: Bool(isSigned) })
      const time = (unit: number) => ({ logicalType: temporal(TIME, Struct({ [unit]: empty })) })
      const utc = { isAdjustedToUTC: true }

      it.effect("PQ-LT-4 SHOULD ignore an annotation on a physical type it is not defined for, and the column's order (#unsupported-logical-types)", () =>
        Effect.gen(function*() {
          type Node = readonly [type: number | undefined, typeLength?: number]
          // the annotation as written and as read, a node the spec defines it for, and one it doesn't
          const cases: ReadonlyArray<
            readonly [Annotation, Parquet.LogicalType | Parquet.ConvertedType, defined: Node, other: Node]
          > = [
            [logical(1), { type: "STRING" }, [Type.BYTE_ARRAY], [Type.INT32]],
            [logical(2), { type: "MAP" }, [GROUP], [Type.BYTE_ARRAY]],
            [logical(3), { type: "LIST" }, [GROUP], [Type.INT32]],
            [logical(4), { type: "ENUM" }, [Type.BYTE_ARRAY], [FIXED, 4]],
            [logical(5, { 1: I32(2), 2: I32(9) }), { type: "DECIMAL", scale: 2, precision: 9 }, [Type.INT32], [
              Type.DOUBLE
            ]],
            [logical(6), { type: "DATE" }, [Type.INT32], [Type.INT64]],
            [time(1), { type: "TIME", ...utc, unit: "MILLIS" }, [Type.INT32], [Type.INT64]],
            [time(2), { type: "TIME", ...utc, unit: "MICROS" }, [Type.INT64], [Type.INT32]],
            [time(3), { type: "TIME", ...utc, unit: "NANOS" }, [Type.INT64], [Type.INT32]],
            [
              { logicalType: temporal(TIMESTAMP, Struct({ 1: empty })) },
              { type: "TIMESTAMP", ...utc, unit: "MILLIS" },
              [
                Type.INT64
              ],
              [Type.INT96]
            ],
            [integer(8, true), { type: "INTEGER", bitWidth: 8, isSigned: true }, [Type.INT32], [Type.INT64]],
            [integer(16, false), { type: "INTEGER", bitWidth: 16, isSigned: false }, [Type.INT32], [Type.INT64]],
            [integer(32, true), { type: "INTEGER", bitWidth: 32, isSigned: true }, [Type.INT32], [Type.INT64]],
            [integer(64, false), { type: "INTEGER", bitWidth: 64, isSigned: false }, [Type.INT64], [Type.INT32]],
            [logical(12), { type: "JSON" }, [Type.BYTE_ARRAY], [Type.INT64]],
            [logical(13), { type: "BSON" }, [Type.BYTE_ARRAY], [Type.INT32]],
            [logical(14), { type: "UUID" }, [FIXED, 16], [FIXED, 4]],
            [logical(15), { type: "FLOAT16" }, [FIXED, 2], [Type.FLOAT]],
            [logical(16), { type: "VARIANT", specificationVersion: undefined }, [GROUP], [Type.BYTE_ARRAY]],
            [logical(17), { type: "GEOMETRY", crs: undefined }, [Type.BYTE_ARRAY], [GROUP]],
            [logical(18), { type: "GEOGRAPHY", crs: undefined, algorithm: undefined }, [Type.BYTE_ARRAY], [FIXED, 21]],
            [logical(19), { type: "FILE" }, [GROUP], [Type.BYTE_ARRAY]],
            // converted types, by their code in parquet.thrift
            [{ convertedType: 0 }, "UTF8", [Type.BYTE_ARRAY], [Type.INT32]],
            [{ convertedType: 1 }, "MAP", [GROUP], [Type.BYTE_ARRAY]],
            [{ convertedType: 2 }, "MAP_KEY_VALUE", [GROUP], [Type.BYTE_ARRAY]],
            [{ convertedType: 3 }, "LIST", [GROUP], [Type.INT32]],
            [{ convertedType: 4 }, "ENUM", [Type.BYTE_ARRAY], [Type.INT32]],
            [{ convertedType: 5, scale: 2, precision: 9 }, "DECIMAL", [Type.INT32], [Type.FLOAT]],
            [{ convertedType: 6 }, "DATE", [Type.INT32], [Type.INT64]],
            [{ convertedType: 7 }, "TIME_MILLIS", [Type.INT32], [Type.INT64]],
            [{ convertedType: 8 }, "TIME_MICROS", [Type.INT64], [Type.INT32]],
            [{ convertedType: 9 }, "TIMESTAMP_MILLIS", [Type.INT64], [Type.INT32]],
            [{ convertedType: 10 }, "TIMESTAMP_MICROS", [Type.INT64], [Type.INT96]],
            [{ convertedType: 11 }, "UINT_8", [Type.INT32], [Type.INT64]],
            [{ convertedType: 12 }, "UINT_16", [Type.INT32], [Type.INT64]],
            [{ convertedType: 13 }, "UINT_32", [Type.INT32], [Type.INT64]],
            [{ convertedType: 14 }, "UINT_64", [Type.INT64], [Type.INT32]],
            [{ convertedType: 15 }, "INT_8", [Type.INT32], [Type.INT64]],
            [{ convertedType: 16 }, "INT_16", [Type.INT32], [Type.INT64]],
            [{ convertedType: 17 }, "INT_32", [Type.INT32], [Type.INT64]],
            [{ convertedType: 18 }, "INT_64", [Type.INT64], [Type.INT32]],
            [{ convertedType: 19 }, "JSON", [Type.BYTE_ARRAY], [Type.INT32]],
            [{ convertedType: 20 }, "BSON", [Type.BYTE_ARRAY], [GROUP]],
            [{ convertedType: 21 }, "INTERVAL", [FIXED, 12], [FIXED, 4]]
          ]
          for (const [annotation, expected, [type, typeLength], [otherType, otherLength]] of cases) {
            const label = JSON.stringify(expected)
            const kept = yield* annotationOf(annotated(type, { ...annotation, typeLength }))
            assert.deepStrictEqual(
              kept,
              typeof expected === "string"
                ? { logicalType: undefined, convertedType: expected, columnOrder: "TYPE_ORDER" }
                : { logicalType: expected, convertedType: undefined, columnOrder: "TYPE_ORDER" },
              label
            )
            const ignored = yield* annotationOf(annotated(otherType, { ...annotation, typeLength: otherLength }))
            assert.deepStrictEqual(ignored, {
              logicalType: undefined,
              convertedType: undefined,
              // the order belongs to the leaf, so it stays when the annotation was on the group around it
              columnOrder: otherType === GROUP ? "TYPE_ORDER" : undefined
            }, label)
          }
          // UNKNOWN is for "a column that is always null", whatever its type
          for (const type of [Type.BOOLEAN, Type.INT32, Type.BYTE_ARRAY]) {
            assert.deepStrictEqual(yield* annotationOf(annotated(type, logical(11))), {
              logicalType: { type: "UNKNOWN" },
              convertedType: undefined,
              columnOrder: "TYPE_ORDER"
            })
          }
        }))

      it.effect("PQ-LT-5 reads a node's logical type and converted type independently of each other, unless the logical type is ignored", () =>
        Effect.gen(function*() {
          // both defined for INT32, though DATE corresponds to the converted type DATE
          assert.deepStrictEqual(yield* annotationOf(annotated(Type.INT32, { ...logical(6), convertedType: 7 })), {
            logicalType: { type: "DATE" },
            convertedType: "TIME_MILLIS",
            columnOrder: "TYPE_ORDER"
          })
          // STRING is not defined for INT32, so it is ignored, and so is INT_32, which only stands in for a
          // logical type when there is none (#convertedtype, #unsupported-logical-types)
          assert.deepStrictEqual(yield* annotationOf(annotated(Type.INT32, { ...logical(1), convertedType: 17 })), {
            logicalType: undefined,
            convertedType: undefined,
            columnOrder: undefined
          })
          // the DecimalType supersedes the scale and precision of the schema element (parquet.thrift L557-564)
          assert.deepStrictEqual(
            yield* annotationOf(annotated(Type.INT32, { ...logical(5, { 1: I32(2), 2: I32(9) }), convertedType: 5 })),
            {
              logicalType: { type: "DECIMAL", scale: 2, precision: 9 },
              convertedType: "DECIMAL",
              columnOrder: "TYPE_ORDER"
            }
          )
          // a converted type 2.14.0 doesn't have
          assert.deepStrictEqual(yield* annotationOf(annotated(Type.INT32, { convertedType: 99 })), {
            logicalType: undefined,
            convertedType: 99,
            columnOrder: undefined
          })
        }))

      it.effect("PQ-LT-6 MUST reject a DECIMAL whose precision or scale breaks the rules (#decimal)", () =>
        Effect.gen(function*() {
          type Case = readonly [
            type: number,
            scale: number | undefined,
            precision: number | undefined,
            typeLength?: number
          ]
          const forms = (
            [type, scale, precision, typeLength]: Case
          ) => [
            // the converted type takes its parameters from the schema element, where the scale defaults to 0
            annotated(type, { convertedType: 5, scale, precision, typeLength }),
            ...(scale === undefined || precision === undefined
              ? []
              : [annotated(type, { ...logical(5, { 1: I32(scale), 2: I32(precision) }), typeLength })])
          ]
          const valid: ReadonlyArray<Case> = [
            [Type.INT32, 0, 1],
            [Type.INT32, 9, 9],
            [Type.INT32, undefined, 9],
            [Type.INT64, 2, 18],
            // floor(log10(2^(8n - 1) - 1)) digits: 2^7 - 1 = 127, 2^31 - 1 = 2147483647, 2^127 - 1 is about 1.7e38
            [FIXED, 0, 2, 1],
            [FIXED, 0, 9, 4],
            [FIXED, 10, 38, 16],
            [Type.BYTE_ARRAY, 0, 1000]
          ]
          for (const case_ of valid) {
            for (const bytes_ of forms(case_)) {
              assert.strictEqual((yield* annotationOf(bytes_)).columnOrder, "TYPE_ORDER", JSON.stringify(case_))
            }
          }
          const invalid: ReadonlyArray<readonly [Case, RegExp]> = [
            [[Type.INT32, 5, 2], /scale/],
            [[Type.INT32, -1, 2], /scale/],
            [[Type.INT32, 0, 0], /precision/],
            [[Type.BYTE_ARRAY, 0, -1], /precision/],
            [[Type.BYTE_ARRAY, 0, undefined], /precision/],
            [[Type.INT32, 0, 10], /precision/],
            [[Type.INT64, 0, 19], /precision/],
            [[FIXED, 0, 3, 1], /precision/],
            [[FIXED, 0, 10, 4], /precision/],
            [[FIXED, 0, 39, 16], /precision/]
          ]
          for (const [case_, message] of invalid) {
            for (const bytes_ of forms(case_)) yield* failsWith(metadataOf(bytes_), "Malformed", message)
          }
        }))

      it.effect("PQ-LT-7 MUST reject an INTEGER whose bit width is not 8, 16, 32 or 64 (#signed-integers)", () =>
        Effect.gen(function*() {
          for (const bitWidth of [0, 24, 65, -8]) {
            yield* failsWith(metadataOf(annotated(Type.INT32, integer(bitWidth, true))), "Malformed", /bit width/)
          }
        }))
      type Binaries = ReadonlyArray<ReadonlyArray<number>>
      const forms = ["PLAIN", "DELTA_LENGTH_BYTE_ARRAY", "DELTA_BYTE_ARRAY", "dictionary"] as const
      /** A required BYTE_ARRAY column of `values`, each of which is its own dictionary entry in the last form. */
      const binaries = (form: typeof forms[number], values: Binaries, annotation?: Annotation) => {
        const n = values.length
        const lengths = values.map((value) => value.length)
        const plain = bytes(...values.map((value) => lengthPrefixed(Uint8Array.from(value))))
        switch (form) {
          case "PLAIN":
            return requiredColumn(Type.BYTE_ARRAY, n, plain, { annotation })
          case "DELTA_LENGTH_BYTE_ARRAY":
            return requiredColumn(Type.BYTE_ARRAY, n, bytes(delta(lengths), ...values), {
              encoding: DELTA_LENGTH_BYTE_ARRAY,
              annotation
            })
          case "DELTA_BYTE_ARRAY":
            return requiredColumn(Type.BYTE_ARRAY, n, bytes(delta(lengths.map(() => 0)), delta(lengths), ...values), {
              encoding: DELTA_BYTE_ARRAY,
              annotation
            })
          case "dictionary":
            return flat({
              type: Type.BYTE_ARRAY,
              repetition: REQUIRED,
              numRows: n,
              dictionary: true,
              annotation,
              pages: [
                dictionaryPage(n, plain),
                dataPage(n, bytes([8], runs(8, ...values.map((_, i) => [i, 1] as const))), { encoding: RLE_DICTIONARY })
              ]
            })
        }
      }
      const hex = (values: Binaries) => values.map((value) => Hex.encode(Uint8Array.from(value)))
      const STRING = logical(1)
      const utf8 = [
        ["STRING", STRING],
        ["ENUM", logical(4)],
        ["JSON", logical(12)],
        ["UTF8", { convertedType: 0 }],
        ["ENUM (converted)", { convertedType: 4 }],
        ["JSON (converted)", { convertedType: 19 }]
      ] as const
      // "é" is C3 A9
      const split: Binaries = [[0x61, 0xc3], [0xa9]]

      it.effect("PQ-LT-8 MUST reject a STRING, ENUM or JSON value that is not UTF-8 (#string, #enum, #json)", () =>
        Effect.gen(function*() {
          const valid: Binaries = [[], [0x61], [0xc3, 0xa9], [], [0xe2, 0x82, 0xac], [0xf0, 0x9f, 0x98, 0x80]]
          for (const [label, annotation] of utf8) {
            for (const form of forms) {
              const where = `${label} ${form}`
              assert.deepStrictEqual(yield* values(binaries(form, valid, annotation)), hex(valid), where)
              yield* failsWith(values(binaries(form, [[0x61], [0xff]], annotation)), "Malformed", /value 1 .*UTF-8/)
              // every value is UTF-8 on its own: here the two are only when joined
              yield* failsWith(values(binaries(form, split, annotation)), "Malformed", /value 0 .*UTF-8/)
            }
          }
          // v2 data pages
          const v2 = (value: ReadonlyArray<number>) =>
            flat({
              type: Type.BYTE_ARRAY,
              repetition: REQUIRED,
              numRows: 1,
              annotation: STRING,
              pages: [dataPageV2({
                numValues: 1,
                numNulls: 0,
                numRows: 1,
                values: lengthPrefixed(Uint8Array.from(value))
              })]
            })
          assert.deepStrictEqual(yield* values(v2([0xc3, 0xa9])), ["c3a9"])
          yield* failsWith(values(v2([0xc3])), "Malformed", /value 0 .*UTF-8/)
        }))

      it.effect("PQ-LT-9 MUST reject every sequence of bytes that is not well-formed UTF-8 (#string)", () =>
        Effect.gen(function*() {
          const string = (value: ReadonlyArray<number>) => values(binaries("PLAIN", [value], STRING))
          // the first and last code points of every length, and those around the surrogates
          const valid: Binaries = [
            [0x00],
            [0x7f],
            [0xc2, 0x80],
            [0xdf, 0xbf],
            [0xe0, 0xa0, 0x80],
            [0xed, 0x9f, 0xbf],
            [0xee, 0x80, 0x80],
            [0xef, 0xbf, 0xbf],
            [0xf0, 0x90, 0x80, 0x80],
            [0xf4, 0x8f, 0xbf, 0xbf],
            // a byte order mark is a character like any other
            [0xef, 0xbb, 0xbf, 0x61]
          ]
          for (const value of valid) assert.deepStrictEqual(yield* string(value), hex([value]))
          const invalid: Binaries = [
            // a continuation byte first, and bytes that are never in UTF-8
            [0x80],
            [0xbf],
            [0xc0, 0x80],
            [0xc1, 0xbf],
            [0xf5, 0x80, 0x80, 0x80],
            [0xff],
            // sequences that end early
            [0xc2],
            [0xe2, 0x82],
            [0xf0, 0x9f, 0x98],
            [0xc2, 0x41],
            [0xe2, 0x82, 0x41],
            [0xf0, 0x9f, 0x98, 0x41],
            // overlong forms
            [0xe0, 0x9f, 0xbf],
            [0xf0, 0x8f, 0xbf, 0xbf],
            // surrogates, and code points after U+10FFFF
            [0xed, 0xa0, 0x80],
            [0xed, 0xbf, 0xbf],
            [0xf4, 0x90, 0x80, 0x80]
          ]
          const strict = new TextDecoder("utf-8", { fatal: true })
          for (const value of invalid) {
            yield* failsWith(string(value), "Malformed", /value 0 is not UTF-8/)
            assert.throws(() => strict.decode(Uint8Array.from(value)), TypeError, undefined, hex([value])[0])
          }
        }))

      it.effect("PQ-LT-10 checks DELTA_BYTE_ARRAY values after their prefixes are added (Encodings.md#delta-strings-delta_byte_array--7)", () =>
        Effect.gen(function*() {
          const make = (prefixes: ReadonlyArray<number>, suffixes: Binaries) =>
            values(requiredColumn(
              Type.BYTE_ARRAY,
              suffixes.length,
              bytes(delta(prefixes), delta(suffixes.map((suffix) => suffix.length)), ...suffixes),
              { encoding: DELTA_BYTE_ARRAY, annotation: STRING }
            ))
          // the suffix A9 is not UTF-8, the value C3 A9 is
          assert.deepStrictEqual(yield* make([0, 1], [[0xc3, 0xa9], [0xa9]]), ["c3a9", "c3a9"])
          // the suffix "(" is UTF-8, the value C3 28 is not
          yield* failsWith(make([0, 1], [[0xc3, 0xa9], [0x28]]), "Malformed", /value 1 .*UTF-8/)
        }))

      it.effect("PQ-LT-11 checks a dictionary once, with the values no page refers to", () =>
        Effect.gen(function*() {
          const make = (dictionary: Binaries) =>
            values(flat({
              type: Type.BYTE_ARRAY,
              repetition: REQUIRED,
              numRows: 2,
              dictionary: true,
              annotation: STRING,
              pages: [
                dictionaryPage(
                  dictionary.length,
                  bytes(...dictionary.map((value) => lengthPrefixed(Uint8Array.from(value))))
                ),
                dataPage(2, bytes([1], runs(1, [0, 2])), { encoding: RLE_DICTIONARY })
              ]
            }))
          assert.deepStrictEqual(yield* make([[0x61], [0x62]]), ["61", "61"])
          yield* failsWith(make([[0x61], [0xff]]), "Malformed", /dictionary value 1 .*UTF-8/)
        }))

      it.effect("PQ-LT-12 doesn't check the bytes of other BYTE_ARRAY and FIXED_LEN_BYTE_ARRAY columns", () =>
        Effect.gen(function*() {
          const binary: Binaries = [[0xff], ...split]
          const annotations: ReadonlyArray<Annotation | undefined> = [
            undefined,
            logical(13),
            { convertedType: 20 },
            logical(17),
            // a logical type supersedes UTF8, also when it is ignored for being unknown or not for BYTE_ARRAY
            // (#convertedtype, #unsupported-logical-types); without one, UTF8 is checked (PQ-LT-8)
            { ...logical(13), convertedType: 0 },
            { logicalType: Struct({ 99: empty }), convertedType: 0 },
            { ...logical(6), convertedType: 0 }
          ]
          for (const annotation of annotations) {
            for (const form of forms) {
              assert.deepStrictEqual(yield* values(binaries(form, binary, annotation)), hex(binary))
            }
          }
          const fixed = requiredColumn(FIXED, 2, new Uint8Array([0xff, 0xc3, 0xa9, 0xff]), { typeLength: 2 })
          assert.deepStrictEqual(yield* values(fixed), ["ffc3", "a9ff"])
        }))
    })

    describe("README.md#nested-encoding", () => {
      it.effect("PQ-NEST-1 MUST compute the maximum levels from the optional and repeated nodes of the path", () =>
        Effect.gen(function*() {
          const metadata = yield* metadataOf(file({
            schema: [
              root(1),
              element("a", { repetition: OPTIONAL, children: 1 }),
              element("list", { repetition: REPEATED, children: 1 }),
              element("b", { repetition: REQUIRED, children: 1 }),
              element("c", { type: Type.INT32, repetition: REPEATED })
            ],
            numRows: 0,
            chunks: [{ type: Type.INT32, path: ["a", "list", "b", "c"], numValues: 0, pages: [] }]
          }))
          assert.strictEqual(metadata.columns[0].maxDefinitionLevel, 3)
          assert.strictEqual(metadata.columns[0].maxRepetitionLevel, 2)
        }))

      it.effect("PQ-NEST-2 MUST assemble lists from repetition and definition levels", () =>
        Effect.gen(function*() {
          // rows [1, 2], [], [3]: levels (r, d) = (0, 1) (1, 1) (0, 0) (0, 1)
          const page = dataPage(
            4,
            bytes(
              lengthPrefixed(runs(1, [0, 1], [1, 1], [0, 2])),
              lengthPrefixed(runs(1, [1, 2], [0, 1], [1, 1])),
              int32s(1, 2, 3)
            )
          )
          const column = yield* read(repeatedInt32([page], 3, 4))
          assert.deepStrictEqual(rows(column), [[1, 2], [], [3]])
          assert.deepStrictEqual(Array.from(column.layers[0].offsets!), [0, 2, 2, 3])
        }))
    })

    describe("README.md#nulls", () => {
      it.effect("PQ-NULL-1 MUST read nulls from the definition levels only, with no values in the data", () =>
        Effect.gen(function*() {
          assert.deepStrictEqual(yield* values(optionalInt32([dataPage(3, lengthPrefixed(runs(1, [0, 3])))], 3)), [
            null,
            null,
            null
          ])
          const column = yield* read(optionalInt32([dataPage(3, bytes(lengthPrefixed(someNull), int32s(5, 7)))], 3))
          assert.deepStrictEqual(rows(column), [5, null, 7])
          assert.strictEqual(column.layers[0].nullCount, 1)
        }))
    })

    describe("README.md#data-pages", () => {
      it.effect("PQ-PAGE-1 MUST read a required top-level column's page as values only", () =>
        Effect.gen(function*() {
          assert.deepStrictEqual(yield* values(int32s3), [1, 2, 3])
        }))

      it.effect("PQ-PAGE-2 MUST read uncompressed_page_size as the size of levels and values together", () =>
        Effect.gen(function*() {
          const body = bytes(lengthPrefixed(someNull), int32s(5, 7))
          const make = (uncompressedSize: number) =>
            optionalInt32([dataPage(3, gzipSync(body), { uncompressedSize })], 3, GZIP)
          assert.deepStrictEqual(yield* values(make(body.length), { codecs: { GZIP: gzip } }), [5, null, 7])
          yield* failsWith(values(make(body.length + 1), { codecs: { GZIP: gzip } }), "Malformed", /decompressed to/)
        }))

      it.effect("PQ-PAGE-3 MUST reject a negative count or size in a page header (parquet.thrift PageHeader)", () =>
        Effect.gen(function*() {
          const present = runs(1, [1, 1])
          const column = (repetition: number, ...pages: ReadonlyArray<Uint8Array>) =>
            flat({ type: Type.INT32, repetition, numRows: 1, pages })
          const v2 = (options: Partial<Parameters<typeof dataPageV2>[0]>) =>
            dataPageV2({ numValues: 1, numNulls: 0, numRows: 1, values: int32s(7), ...options })
          const rejects = (bytes_: Uint8Array, message: RegExp) => failsWith(values(bytes_), "Malformed", message)
          // with and without levels
          yield* rejects(
            column(OPTIONAL, dataPage(-1, bytes(lengthPrefixed(present), int32s(7)))),
            /DataPageHeader\.num_values is negative/
          )
          yield* rejects(column(REQUIRED, dataPage(-1, int32s(7))), /DataPageHeader\.num_values is negative/)
          yield* rejects(
            column(OPTIONAL, v2({ numValues: -1, definition: present })),
            /DataPageHeaderV2\.num_values is negative/
          )
          yield* rejects(column(REQUIRED, v2({ numValues: -1 })), /DataPageHeaderV2\.num_values is negative/)
          yield* rejects(column(REQUIRED, v2({ numNulls: -1 })), /num_nulls is negative/)
          yield* rejects(column(REQUIRED, v2({ numRows: -1 })), /num_rows is negative/)
          yield* rejects(column(REQUIRED, v2({ definitionLength: -1 })), /definition_levels_byte_length is negative/)
          yield* rejects(column(REQUIRED, v2({ repetitionLength: -1 })), /repetition_levels_byte_length is negative/)
          yield* rejects(
            flat({
              type: Type.INT32,
              repetition: REQUIRED,
              numRows: 1,
              dictionary: true,
              pages: [
                dictionaryPage(-1, int32s(7)),
                dataPage(1, bytes([1], runs(1, [0, 1])), { encoding: RLE_DICTIONARY })
              ]
            }),
            /DictionaryPageHeader\.num_values is negative/
          )
          yield* rejects(column(REQUIRED, dataPage(1, int32s(7), { uncompressedSize: -1 })), /negative size/)
          const header = Struct({ 1: I32(1), 2: I32(PLAIN), 3: I32(RLE), 4: I32(RLE) })
          yield* rejects(
            column(REQUIRED, bytes(thrift(Struct({ 1: I32(0), 2: I32(4), 3: I32(-1), 5: header })), int32s(7))),
            /negative size/
          )
        }))
    })

    describe("README.md#column-chunks", () => {
      const dictionary = dictionaryPage(2, int32s(10, 20))
      const indices = dataPage(3, bytes([1], runs(1, [0, 1], [1, 2])), { encoding: RLE_DICTIONARY })
      const make = (pages: ReadonlyArray<Uint8Array>, numRows = 3) =>
        flat({ type: Type.INT32, repetition: REQUIRED, numRows, pages, dictionary: true })

      it.effect("PQ-CHUNK-1 MUST read the dictionary page first, and at most one (parquet.thrift L727-729)", () =>
        Effect.gen(function*() {
          assert.deepStrictEqual(yield* values(make([dictionary, indices])), [10, 20, 20])
          yield* failsWith(values(make([dictionary, dictionary, indices])), "Malformed", /dictionary page/)
          yield* failsWith(values(make([dictionary, indices, dictionary, indices], 6)), "Malformed", /dictionary page/)
        }))

      it.effect("PQ-CHUNK-2 MAY skip pages it does not read: index pages and later page types", () =>
        Effect.gen(function*() {
          const index = page(1, { 6: Struct({}) }, new Uint8Array([1, 2, 3]))
          const future = page(42, {}, new Uint8Array([4, 5]))
          assert.deepStrictEqual(
            yield* values(
              flat({
                type: Type.INT32,
                repetition: REQUIRED,
                numRows: 3,
                pages: [index, future, dataPage(3, int32s(1, 2, 3))]
              })
            ),
            [1, 2, 3]
          )
        }))

      it.effect("PQ-CHUNK-3 MUST reject a column chunk whose num_values is negative (parquet.thrift L922-923)", () =>
        Effect.gen(function*() {
          const levels = lengthPrefixed(runs(1, [0, 1]))
          // with repetition and definition levels, and without any
          yield* failsWith(
            values(repeatedInt32([dataPage(1, bytes(levels, levels))], 1, -1)),
            "Malformed",
            /has -1 values/
          )
          yield* failsWith(
            values(
              flat({
                type: Type.INT32,
                repetition: REQUIRED,
                numRows: 1,
                numValues: -1,
                pages: [dataPage(1, int32s(7))]
              })
            ),
            "Malformed",
            /has -1 values/
          )
        }))
    })

    describe("parquet.thrift DataPageHeaderV2", () => {
      it.effect("PQ-V2-1 MUST begin every v2 page at a row boundary (L759-761)", () =>
        Effect.gen(function*() {
          const part = (repetition: number, value: number, numRows: number) =>
            dataPageV2({
              numValues: 1,
              numNulls: 0,
              numRows,
              repetition: runs(1, [repetition, 1]),
              definition: runs(1, [1, 1]),
              values: int32s(value)
            })
          assert.deepStrictEqual(yield* values(repeatedInt32([part(0, 1, 1), part(0, 2, 1)], 2, 2)), [[1], [2]])
          yield* failsWith(values(repeatedInt32([part(0, 1, 1), part(1, 2, 0)], 1, 2)), "Malformed", /row boundary/)
        }))

      it.effect("PQ-V2-2 MUST read v2 levels uncompressed and without a length prefix (L744-745, L767)", () =>
        Effect.gen(function*() {
          const values_ = int32s(5, 7)
          const decompress: Parquet.Decompress = (data, size) => {
            assert.deepStrictEqual(gunzipSync(data), Buffer.from(values_))
            assert.strictEqual(size, 8)
            return gzip(data, size)
          }
          const v2 = dataPageV2({
            numValues: 3,
            numNulls: 1,
            numRows: 3,
            definition: someNull,
            values: gzipSync(values_),
            uncompressedSize: someNull.length + 8
          })
          assert.deepStrictEqual(yield* values(optionalInt32([v2], 3, GZIP), { codecs: { GZIP: decompress } }), [
            5,
            null,
            7
          ])
        }))

      it.effect("PQ-V2-3 MUST NOT decompress the values of a v2 page whose is_compressed is false (L745, L779)", () =>
        Effect.gen(function*() {
          const v2 = dataPageV2({
            numValues: 3,
            numNulls: 1,
            numRows: 3,
            definition: someNull,
            values: int32s(5, 7),
            compressed: false
          })
          assert.deepStrictEqual(yield* values(optionalInt32([v2], 3, GZIP)), [5, null, 7])
        }))

      it.effect("PQ-V2-4 MUST hold num_values - num_nulls values in the data section (L755-756)", () =>
        Effect.gen(function*() {
          const v2 = dataPageV2({ numValues: 3, numNulls: 0, numRows: 3, definition: someNull, values: int32s(5, 7) })
          yield* failsWith(values(optionalInt32([v2], 3)), "Malformed", /nulls/)
        }))
    })

    describe("parquet.thrift Statistics", () => {
      const withStatistics = (statistics: V) =>
        flat({ type: Type.DOUBLE, repetition: REQUIRED, numRows: 0, pages: [], statistics })
      const statisticsOf = (bytes: Uint8Array) =>
        Effect.map(metadataOf(bytes), (m) => m.rowGroups[0].columns[0].metaData?.statistics)

      it.effect("PQ-STATS-1 MUST distinguish an absent null_count from a null_count of 0 (L286-289)", () =>
        Effect.gen(function*() {
          assert.strictEqual((yield* statisticsOf(withStatistics(Struct({ 3: I64(0) }))))?.nullCount, 0)
          assert.strictEqual((yield* statisticsOf(withStatistics(Struct({}))))?.nullCount, undefined)
        }))

      it.effect("PQ-STATS-2 MUST NOT assume nan_count is 0 when it is absent (L315-316)", () =>
        Effect.gen(function*() {
          assert.strictEqual((yield* statisticsOf(withStatistics(Struct({ 9: I64(0) }))))?.nanCount, 0)
          assert.strictEqual((yield* statisticsOf(withStatistics(Struct({}))))?.nanCount, undefined)
        }))
    })

    describe("Encodings.md#plain-plain--0", () => {
      it.effect("PQ-PLAIN-1 MUST read PLAIN values of every physical type", () =>
        Effect.gen(function*() {
          const cases: ReadonlyArray<readonly [number, number, Uint8Array, ReadonlyArray<Gold>, number?]> = [
            // BOOLEAN: bit-packed, least significant bit first
            [Type.BOOLEAN, 10, new Uint8Array([0b10001101, 0b01]), [
              true,
              false,
              true,
              true,
              false,
              false,
              false,
              true,
              true,
              false
            ]],
            [Type.INT32, 2, int32s(-1, 0x7fffffff), [-1, 0x7fffffff]],
            [Type.INT64, 2, new Uint8Array(BigInt64Array.from([-(2n ** 63n), 5n]).buffer), [String(-(2n ** 63n)), "5"]],
            [Type.INT96, 1, new Uint8Array(12).fill(7), ["070707070707070707070707"]],
            [Type.FLOAT, 2, new Uint8Array(Float32Array.from([1.5, -0]).buffer), [1.5, -0]],
            [Type.DOUBLE, 1, new Uint8Array(Float64Array.from([Math.PI]).buffer), [Math.PI]],
            [Type.BYTE_ARRAY, 3, plainBinary("", "ab", "é"), ["", "6162", "c3a9"]],
            [Type.FIXED_LEN_BYTE_ARRAY, 2, new Uint8Array([1, 2, 3, 4]), ["0102", "0304"], 2]
          ]
          for (const [type, n, data, expected, typeLength] of cases) {
            assert.deepStrictEqual(yield* values(requiredColumn(type, n, data, { typeLength })), expected)
          }
        }))
    })

    describe("Encodings.md#dictionary-encoding-plain_dictionary--2-and-rle_dictionary--8", () => {
      const make = (dictionaryEncoding: number, encoding: number, indices: Uint8Array, numRows = 3) =>
        flat({
          type: Type.BYTE_ARRAY,
          repetition: REQUIRED,
          numRows,
          dictionary: true,
          pages: [
            dictionaryPage(2, plainBinary("a", "b"), dictionaryEncoding),
            dataPage(numRows, indices, { encoding })
          ]
        })

      it.effect("PQ-DICT-1 MUST read indices as a bit-width byte followed by RLE/bit-packed runs (L84-85)", () =>
        Effect.gen(function*() {
          assert.deepStrictEqual(yield* values(make(PLAIN, RLE_DICTIONARY, bytes([1], runs(1, [1, 2], [0, 1])))), [
            "62",
            "62",
            "61"
          ])
          yield* failsWith(values(make(PLAIN, RLE_DICTIONARY, bytes([33], runs(33, [1, 3])))), "Malformed", /bit width/)
        }))

      it.effect("PQ-DICT-2 SHOULD read the deprecated PLAIN_DICTIONARY in dictionary and data pages (L87-88)", () =>
        Effect.gen(function*() {
          const indices = bytes([1], runs(1, [0, 3]))
          assert.deepStrictEqual(yield* values(make(PLAIN_DICTIONARY, PLAIN_DICTIONARY, indices)), ["61", "61", "61"])
        }))
    })

    describe("Encodings.md#run-length-encoding--bit-packing-hybrid-rle--3", () => {
      it.effect("PQ-RLE-1 MUST unpack bit-packed runs from the least significant bit (note 1)", () =>
        Effect.gen(function*() {
          // the spec's example: 0 to 7 with bit width 3 is 10001000 11000110 11111010
          const bytes_ = flat({
            type: Type.INT32,
            repetition: REQUIRED,
            numRows: 8,
            dictionary: true,
            pages: [
              dictionaryPage(8, int32s(10, 11, 12, 13, 14, 15, 16, 17)),
              dataPage(8, new Uint8Array([3, 0b11, 0b10001000, 0b11000110, 0b11111010]), { encoding: RLE_DICTIONARY })
            ]
          })
          assert.deepStrictEqual(yield* values(bytes_), [10, 11, 12, 13, 14, 15, 16, 17])
        }))

      it.effect("PQ-RLE-2 MUST reject runs shorter than 1 (note 3, L141)", () =>
        failsWith(
          values(optionalInt32([dataPage(1, bytes(lengthPrefixed(new Uint8Array([0, 1])), int32s(1)))], 1)),
          "Malformed",
          /run of length 0/
        ))

      it.effect("PQ-RLE-3 MUST read RLE booleans with a 4-byte length in v1 and v2 pages (L155-170)", () =>
        Effect.gen(function*() {
          const data = lengthPrefixed(runs(1, [1, 3], [0, 2]))
          const expected = [true, true, true, false, false]
          const v1 = dataPage(5, data, { encoding: RLE })
          const v2 = dataPageV2({ numValues: 5, numNulls: 0, numRows: 5, encoding: RLE, values: data })
          for (const page of [v1, v2]) {
            assert.deepStrictEqual(
              yield* values(flat({ type: Type.BOOLEAN, repetition: REQUIRED, numRows: 5, pages: [page] })),
              expected
            )
          }
        }))
    })

    describe("Encodings.md#bit-packed-deprecated-bit_packed--4", () => {
      // seven nested optional nodes: definition levels 0 to 7 need 3 bits
      const schema = [
        root(1),
        ...Array.from({ length: 6 }, (_, i) => element("g" + i, { repetition: OPTIONAL, children: 1 })),
        element("x", { type: Type.INT32, repetition: OPTIONAL })
      ]
      const make = (page: Uint8Array) =>
        file({
          schema,
          numRows: 8,
          chunks: [{ type: Type.INT32, path: ["g0", "g1", "g2", "g3", "g4", "g5", "x"], numValues: 8, pages: [page] }]
        })

      it.effect("PQ-BP-1 MUST unpack BIT_PACKED levels from the most significant bit (L182-195)", () =>
        Effect.gen(function*() {
          // the spec's example: 0 to 7 with bit width 3 is 00000101 00111001 01110111
          const page = dataPage(8, bytes([0b00000101, 0b00111001, 0b01110111], int32s(42)), { levels: BIT_PACKED })
          const column = yield* read(make(page))
          assert.deepStrictEqual(rows(column), [null, null, null, null, null, null, null, 42])
          assert.deepStrictEqual(column.layers.map((l) => l.nullCount), [1, 2, 3, 4, 5, 6, 7])
        }))

      it.effect("PQ-BP-2 MUST NOT read BIT_PACKED as a values encoding (L197-198)", () =>
        failsWith(
          values(requiredColumn(Type.INT32, 1, int32s(1), { encoding: BIT_PACKED })),
          "Malformed",
          /not an encoding/
        ))
    })

    describe("Encodings.md#delta-encoding-delta_binary_packed--5", () => {
      const int32 = (data: Uint8Array, n: number) =>
        values(requiredColumn(Type.INT32, n, data, { encoding: DELTA_BINARY_PACKED }))
      // Example 2 (7, 5, 3, 1, 2, 3, 4, 5), with a valid block size of 128 and four miniblocks of 32
      const example2 = (widths: ReadonlyArray<number>, packed: ReadonlyArray<number>) =>
        bytes([0x80, 0x01, 4, 8, 14], [3], widths, packed)

      it.effect("PQ-DELTA-1 MUST read the header and blocks of bit-packed miniblocks (examples 1 and 2)", () =>
        Effect.gen(function*() {
          // Example 1: 1, 2, 3, 4, 5 is a min delta of 1 and bit width 0
          assert.deepStrictEqual(yield* int32(new Uint8Array([0x80, 0x01, 4, 5, 2, 2, 0, 0, 0, 0]), 5), [1, 2, 3, 4, 5])
          // relative deltas 0, 0, 0, 3, 3, 3, 3 on 2 bits, padded to 32 values
          const packed = [0b11000000, 0b00111111, 0, 0, 0, 0, 0, 0]
          assert.deepStrictEqual(yield* int32(example2([2, 0, 0, 0], packed), 8), [7, 5, 3, 1, 2, 3, 4, 5])
        }))

      it.effect("PQ-DELTA-2 MUST accept arbitrary padding bits in the last miniblock (L257-260)", () =>
        Effect.gen(function*() {
          const packed = [0b11000000, 0b11111111, 0xff, 0xaa, 0x55, 0xff, 0xff, 0xff]
          assert.deepStrictEqual(yield* int32(example2([2, 0, 0, 0], packed), 8), [7, 5, 3, 1, 2, 3, 4, 5])
        }))

      it.effect("PQ-DELTA-3 MUST accept arbitrary bit widths for unneeded miniblocks (L262-268)", () =>
        Effect.gen(function*() {
          const packed = [0b11000000, 0b00111111, 0, 0, 0, 0, 0, 0]
          assert.deepStrictEqual(yield* int32(example2([2, 0xff, 0x41, 7], packed), 8), [7, 5, 3, 1, 2, 3, 4, 5])
        }))

      it.effect("PQ-DELTA-4 MUST wrap deltas around in two's complement (L270-273)", () =>
        Effect.gen(function*() {
          // INT32: 2^31 - 1, -2^31, 2^31 - 1 are deltas 1 and -1 after wrapping
          const i32 = bytes([0x80, 0x01, 4, 3], uleb(0xfffffffe), [1], [2, 0, 0, 0], [0b0010, 0, 0, 0, 0, 0, 0, 0])
          assert.deepStrictEqual(yield* int32(i32, 3), [0x7fffffff, -0x80000000, 0x7fffffff])
          // INT64: 2^63 - 1, -2^63 is a delta of 1 after wrapping
          const max64 = [...Array(9).fill(0xff).map((b, i) => i === 0 ? 0xfe : b), 0x01]
          const i64 = bytes([0x80, 0x01, 4, 2], max64, [2], [0, 0, 0, 0])
          assert.deepStrictEqual(
            yield* values(requiredColumn(Type.INT64, 2, i64, { encoding: DELTA_BINARY_PACKED })),
            [String(2n ** 63n - 1n), String(-(2n ** 63n))]
          )
        }))

      it.effect("PQ-DELTA-5 MUST reject miniblocks wider than the physical type (L274-276)", () =>
        failsWith(
          int32(bytes([0x80, 0x01, 4, 2, 0], [0], [33, 0, 0, 0], new Uint8Array(132)), 2),
          "Malformed",
          /bit width 33/
        ))
    })

    describe("Encodings.md#delta-length-byte-array-delta_length_byte_array--6", () => {
      it.effect("PQ-DLBA-1 MUST read delta-encoded lengths followed by the concatenated bytes (example)", () =>
        Effect.gen(function*() {
          const data = bytes(delta([5, 5, 6, 6]), text("HelloWorldFoobarABCDEF"))
          assert.deepStrictEqual(
            yield* values(requiredColumn(Type.BYTE_ARRAY, 4, data, { encoding: DELTA_LENGTH_BYTE_ARRAY })),
            ["Hello", "World", "Foobar", "ABCDEF"].map((s) => Hex.encode(text(s)))
          )
        }))
    })

    describe("Encodings.md#delta-strings-delta_byte_array--7", () => {
      it.effect("PQ-DBA-1 MUST read prefix lengths then suffixes as DELTA_LENGTH_BYTE_ARRAY (example)", () =>
        Effect.gen(function*() {
          const data = bytes(delta([0, 2, 0, 3]), delta([4, 2, 6, 5]), text("axislebabbleyhood"))
          assert.deepStrictEqual(
            yield* values(requiredColumn(Type.BYTE_ARRAY, 4, data, { encoding: DELTA_BYTE_ARRAY })),
            ["axis", "axle", "babble", "babyhood"].map((s) => Hex.encode(text(s)))
          )
        }))

      it.effect("PQ-DBA-2 MUST read FIXED_LEN_BYTE_ARRAY values with all their lengths encoded", () =>
        Effect.gen(function*() {
          const data = bytes(delta([0, 2, 1]), delta([4, 2, 3]), text("axislebcd"))
          const file_ = requiredColumn(Type.FIXED_LEN_BYTE_ARRAY, 3, data, {
            encoding: DELTA_BYTE_ARRAY,
            typeLength: 4
          })
          assert.deepStrictEqual(yield* values(file_), ["axis", "axle", "abcd"].map((s) => Hex.encode(text(s))))
        }))
    })

    describe("Encodings.md#byte-stream-split-byte_stream_split--9", () => {
      const split = new Uint8Array([0xaa, 0x00, 0xa3, 0xbb, 0x11, 0xb4, 0xcc, 0x22, 0xc5, 0xdd, 0x33, 0xd6])
      const make = (data: Uint8Array) => requiredColumn(Type.FLOAT, 3, data, { encoding: BYTE_STREAM_SPLIT })

      it.effect("PQ-BSS-1 MUST gather byte k of every value from stream k (example)", () =>
        Effect.gen(function*() {
          const raw = new Uint8Array([0xaa, 0xbb, 0xcc, 0xdd, 0x00, 0x11, 0x22, 0x33, 0xa3, 0xb4, 0xc5, 0xd6])
          assert.deepStrictEqual(yield* values(make(split)), Array.from(new Float32Array(raw.buffer)))
        }))

      it.effect("PQ-BSS-2 MUST hold exactly K * N bytes, with no padding", () =>
        failsWith(values(make(bytes(split, [0]))), "Malformed", /BYTE_STREAM_SPLIT/))
    })

    describe("Compression.md", () => {
      const body = int32s(1, 2, 3)
      const make = (data: Uint8Array, codec: number) =>
        requiredColumn(Type.INT32, 3, data, { codec, uncompressedSize: 12 })

      it.effect("PQ-COMP-1 MUST decompress each page with the column chunk's codec", () =>
        Effect.gen(function*() {
          assert.deepStrictEqual(yield* values(make(gzipSync(body), GZIP), { codecs: { GZIP: gzip } }), [1, 2, 3])
          yield* failsWith(values(make(gzipSync(body), GZIP)), "Unsupported", /GZIP/)
          const failing: Parquet.Decompress = () => Effect.fail("corrupt")
          const error = yield* Effect.flip(values(make(gzipSync(body), GZIP), { codecs: { GZIP: failing } }))
          assert.strictEqual(error.kind, "Codec")
          assert.strictEqual(error.cause, "corrupt")
          assert.match(error.message, /^column "x" of row group 0, page at byte 4: GZIP decompression failed/)
        }))

      it.effect("PQ-COMP-2 SHOULD read GZIP pages holding several members (L61), given a Decompress that does", () =>
        Effect.gen(function*() {
          const members = bytes(gzipSync(body.subarray(0, 4)), gzipSync(body.subarray(4)))
          assert.deepStrictEqual(yield* values(make(members, GZIP), { codecs: { GZIP: gzip } }), [1, 2, 3])
        }))
    })

    describe("README.md#checksumming", () => {
      const options = { codecs: { GZIP: gzip } }
      const wrong = (body: Uint8Array) => (crc32(body) ^ 1) >>> 0

      it.effect("PQ-CRC-1 MUST check a v1 data page against its CRC, of the bytes after the header (parquet.thrift L840-852)", () =>
        Effect.gen(function*() {
          const seven = int32s(7)
          const eight = int32s(8)
          const make = (body: Uint8Array, crc?: number) => values(requiredColumn(Type.INT32, 1, body, { crc }))
          assert.deepStrictEqual(yield* make(seven, crc32(seven)), [7])
          // the value changed and the CRC didn't
          yield* failsWith(make(eight, crc32(seven)), "Malformed", /CRC/)
          // a page without a CRC is not checked
          assert.deepStrictEqual(yield* make(eight), [8])
          // of the compressed bytes, with the levels
          const body = bytes(lengthPrefixed(someNull), int32s(5, 7))
          const compressed = gzipSync(body)
          const gzipped = (crc: number) =>
            values(
              optionalInt32([dataPage(3, compressed, { uncompressedSize: body.length, crc })], 3, GZIP),
              options
            )
          assert.deepStrictEqual(yield* gzipped(crc32(compressed)), [5, null, 7])
          yield* failsWith(gzipped(crc32(body)), "Malformed", /CRC/)
        }))

      it.effect("PQ-CRC-2 MUST check a v2 data page against its CRC, of the levels and the stored values (parquet.thrift L840-852)", () =>
        Effect.gen(function*() {
          const values_ = int32s(5, 7)
          const make = (compressed: boolean, crc: (body: Uint8Array) => number) =>
            values(
              optionalInt32(
                [dataPageV2({
                  numValues: 3,
                  numNulls: 1,
                  numRows: 3,
                  definition: someNull,
                  values: compressed ? gzipSync(values_) : values_,
                  compressed,
                  uncompressedSize: someNull.length + values_.length,
                  crc
                })],
                3,
                GZIP
              ),
              options
            )
          for (const compressed of [false, true]) {
            assert.deepStrictEqual(yield* make(compressed, crc32), [5, null, 7])
            yield* failsWith(make(compressed, wrong), "Malformed", /CRC/)
            // not of the values alone
            yield* failsWith(
              make(compressed, (body) => crc32(body.subarray(someNull.length))),
              "Malformed",
              /CRC/
            )
          }
        }))

      it.effect("PQ-CRC-3 MUST check a dictionary page against its CRC (parquet.thrift L840-852)", () =>
        Effect.gen(function*() {
          const dictionary = int32s(10, 11)
          const make = (compressed: boolean, crc: (body: Uint8Array) => number) => {
            const stored = (body: Uint8Array) => compressed ? gzipSync(body) : body
            const indices = bytes([1], runs(1, [1, 2], [0, 1]))
            return values(
              flat({
                type: Type.INT32,
                repetition: REQUIRED,
                numRows: 3,
                dictionary: true,
                codec: compressed ? GZIP : undefined,
                pages: [
                  dictionaryPage(2, stored(dictionary), PLAIN, {
                    uncompressedSize: dictionary.length,
                    crc: crc(stored(dictionary))
                  }),
                  dataPage(3, stored(indices), { encoding: RLE_DICTIONARY, uncompressedSize: indices.length })
                ]
              }),
              options
            )
          }
          for (const compressed of [false, true]) {
            assert.deepStrictEqual(yield* make(compressed, crc32), [11, 11, 10])
            yield* failsWith(make(compressed, wrong), "Malformed", /CRC/)
          }
        }))

      it.effect("PQ-CRC-4 MUST compute the standard CRC-32 of GZIP, as an unsigned number (#checksumming)", () =>
        Effect.gen(function*() {
          // the check value of CRC-32, which is negative as the i32 of the page header
          const check = 0xcbf43926
          const body = text("123456789")
          const make = (crc: number) =>
            values(requiredColumn(Type.FIXED_LEN_BYTE_ARRAY, 1, body, { typeLength: 9, crc }))
          assert.strictEqual(check | 0, -873187034)
          assert.deepStrictEqual(yield* make(check), [Hex.encode(body)])
          yield* failsWith(make(check ^ 0x80000000), "Malformed", /CRC/)
          // CRC-32C, of the same bytes
          yield* failsWith(make(0xe3069283), "Malformed", /CRC/)
        }))

      it.effect("PQ-CRC-5 checks the CRC of the pages it skips", () =>
        Effect.gen(function*() {
          const index = text("index")
          const make = (crc: number) =>
            values(
              flat({
                type: Type.INT32,
                repetition: REQUIRED,
                numRows: 3,
                pages: [page(1, { 6: Struct({}) }, index, index.length, crc), dataPage(3, int32s(1, 2, 3))]
              })
            )
          assert.deepStrictEqual(yield* make(crc32(index)), [1, 2, 3])
          yield* failsWith(make(wrong(index)), "Malformed", /CRC/)
        }))
    })

    describe("unsupported features", () => {
      it.effect("PQ-UNSUP-1 fails with Unsupported on an encrypted footer (PARE)", () =>
        Effect.gen(function*() {
          const encrypted = int32s3.slice()
          encrypted.set(text("PARE"), encrypted.length - 4)
          yield* failsWith(metadataOf(encrypted), "Unsupported", /encrypted footer/)
        }))

      it.effect("PQ-UNSUP-2 fails with Unsupported on an encrypted column chunk", () =>
        failsWith(
          read(flat({
            type: Type.INT32,
            repetition: REQUIRED,
            numRows: 3,
            pages: [dataPage(3, int32s(1, 2, 3))],
            chunk: { 8: Struct({ 1: Struct({}) }) }
          })),
          "Unsupported",
          /encrypted/
        ))

      it.effect("PQ-UNSUP-3 fails with Unsupported on the ALP encoding", () =>
        failsWith(
          values(requiredColumn(Type.DOUBLE, 1, new Uint8Array(8), { encoding: ALP })),
          "Unsupported",
          /ALP/
        ))

      it.effect("PQ-UNSUP-4 fails with Unsupported on a column chunk in another file", () =>
        failsWith(
          read(flat({
            type: Type.INT32,
            repetition: REQUIRED,
            numRows: 3,
            pages: [dataPage(3, int32s(1, 2, 3))],
            chunk: { 1: Str("other.parquet") }
          })),
          "Unsupported",
          /other\.parquet/
        ))

      it.effect("PQ-UNSUP-5 fails with Unsupported on a codec without a Decompress, or unknown", () =>
        Effect.gen(function*() {
          for (const codec of [1, 3, 4, 5, 6, 7, 99]) {
            yield* failsWith(values(requiredColumn(Type.INT32, 3, int32s(1, 2, 3), { codec })), "Unsupported")
          }
        }))

      it.effect("PQ-UNSUP-6 fails with Unsupported on a TIME unit added after 2.14.0", () =>
        Effect.gen(function*() {
          const time = (unit: number) =>
            annotated(Type.INT64, { logicalType: temporal(TIME, Struct({ [unit]: empty })) })
          assert.deepStrictEqual((yield* annotationOf(time(2))).logicalType, {
            type: "TIME",
            isAdjustedToUTC: true,
            unit: "MICROS"
          })
          yield* failsWith(metadataOf(time(4)), "Unsupported", /TIME unit 4/)
        }))
    })
  })

  describe("hostile input", () => {
    const strings = requiredColumn(Type.BYTE_ARRAY, 2, plainBinary("abc", "de"))

    it.effect("enforces maxFooterLength, maxDepth, maxPageSize, maxValues and maxBinaryLength", () =>
      Effect.gen(function*() {
        yield* failsWith(
          Parquet.readMetadata(Parquet.fromBytes(int32s3), { maxFooterLength: 10 }),
          "Limit",
          /maxFooterLength/
        )
        const deep = file({
          schema: [
            root(1),
            element("a", { repetition: OPTIONAL, children: 1 }),
            element("b", { type: Type.INT32, repetition: OPTIONAL })
          ],
          numRows: 0,
          chunks: [{ type: Type.INT32, path: ["a", "b"], numValues: 0, pages: [] }]
        })
        assert.strictEqual((yield* Parquet.readMetadata(Parquet.fromBytes(deep), { maxDepth: 2 })).columns.length, 1)
        yield* failsWith(Parquet.readMetadata(Parquet.fromBytes(deep), { maxDepth: 1 }), "Limit", /maxDepth/)
        yield* failsWith(read(int32s3, { maxPageSize: 11 }), "Limit", /maxPageSize/)
        assert.deepStrictEqual(rows(yield* read(int32s3, { maxPageSize: 12, maxValues: 3 })), [1, 2, 3])
        yield* failsWith(read(int32s3, { maxValues: 2 }), "Limit", /maxValues/)
        assert.strictEqual(rows(yield* read(strings, { maxBinaryLength: 5 })).length, 2)
        yield* failsWith(read(strings, { maxBinaryLength: 4 }), "Limit", /maxBinaryLength/)
      }))

    it.effect("caps fixed-width values and per-page value counts", () =>
      Effect.gen(function*() {
        const wide = flat({
          type: Type.FIXED_LEN_BYTE_ARRAY,
          typeLength: 0x7fffffff,
          repetition: OPTIONAL,
          numRows: 1000,
          pages: [dataPage(1000, lengthPrefixed(runs(1, [0, 1000])))]
        })
        yield* failsWith(read(wide), "Limit", /maxBinaryLength/)
        const dictionary = flat({
          type: Type.INT32,
          repetition: REQUIRED,
          numRows: 3,
          dictionary: true,
          pages: [
            dictionaryPage(8, int32s(0, 1, 2, 3, 4, 5, 6, 7)),
            dataPage(3, bytes([3], runs(3, [7, 3])), { encoding: RLE_DICTIONARY })
          ]
        })
        assert.deepStrictEqual(rows(yield* read(dictionary)), [7, 7, 7])
        yield* failsWith(read(dictionary, { maxValues: 5 }), "Limit", /maxValues/)
      }))

    it.effect("checks page sizes before calling a codec", () =>
      Effect.gen(function*() {
        const calls: Array<number> = []
        const codecs = {
          GZIP: (data: Uint8Array, size: number) => {
            calls.push(size)
            return gzip(data, size)
          }
        }
        const v2 = (definitionLength: number, uncompressedSize: number) =>
          dataPageV2({
            numValues: 1,
            numNulls: 0,
            numRows: 1,
            values: new Uint8Array(4),
            definitionLength,
            uncompressedSize
          })
        const make = (page_: Uint8Array) =>
          flat({ type: Type.INT32, repetition: OPTIONAL, numRows: 1, codec: GZIP, pages: [page_] })
        yield* failsWith(
          read(make(dataPage(1, new Uint8Array(4), { uncompressedSize: -1 })), { codecs }),
          "Malformed",
          /negative size/
        )
        yield* failsWith(read(make(v2(5, 8)), { codecs }), "Malformed", /levels of a v2 data page/)
        yield* failsWith(read(make(v2(3, 2)), { codecs }), "Malformed", /levels of a v2 data page/)
        yield* failsWith(read(make(v2(-1, 8)), { codecs }), "Malformed", /negative/)
        assert.deepStrictEqual(calls, [])
      }))

    it.effect("dies on invalid options and indexes", () =>
      Effect.gen(function*() {
        const dies = <A, E>(effect: Effect.Effect<A, E>) =>
          Effect.map(Effect.exit(effect), (exit) => assert.isTrue(Exit.isFailure(exit) && Cause.hasDies(exit.cause)))
        yield* dies(Parquet.readMetadata(Parquet.fromBytes(int32s3), { maxDepth: 0 }))
        yield* dies(read(int32s3, { maxPageSize: 1.5 }))
        const source = Parquet.fromBytes(int32s3)
        const metadata = yield* Parquet.readMetadata(source)
        yield* dies(Parquet.readColumn(source, metadata, { rowGroup: 1, column: 0 }))
        yield* dies(Parquet.readColumn(source, metadata, { rowGroup: 0, column: -1 }))
      }))

    it.effect("rejects sources, chunks and pages that don't add up", () =>
      Effect.gen(function*() {
        const short: Parquet.Source = {
          size: int32s3.length,
          read: (offset, length) => Effect.succeed(int32s3.subarray(offset, offset + length - 1))
        }
        yield* failsWith(Parquet.readMetadata(short), "Malformed", /source returned/)
        yield* failsWith(metadataOf(new Uint8Array(11)), "Malformed", /too short/)
        const make = (pages: ReadonlyArray<Uint8Array>, numRows = 3) =>
          flat({ type: Type.INT32, repetition: REQUIRED, numRows, pages })
        yield* failsWith(read(make([dataPage(4, int32s(1, 2, 3, 4))])), "Malformed", /more values/)
        yield* failsWith(read(make([dataPage(2, int32s(1, 2))])), "Malformed", /ends after 2/)
        yield* failsWith(read(make([dataPage(3, int32s(1, 2))])), "Malformed", /PLAIN values need/)
        const truncated = make([dataPage(3, int32s(1, 2, 3))])
        yield* failsWith(read(truncated.subarray(0, 20)), "Malformed")
        // a page header claiming more bytes than the chunk
        yield* failsWith(
          read(
            make([
              page(0, { 5: Struct({ 1: I32(3), 2: I32(0), 3: I32(3), 4: I32(3) }) }, int32s(1, 2, 3), 12).subarray(
                0,
                20
              )
            ])
          ),
          "Malformed"
        )
      }))

    it.effect("rejects levels and dictionary indices out of range", () =>
      Effect.gen(function*() {
        const optional = (data: Uint8Array) =>
          flat({ type: Type.INT32, repetition: OPTIONAL, numRows: 1, pages: [dataPage(1, data)] })
        yield* failsWith(
          read(optional(bytes(lengthPrefixed(runs(1, [3, 1])), int32s(1)))),
          "Malformed",
          /RLE value wider/
        )
        yield* failsWith(read(optional(bytes(lengthPrefixed(runs(2, [2, 1])), int32s(1)))), "Malformed")
        const dictionary = flat({
          type: Type.INT32,
          repetition: REQUIRED,
          numRows: 1,
          dictionary: true,
          pages: [dictionaryPage(1, int32s(9)), dataPage(1, bytes([1], runs(1, [1, 1])), { encoding: RLE_DICTIONARY })]
        })
        yield* failsWith(read(dictionary), "Malformed", /out of range/)
        const noDictionary = flat({
          type: Type.INT32,
          repetition: REQUIRED,
          numRows: 1,
          pages: [dataPage(1, bytes([1], runs(1, [0, 1])), { encoding: RLE_DICTIONARY })]
        })
        yield* failsWith(read(noDictionary), "Malformed", /no dictionary page/)
      }))

    it.effect("rejects levels that repeat a missing list or disagree with the row count", () =>
      Effect.gen(function*() {
        const repeated = (
          rep: ReadonlyArray<readonly [number, number]>,
          def: ReadonlyArray<readonly [number, number]>,
          n: number,
          numRows: number
        ) =>
          flat({
            type: Type.INT32,
            repetition: REPEATED,
            numRows,
            numValues: n,
            pages: [
              dataPage(
                n,
                bytes(lengthPrefixed(runs(1, ...rep)), lengthPrefixed(runs(1, ...def)), int32s(...Array(n).fill(1)))
              )
            ]
          })
        // the first level repeats a list that was never started
        yield* failsWith(read(repeated([[1, 1]], [[1, 1]], 1, 0)), "Malformed", /repeats a list/)
        // an empty list (d = 0) followed by a repetition into it
        yield* failsWith(read(repeated([[0, 1], [1, 1]], [[0, 1], [1, 1]], 2, 1)), "Malformed", /repeats a list/)
        yield* failsWith(read(repeated([[0, 2]], [[1, 2]], 2, 3)), "Malformed", /holds 2 rows/)
      }))

    it.effect("rejects metadata that disagrees with the schema", () =>
      Effect.gen(function*() {
        const make = (type: number, path: ReadonlyArray<string>) =>
          metadataOf(file({
            schema: [root(1), element("x", { type: Type.INT32, repetition: REQUIRED })],
            numRows: 0,
            chunks: [{ type, path, numValues: 0, pages: [] }]
          }))
        yield* failsWith(make(Type.INT64, ["x"]), "Malformed", /is INT64/)
        yield* failsWith(make(Type.INT32, ["y"]), "Malformed", /is for "y"/)
        yield* failsWith(
          metadataOf(
            file({
              schema: [root(1), element("x", { type: Type.FIXED_LEN_BYTE_ARRAY, repetition: REQUIRED })],
              numRows: 0,
              chunks: []
            })
          ),
          "Malformed",
          /type_length/
        )
      }))
  })
})
