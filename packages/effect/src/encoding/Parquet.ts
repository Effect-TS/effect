/**
 * Reads Apache Parquet files: the footer metadata and the values of one column
 * chunk at a time, in buffers laid out the way Apache Arrow lays out arrays.
 *
 * **Mental model**
 *
 * - A Parquet file holds row groups; each row group holds one column chunk per
 *   leaf column of the schema. {@link readMetadata} reads the footer, which
 *   describes the schema, the row groups and where every column chunk is.
 * - {@link readColumn} reads one column chunk and returns a {@link Column}: one
 *   {@link Layer} per schema node on the column's path, with Arrow-style
 *   validity bitmaps and list offsets, and the leaf's {@link Values} with a slot
 *   for every null.
 * - Both read through a {@link Source}, so the file can be in memory
 *   ({@link fromBytes}), on disk or behind HTTP range requests.
 * - Compressed pages go through a {@link Decompress} function supplied per
 *   codec in {@link readColumn}'s options. This module has no codecs of its own.
 *
 * **Example** (Reading a column)
 *
 * ```ts
 * import { Effect } from "effect"
 * import { Parquet } from "effect/encoding"
 * import { readFile } from "node:fs/promises"
 *
 * const program = Effect.gen(function*() {
 *   const source = Parquet.fromBytes(new Uint8Array(yield* Effect.promise(() => readFile("data.parquet"))))
 *   const metadata = yield* Parquet.readMetadata(source)
 *   const column = metadata.columns.findIndex((c) => c.path.join(".") === "price")
 *   const { values, layers } = yield* Parquet.readColumn(source, metadata, { rowGroup: 0, column })
 *   // layers[0].validity marks the non-null rows, values.values holds them
 *   return { values, validity: layers[0].validity }
 * })
 * ```
 *
 * **Details**
 *
 * The reader follows
 * [apache/parquet-format 2.14.0](https://github.com/apache/parquet-format/tree/apache-parquet-format-2.14.0):
 *
 * - Physical types: all eight. Values stay in their physical type; logical
 *   types and converted types are decoded into the schema but not applied
 *   (a `DATE` column reads as `INT32` days, a `STRING` as UTF-8 bytes).
 * - Annotations: an annotation added after 2.14.0, or one the spec doesn't
 *   define for the physical type it is on (a `STRING` on an `INT32`), is left
 *   out of the schema, and so is the order of the column's statistics. A
 *   `DECIMAL` precision or scale and an `INTEGER` bit width that the spec
 *   forbids fail with `Malformed`.
 * - Encodings: `PLAIN`, `PLAIN_DICTIONARY` and `RLE_DICTIONARY` (values
 *   are looked up in the dictionary), `RLE` (booleans), `DELTA_BINARY_PACKED`,
 *   `DELTA_LENGTH_BYTE_ARRAY`, `DELTA_BYTE_ARRAY` and `BYTE_STREAM_SPLIT`;
 *   levels in `RLE` or the deprecated `BIT_PACKED`.
 * - Pages: data pages v1 and v2 and dictionary pages; index pages and page
 *   types added after 2.14.0 are skipped.
 * - Nesting: any depth of optional, required and repeated fields, assembled from
 *   repetition and definition levels into {@link Layer}s.
 *
 * Not supported, failing with a {@link ParquetError} of kind `Unsupported`:
 * encrypted files and columns, the `ALP` encoding, column chunks in other
 * files (`file_path`), `TIME` and `TIMESTAMP` units added after 2.14.0, and
 * compressed pages without a matching {@link Decompress}. Not read: page
 * indexes, bloom filters, page checksums, size and geospatial statistics.
 *
 * Input is untrusted: every offset and length is checked against the bytes
 * that are there, and the sizes a file claims are capped by options
 * (`maxFooterLength`, `maxDepth`, `maxPageSize`, `maxValues`,
 * `maxBinaryLength`) before anything that large is allocated.
 *
 * Writing Parquet is not supported.
 *
 * @stability experimental
 * @since 4.1.5
 */
import * as Data from "../Data.ts"
import * as Effect from "../Effect.ts"
import * as Encodings from "../internal/parquet/encodings.ts"
import * as Predicate from "../Predicate.ts"
import * as Thrift from "./Thrift.ts"

const ParquetErrorTypeId = "~effect/encoding/Parquet/ParquetError"

/**
 * Error raised when a Parquet file can't be read.
 *
 * **Details**
 *
 * The `kind` field identifies the failure:
 *
 * - `Malformed`: the file breaks the Parquet format, for example a bad magic
 *   number, invalid Thrift metadata, an offset outside the file, or pages that
 *   don't add up to their column chunk.
 * - `Unsupported`: the file uses a feature this module doesn't read, or a
 *   compression codec with no {@link Decompress} in the options.
 * - `Limit`: the file needs more than an option such as `maxPageSize` allows.
 * - `Codec`: a {@link Decompress} function failed; its error is the `cause`.
 * - `Usage`: an option or argument is invalid. These are bugs in the caller,
 *   so they are defects, not failures.
 *
 * @stability experimental
 * @category errors
 * @since 4.1.5
 */
export class ParquetError extends Data.TaggedError("ParquetError")<{
  readonly kind: "Malformed" | "Unsupported" | "Limit" | "Codec" | "Usage"
  readonly message: string
  readonly cause?: unknown
}> {
  /**
   * Marks this value as a Parquet error for runtime guards.
   *
   * @stability experimental
   * @since 4.1.5
   */
  readonly [ParquetErrorTypeId] = ParquetErrorTypeId
}

/**
 * Checks whether a value is a {@link ParquetError}.
 *
 * @stability experimental
 * @category guards
 * @since 4.1.5
 */
export const isParquetError = (u: unknown): u is ParquetError => Predicate.hasProperty(u, ParquetErrorTypeId)

/**
 * A Parquet physical type: how values are stored.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export type PhysicalType =
  | "BOOLEAN"
  | "INT32"
  | "INT64"
  | "INT96"
  | "FLOAT"
  | "DOUBLE"
  | "BYTE_ARRAY"
  | "FIXED_LEN_BYTE_ARRAY"

/**
 * Whether a schema field is required, optional (may be null) or repeated (a
 * list of zero or more values).
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export type Repetition = "REQUIRED" | "OPTIONAL" | "REPEATED"

/**
 * A Parquet encoding.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export type Encoding =
  | "PLAIN"
  | "PLAIN_DICTIONARY"
  | "RLE"
  | "BIT_PACKED"
  | "DELTA_BINARY_PACKED"
  | "DELTA_LENGTH_BYTE_ARRAY"
  | "DELTA_BYTE_ARRAY"
  | "RLE_DICTIONARY"
  | "BYTE_STREAM_SPLIT"
  | "ALP"

/**
 * A Parquet compression codec.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export type CompressionCodec = "UNCOMPRESSED" | "SNAPPY" | "GZIP" | "LZO" | "BROTLI" | "LZ4" | "ZSTD" | "LZ4_RAW"

/**
 * A legacy type annotation, superseded by {@link LogicalType}.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export type ConvertedType =
  | "UTF8"
  | "MAP"
  | "MAP_KEY_VALUE"
  | "LIST"
  | "ENUM"
  | "DECIMAL"
  | "DATE"
  | "TIME_MILLIS"
  | "TIME_MICROS"
  | "TIMESTAMP_MILLIS"
  | "TIMESTAMP_MICROS"
  | "UINT_8"
  | "UINT_16"
  | "UINT_32"
  | "UINT_64"
  | "INT_8"
  | "INT_16"
  | "INT_32"
  | "INT_64"
  | "JSON"
  | "BSON"
  | "INTERVAL"

/**
 * A type annotation that says how to interpret a field's physical values.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export type LogicalType =
  | {
    readonly type:
      | "STRING"
      | "MAP"
      | "LIST"
      | "ENUM"
      | "DATE"
      | "UNKNOWN"
      | "JSON"
      | "BSON"
      | "UUID"
      | "FLOAT16"
      | "FILE"
  }
  | { readonly type: "DECIMAL"; readonly scale: number; readonly precision: number }
  | {
    readonly type: "TIME" | "TIMESTAMP"
    readonly isAdjustedToUTC: boolean
    readonly unit: "MILLIS" | "MICROS" | "NANOS"
  }
  | { readonly type: "INTEGER"; readonly bitWidth: number; readonly isSigned: boolean }
  | { readonly type: "VARIANT"; readonly specificationVersion: number | undefined }
  | { readonly type: "GEOMETRY"; readonly crs: string | undefined }
  | {
    readonly type: "GEOGRAPHY"
    readonly crs: string | undefined
    readonly algorithm: "SPHERICAL" | "VINCENTY" | "THOMAS" | "ANDOYER" | "KARNEY" | number | undefined
  }

/**
 * The sort order of a column's `minValue` and `maxValue` statistics.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export type ColumnOrder = "TYPE_ORDER" | "IEEE_754_TOTAL_ORDER" | "INT96_TIMESTAMP_ORDER"

/**
 * A node of the schema tree: a group with `children`, or a leaf with a
 * `physicalType`.
 *
 * **Details**
 *
 * Enum-valued fields hold the spec's name, or the numeric code of a value this
 * module doesn't know.
 *
 * `convertedType` and `logicalType` are each `undefined` when the spec doesn't
 * define the annotation for this node: for its physical type and
 * `typeLength`, or for a group. They are not compared with each other.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface SchemaNode {
  readonly name: string
  /** `undefined` only for the root. */
  readonly repetition: Repetition | undefined
  /** `undefined` for groups. */
  readonly physicalType: PhysicalType | undefined
  /** The byte width of `FIXED_LEN_BYTE_ARRAY` values. */
  readonly typeLength: number | undefined
  readonly convertedType: ConvertedType | number | undefined
  /** `undefined` when absent or of a kind this module doesn't know. */
  readonly logicalType: LogicalType | undefined
  readonly scale: number | undefined
  readonly precision: number | undefined
  readonly fieldId: number | undefined
  /** `undefined` for leaves. */
  readonly children: ReadonlyArray<SchemaNode> | undefined
}

/**
 * A leaf column of the schema, in the order of the column chunks of every row
 * group.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface ColumnDescriptor {
  /** The names of {@link nodes}. */
  readonly path: ReadonlyArray<string>
  /** The schema nodes from a child of the root down to the leaf. */
  readonly nodes: ReadonlyArray<SchemaNode>
  readonly physicalType: PhysicalType
  readonly typeLength: number | undefined
  /** The number of optional and repeated nodes on the path. */
  readonly maxDefinitionLevel: number
  /** The number of repeated nodes on the path. */
  readonly maxRepetitionLevel: number
  /**
   * `undefined` when the file has no column orders, or one this module doesn't
   * know, or when the leaf has an annotation this module doesn't know or the
   * spec doesn't define for its physical type.
   */
  readonly columnOrder: ColumnOrder | undefined
}

/**
 * Key/value metadata of a file or column chunk.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface KeyValue {
  readonly key: string
  readonly value: string | undefined
}

/**
 * Statistics of a column chunk, as written.
 *
 * **Details**
 *
 * A count that is `undefined` is unknown, not zero. Min and max values are
 * the plain-encoded bytes of a value, ordered by the column's
 * {@link ColumnDescriptor.columnOrder}; `min` and `max` are the deprecated
 * fields, ordered by signed comparison.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Statistics {
  readonly nullCount: number | undefined
  readonly distinctCount: number | undefined
  readonly nanCount: number | undefined
  readonly minValue: Uint8Array | undefined
  readonly maxValue: Uint8Array | undefined
  readonly isMinValueExact: boolean | undefined
  readonly isMaxValueExact: boolean | undefined
  readonly min: Uint8Array | undefined
  readonly max: Uint8Array | undefined
}

/**
 * Where a column chunk's pages are and how they are written.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface ColumnMetaData {
  readonly physicalType: PhysicalType
  readonly encodings: ReadonlyArray<Encoding | number>
  readonly pathInSchema: ReadonlyArray<string>
  readonly codec: CompressionCodec | number
  /** The number of values, nulls included. */
  readonly numValues: number
  readonly totalUncompressedSize: number
  readonly totalCompressedSize: number
  readonly keyValueMetadata: ReadonlyArray<KeyValue>
  readonly dataPageOffset: number
  readonly indexPageOffset: number | undefined
  readonly dictionaryPageOffset: number | undefined
  readonly statistics: Statistics | undefined
}

/**
 * A column chunk of a row group.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface ColumnChunk {
  /** Set when the chunk is in another file, which this module doesn't read. */
  readonly filePath: string | undefined
  /** Whether the chunk is encrypted, which this module doesn't read. */
  readonly encrypted: boolean
  /** `undefined` only when the chunk is encrypted. */
  readonly metaData: ColumnMetaData | undefined
}

/**
 * A row group: one column chunk per leaf column.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface RowGroup {
  readonly numRows: number
  readonly totalByteSize: number
  /** In the order of {@link FileMetaData.columns}. */
  readonly columns: ReadonlyArray<ColumnChunk>
}

/**
 * The metadata in a Parquet file's footer.
 *
 * **Gotchas**
 *
 * Binary statistics are views of the footer bytes read from the
 * {@link Source}.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface FileMetaData {
  readonly version: number
  readonly numRows: number
  readonly createdBy: string | undefined
  readonly keyValueMetadata: ReadonlyArray<KeyValue>
  /** The root of the schema tree. */
  readonly schema: SchemaNode
  /** The leaf columns, in schema order. */
  readonly columns: ReadonlyArray<ColumnDescriptor>
  readonly rowGroups: ReadonlyArray<RowGroup>
}

/**
 * Random access to the bytes of a Parquet file.
 *
 * **Details**
 *
 * `read` returns the `length` bytes at `offset`; the reader asks only for
 * ranges inside `size`. Returning fewer bytes fails with `Malformed`.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Source<E = never, R = never> {
  readonly size: number
  readonly read: (offset: number, length: number) => Effect.Effect<Uint8Array, E, R>
}

/**
 * Creates a {@link Source} over bytes in memory.
 *
 * **Gotchas**
 *
 * Reads return views of `bytes`, so do not mutate them while reading.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const fromBytes = (bytes: Uint8Array): Source => ({
  size: bytes.length,
  read: (offset, length) => Effect.succeed(bytes.subarray(offset, offset + length))
})

/**
 * Decompresses one page: the bytes as written, and the size the page header
 * says they decompress to.
 *
 * **Details**
 *
 * A result of another size fails with `Malformed`; a failure becomes a
 * {@link ParquetError} of kind `Codec` with the error as its `cause`. For
 * `GZIP`, pages may hold several gzip members. `LZ4` is the deprecated
 * Hadoop-framed codec; `LZ4_RAW` is the plain LZ4 block format.
 *
 * **Gotchas**
 *
 * Report failures in the error channel: a function that throws is a defect.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export type Decompress = (data: Uint8Array, uncompressedSize: number) => Effect.Effect<Uint8Array, unknown>

/**
 * The values of a column chunk's leaf, one slot per slot of the leaf's
 * {@link Layer}, in Arrow's layout.
 *
 * **Details**
 *
 * - `BOOLEAN` values are a bitmap, least significant bit first.
 * - `INT96` values are 12 bytes each, `FIXED_LEN_BYTE_ARRAY` values `width`
 *   bytes each.
 * - `BYTE_ARRAY` value `i` is `values.subarray(offsets[i], offsets[i + 1])`.
 * - A null slot holds zero, `false`, zero bytes or an empty byte array.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export type Values =
  | { readonly type: "BOOLEAN"; readonly values: Uint8Array }
  | { readonly type: "INT32"; readonly values: Int32Array }
  | { readonly type: "INT64"; readonly values: BigInt64Array }
  | { readonly type: "INT96"; readonly values: Uint8Array }
  | { readonly type: "FLOAT"; readonly values: Float32Array }
  | { readonly type: "DOUBLE"; readonly values: Float64Array }
  | { readonly type: "BYTE_ARRAY"; readonly offsets: Int32Array; readonly values: Uint8Array }
  | { readonly type: "FIXED_LEN_BYTE_ARRAY"; readonly width: number; readonly values: Uint8Array }

/**
 * One schema node of a column's path, as an Arrow array without its values.
 *
 * **Details**
 *
 * A node that isn't repeated has one slot per slot of its parent (per row for
 * a child of the root). A repeated node has one slot per element, and its
 * `offsets` give, for slot `i` of the parent, the elements from
 * `offsets[i]` to `offsets[i + 1]`.
 *
 * An optional node has a `validity` bitmap, least significant bit first: a
 * set bit is a non-null slot. A slot whose ancestor is null is null too. A
 * repeated node has no validity; an empty and a null list are told apart by
 * the optional node above it.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Layer {
  readonly node: SchemaNode
  readonly length: number
  /** For optional nodes. */
  readonly validity: Uint8Array | undefined
  readonly nullCount: number
  /** For repeated nodes: `length` of the parent plus one. */
  readonly offsets: Int32Array | undefined
}

/**
 * A column chunk's values.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Column {
  readonly descriptor: ColumnDescriptor
  readonly numRows: number
  /** One per node of {@link ColumnDescriptor.nodes}. */
  readonly layers: ReadonlyArray<Layer>
  /** One slot per slot of the last layer. */
  readonly values: Values
}

// ---------------------------------------------------------------------------
// Errors and options
// ---------------------------------------------------------------------------

const { Failure, fail, u32 } = Encodings

const error = (kind: ParquetError["kind"], message: string, cause?: unknown): ParquetError =>
  new ParquetError(cause === undefined ? { kind, message } : { kind, message, cause })

const usage = (message: string): never => {
  throw error("Usage", message)
}

const limit = (name: string, value: number | undefined, fallback: number, max: number): number => {
  if (value === undefined) return fallback
  if (!Number.isSafeInteger(value) || value < 1 || value > max) {
    usage(`${name} must be an integer from 1 to ${max}, got ${value}`)
  }
  return value
}

const MAX_INT32 = 0x7fffffff

/** Runs synchronous decoding, turning its failures into {@link ParquetError}s. */
const attempt = <A>(f: () => A): Effect.Effect<A, ParquetError> =>
  Effect.suspend(() => {
    try {
      return Effect.succeed(f())
    } catch (cause) {
      if (cause instanceof Failure) return Effect.fail(error(cause.kind, cause.message))
      if (Thrift.isThriftError(cause) && cause.kind !== "Usage") {
        return Effect.fail(
          error(cause.kind === "Limit" ? "Limit" : "Malformed", `invalid Thrift metadata: ${cause.message}`)
        )
      }
      return Effect.die(cause)
    }
  })

/** Prefixes an error's message with where in the file it happened. */
const locate = (where: string) => (e: ParquetError): ParquetError => error(e.kind, `${where}: ${e.message}`, e.cause)

const readRange = <E, R>(
  source: Source<E, R>,
  offset: number,
  length: number
): Effect.Effect<Uint8Array, E | ParquetError, R> =>
  Effect.flatMap(source.read(offset, length), (bytes) =>
    bytes.length === length
      ? Effect.succeed(bytes)
      : Effect.fail(
        error("Malformed", `the source returned ${bytes.length} bytes at offset ${offset} instead of ${length}`)
      ))

// ---------------------------------------------------------------------------
// Thrift metadata
// ---------------------------------------------------------------------------

const T = Thrift.Type

const physicalTypes: ReadonlyArray<PhysicalType> = [
  "BOOLEAN",
  "INT32",
  "INT64",
  "INT96",
  "FLOAT",
  "DOUBLE",
  "BYTE_ARRAY",
  "FIXED_LEN_BYTE_ARRAY"
]
const repetitions: ReadonlyArray<Repetition> = ["REQUIRED", "OPTIONAL", "REPEATED"]
const encodings: ReadonlyArray<Encoding | undefined> = [
  "PLAIN",
  undefined,
  "PLAIN_DICTIONARY",
  "RLE",
  "BIT_PACKED",
  "DELTA_BINARY_PACKED",
  "DELTA_LENGTH_BYTE_ARRAY",
  "DELTA_BYTE_ARRAY",
  "RLE_DICTIONARY",
  "BYTE_STREAM_SPLIT",
  "ALP"
]
const codecs: ReadonlyArray<CompressionCodec> = [
  "UNCOMPRESSED",
  "SNAPPY",
  "GZIP",
  "LZO",
  "BROTLI",
  "LZ4",
  "ZSTD",
  "LZ4_RAW"
]
const convertedTypes: ReadonlyArray<ConvertedType> = [
  "UTF8",
  "MAP",
  "MAP_KEY_VALUE",
  "LIST",
  "ENUM",
  "DECIMAL",
  "DATE",
  "TIME_MILLIS",
  "TIME_MICROS",
  "TIMESTAMP_MILLIS",
  "TIMESTAMP_MICROS",
  "UINT_8",
  "UINT_16",
  "UINT_32",
  "UINT_64",
  "INT_8",
  "INT_16",
  "INT_32",
  "INT_64",
  "JSON",
  "BSON",
  "INTERVAL"
]
const edgeAlgorithms = ["SPHERICAL", "VINCENTY", "THOMAS", "ANDOYER", "KARNEY"] as const
const timeUnits = [undefined, "MILLIS", "MICROS", "NANOS"] as const
const columnOrders = [undefined, "TYPE_ORDER", "IEEE_754_TOTAL_ORDER", "INT96_TIMESTAMP_ORDER"] as const

const name = <A>(names: ReadonlyArray<A | undefined>, code: number): A | number => names[code] ?? code

type Reader = Thrift.Reader

const struct = (r: Reader, field: (id: number, type: Thrift.Type) => void): void => {
  r.readStructBegin()
  for (let type = r.readFieldBegin(); type !== T.Stop; type = r.readFieldBegin()) field(r.fieldId, type)
  r.readStructEnd()
}

/** A struct field: its id and how to read it. */
type Field<A> = readonly [id: number, read: (r: Reader, type: Thrift.Type) => A]

/**
 * Reads a struct into an object with a key per entry of `fields`: the value of
 * the field with that id, or `undefined` when it is absent. Other fields are
 * skipped.
 */
const readStruct = <F extends { readonly [key: string]: Field<unknown> }>(
  r: Reader,
  fields: F
): { [K in keyof F]: ReturnType<F[K][1]> | undefined } => {
  const out: Record<string, unknown> = {}
  const keys: Array<string> = []
  for (const key in fields) {
    out[key] = undefined
    keys[fields[key][0]] = key
  }
  struct(r, (id, type) => {
    const key = keys[id]
    if (key === undefined) r.skip(type)
    else out[key] = fields[key][1](r, type)
  })
  return out as { [K in keyof F]: ReturnType<F[K][1]> | undefined }
}

// Generated Thrift code skips a field of an unexpected type, as these do.
const skip = (r: Reader, type: Thrift.Type): undefined => {
  r.skip(type)
  return undefined
}
const i32 = (r: Reader, type: Thrift.Type) => type === T.I32 ? r.readI32() : skip(r, type)
const i8 = (r: Reader, type: Thrift.Type) => type === T.I8 ? r.readI8() : skip(r, type)
const i64 = (r: Reader, type: Thrift.Type) => type === T.I64 ? r.readI64Number() : skip(r, type)
const bool = (r: Reader, type: Thrift.Type) => type === T.Bool ? r.readBool() : skip(r, type)
const string = (r: Reader, type: Thrift.Type) => type === T.Binary ? r.readString() : skip(r, type)
const binary = (r: Reader, type: Thrift.Type) => type === T.Binary ? r.readBinary() : skip(r, type)
const structOf = <A>(read: (r: Reader) => A) => (r: Reader, type: Thrift.Type): A | undefined =>
  type === T.Struct ? read(r) : skip(r, type)
const list =
  <A>(element: Thrift.Type, read: (r: Reader) => A) => (r: Reader, type: Thrift.Type): Array<A> | undefined => {
    if (type !== T.List) return skip(r, type)
    const out: Array<A> = []
    for (let n = r.readListBegin(), elementType = r.elementType; n > 0; n--) {
      if (elementType !== element) return fail("Malformed", "a metadata list has elements of the wrong type")
      out.push(read(r))
    }
    return out
  }
/** For a field whose presence is all that matters. */
const present = (r: Reader, type: Thrift.Type): true => {
  r.skip(type)
  return true
}

const required = <A>(value: A | undefined, what: string): A =>
  value === undefined ? fail("Malformed", `${what} is missing`) : value

const keyValue = (r: Reader): KeyValue => {
  const f = readStruct(r, { key: [1, string], value: [2, string] })
  return { key: required(f.key, "KeyValue.key"), value: f.value }
}

const statistics = (r: Reader): Statistics =>
  readStruct(r, {
    nullCount: [3, i64],
    distinctCount: [4, i64],
    nanCount: [9, i64],
    minValue: [6, binary],
    maxValue: [5, binary],
    isMinValueExact: [8, bool],
    isMaxValueExact: [7, bool],
    min: [2, binary],
    max: [1, binary]
  })

const simpleLogicalTypes = {
  1: "STRING",
  2: "MAP",
  3: "LIST",
  4: "ENUM",
  6: "DATE",
  11: "UNKNOWN",
  12: "JSON",
  13: "BSON",
  14: "UUID",
  15: "FLOAT16",
  19: "FILE"
} as const

/**
 * Reads a union of empty structs, such as TimeUnit or ColumnOrder, as the name
 * of its field, or as the id of a field this module doesn't know.
 */
const unionName = <A>(r: Reader, names: ReadonlyArray<A | undefined>): A | number | undefined => {
  let out: A | number | undefined
  struct(r, (id, type) => {
    r.skip(type)
    const known = names[id]
    if (known === undefined) out = id
    else if (type === T.Struct) out = known
  })
  return out
}

/** Reads a LogicalType union, or the id of a member this module doesn't know. */
const logicalType = (r: Reader): LogicalType | number | undefined => {
  let out: LogicalType | number | undefined
  struct(r, (id, type) => {
    if (type !== T.Struct) {
      r.skip(type)
      out = id
      return
    }
    const simple = simpleLogicalTypes[id as keyof typeof simpleLogicalTypes]
    if (simple !== undefined) {
      r.skip(type)
      out = { type: simple }
      return
    }
    switch (id) {
      case 5: {
        const f = readStruct(r, { scale: [1, i32], precision: [2, i32] })
        out = {
          type: "DECIMAL",
          scale: required(f.scale, "DecimalType.scale"),
          precision: required(f.precision, "DecimalType.precision")
        }
        return
      }
      case 7:
      case 8: {
        const kind = id === 7 ? "TIME" : "TIMESTAMP"
        const what = id === 7 ? "TimeType" : "TimestampType"
        const f = readStruct(r, { isAdjustedToUTC: [1, bool], unit: [2, structOf((r) => unionName(r, timeUnits))] })
        const isAdjustedToUTC = required(f.isAdjustedToUTC, `${what}.isAdjustedToUTC`)
        const unit = required(f.unit, `${what}.unit`)
        if (typeof unit === "number") return fail("Unsupported", `${kind} unit ${unit} is not supported`)
        out = { type: kind, isAdjustedToUTC, unit }
        return
      }
      case 10: {
        const f = readStruct(r, { bitWidth: [1, i8], isSigned: [2, bool] })
        out = {
          type: "INTEGER",
          bitWidth: required(f.bitWidth, "IntType.bitWidth"),
          isSigned: required(f.isSigned, "IntType.isSigned")
        }
        return
      }
      case 16:
        out = { type: "VARIANT", specificationVersion: readStruct(r, { version: [1, i8] }).version }
        return
      case 17:
        out = { type: "GEOMETRY", crs: readStruct(r, { crs: [1, string] }).crs }
        return
      case 18: {
        const f = readStruct(r, { crs: [1, string], algorithm: [2, i32] })
        out = {
          type: "GEOGRAPHY",
          crs: f.crs,
          algorithm: f.algorithm === undefined ? undefined : name(edgeAlgorithms, f.algorithm)
        }
        return
      }
      default:
        r.skip(type)
        out = id
    }
  })
  return out
}

const schemaElement = (r: Reader) => {
  const f = readStruct(r, {
    type: [1, i32],
    typeLength: [2, i32],
    repetition: [3, i32],
    name: [4, string],
    numChildren: [5, i32],
    convertedType: [6, i32],
    scale: [7, i32],
    precision: [8, i32],
    fieldId: [9, i32],
    logicalType: [10, structOf(logicalType)]
  })
  return { ...f, name: required(f.name, "SchemaElement.name") }
}

type Element = ReturnType<typeof schemaElement>

const columnMetaData = (r: Reader): ColumnMetaData => {
  const f = readStruct(r, {
    type: [1, i32],
    encodings: [2, list(T.I32, (r) => name(encodings, r.readI32()))],
    pathInSchema: [3, list(T.Binary, (r) => r.readString())],
    codec: [4, i32],
    numValues: [5, i64],
    totalUncompressedSize: [6, i64],
    totalCompressedSize: [7, i64],
    keyValueMetadata: [8, list(T.Struct, keyValue)],
    dataPageOffset: [9, i64],
    indexPageOffset: [10, i64],
    dictionaryPageOffset: [11, i64],
    statistics: [12, structOf(statistics)]
  })
  const type = required(f.type, "ColumnMetaData.type")
  return {
    physicalType: physicalTypes[type] ?? fail("Unsupported", `physical type ${type} is not supported`),
    encodings: required(f.encodings, "ColumnMetaData.encodings"),
    pathInSchema: required(f.pathInSchema, "ColumnMetaData.path_in_schema"),
    codec: name(codecs, required(f.codec, "ColumnMetaData.codec")),
    numValues: required(f.numValues, "ColumnMetaData.num_values"),
    totalUncompressedSize: required(f.totalUncompressedSize, "ColumnMetaData.total_uncompressed_size"),
    totalCompressedSize: required(f.totalCompressedSize, "ColumnMetaData.total_compressed_size"),
    keyValueMetadata: f.keyValueMetadata ?? [],
    dataPageOffset: required(f.dataPageOffset, "ColumnMetaData.data_page_offset"),
    indexPageOffset: f.indexPageOffset,
    dictionaryPageOffset: f.dictionaryPageOffset,
    statistics: f.statistics
  }
}

const columnChunk = (r: Reader): ColumnChunk => {
  const f = readStruct(r, {
    filePath: [1, string],
    metaData: [3, structOf(columnMetaData)],
    cryptoMetadata: [8, present],
    encryptedColumnMetadata: [9, present]
  })
  const encrypted = f.cryptoMetadata === true || f.encryptedColumnMetadata === true
  if (!encrypted && f.metaData === undefined) fail("Malformed", "ColumnChunk.meta_data is missing")
  return { filePath: f.filePath, encrypted, metaData: f.metaData }
}

const rowGroup = (r: Reader): RowGroup => {
  const f = readStruct(r, { columns: [1, list(T.Struct, columnChunk)], totalByteSize: [2, i64], numRows: [3, i64] })
  return {
    columns: required(f.columns, "RowGroup.columns"),
    totalByteSize: required(f.totalByteSize, "RowGroup.total_byte_size"),
    numRows: required(f.numRows, "RowGroup.num_rows")
  }
}

/** A logical type, or a converted type as the logical type that replaced it. */
type Annotation = LogicalType | { readonly type: Exclude<ConvertedType, "DECIMAL"> }

/**
 * The physical type LogicalTypes.md defines each annotation for, `undefined`
 * for a group. The annotations that are not here depend on more than that.
 */
const annotated: {
  readonly [
    K in Exclude<Annotation["type"], "DECIMAL" | "TIME" | "INTEGER" | "UNKNOWN" | "UUID" | "FLOAT16" | "INTERVAL">
  ]: PhysicalType | undefined
} = {
  MAP: undefined,
  MAP_KEY_VALUE: undefined,
  LIST: undefined,
  VARIANT: undefined,
  FILE: undefined,
  STRING: "BYTE_ARRAY",
  UTF8: "BYTE_ARRAY",
  ENUM: "BYTE_ARRAY",
  JSON: "BYTE_ARRAY",
  BSON: "BYTE_ARRAY",
  GEOMETRY: "BYTE_ARRAY",
  GEOGRAPHY: "BYTE_ARRAY",
  DATE: "INT32",
  TIME_MILLIS: "INT32",
  UINT_8: "INT32",
  UINT_16: "INT32",
  UINT_32: "INT32",
  INT_8: "INT32",
  INT_16: "INT32",
  INT_32: "INT32",
  TIME_MICROS: "INT64",
  TIMESTAMP: "INT64",
  TIMESTAMP_MILLIS: "INT64",
  TIMESTAMP_MICROS: "INT64",
  UINT_64: "INT64",
  INT_64: "INT64"
}
const annotatedLengths = { UUID: 16, FLOAT16: 2, INTERVAL: 12 } as const

/**
 * Whether LogicalTypes.md defines `annotation` for the node of schema element
 * `e`: a leaf of `physicalType`, or a group. Fails on parameters it forbids
 * for every node.
 */
const annotates = (annotation: Annotation, e: Element, physicalType: PhysicalType | undefined): boolean => {
  switch (annotation.type) {
    case "UNKNOWN":
      // "a column that is always null", of any type
      return true
    case "UUID":
    case "FLOAT16":
    case "INTERVAL":
      return physicalType === "FIXED_LEN_BYTE_ARRAY" && e.typeLength === annotatedLengths[annotation.type]
    case "TIME":
      return physicalType === (annotation.unit === "MILLIS" ? "INT32" : "INT64")
    case "INTEGER": {
      const { bitWidth } = annotation
      if (bitWidth !== 8 && bitWidth !== 16 && bitWidth !== 32 && bitWidth !== 64) {
        fail("Malformed", `schema element "${e.name}" is an INTEGER with a bit width of ${bitWidth}`)
      }
      return physicalType === (bitWidth === 64 ? "INT64" : "INT32")
    }
    case "DECIMAL": {
      const { precision, scale } = annotation
      const invalid = (reason: string): never =>
        fail("Malformed", `schema element "${e.name}" is a DECIMAL with ${reason}`)
      if (precision < 1) invalid(`a precision of ${precision}`)
      if (scale < 0 || scale > precision) invalid(`a scale of ${scale} for a precision of ${precision}`)
      let digits: number
      switch (physicalType) {
        case "INT32":
          digits = 9
          break
        case "INT64":
          digits = 18
          break
        case "FIXED_LEN_BYTE_ARRAY":
          // floor(log10(2^(8n - 1) - 1)), which is this as no power of 2 is a power of 10
          digits = Math.floor((8 * e.typeLength! - 1) * Math.log10(2))
          break
        case "BYTE_ARRAY":
          return true
        default:
          return false
      }
      if (precision > digits) {
        invalid(`a precision of ${precision}, more than the ${digits} digits of its ${physicalType}`)
      }
      return true
    }
    default:
      return physicalType === annotated[annotation.type]
  }
}

/**
 * The annotations of a schema element's node, without those the spec doesn't
 * define for it. `known` is whether the node kept all it had: when it didn't,
 * the order of its values is unknown too.
 */
const annotations = (e: Element, physicalType: PhysicalType | undefined): {
  readonly logicalType: LogicalType | undefined
  readonly convertedType: ConvertedType | number | undefined
  readonly known: boolean
} => {
  let logicalType: LogicalType | undefined
  let convertedType = e.convertedType === undefined ? undefined : name(convertedTypes, e.convertedType)
  let known = typeof e.logicalType !== "number" && typeof convertedType !== "number"
  if (typeof e.logicalType === "object") {
    if (annotates(e.logicalType, e, physicalType)) logicalType = e.logicalType
    else known = false
  }
  if (typeof convertedType === "string") {
    let annotation: Annotation
    if (convertedType !== "DECIMAL") annotation = { type: convertedType }
    // A DecimalType supersedes the scale and precision of the schema element.
    else if (typeof e.logicalType === "object" && e.logicalType.type === "DECIMAL") annotation = e.logicalType
    else {
      annotation = {
        type: "DECIMAL",
        scale: e.scale ?? 0,
        precision: required(e.precision, `the precision of DECIMAL schema element "${e.name}"`)
      }
    }
    if (!annotates(annotation, e, physicalType)) {
      convertedType = undefined
      known = false
    }
  }
  return { logicalType, convertedType, known }
}

interface Schema {
  readonly root: SchemaNode
  readonly columns: Array<ColumnDescriptor>
}

/** Rebuilds the schema tree from its depth-first list of elements. */
const schemaTree = (
  elements: ReadonlyArray<Element>,
  orders: ReadonlyArray<ColumnOrder | number | undefined> | undefined,
  maxDepth: number
): Schema => {
  const columns: Array<ColumnDescriptor> = []
  let index = 0
  const node = (path: ReadonlyArray<SchemaNode>, definition: number, repetitionLevel: number): SchemaNode => {
    if (index >= elements.length) fail("Malformed", "the schema ends inside a group")
    const e = elements[index++]
    const isRoot = path.length === 0 && index === 1
    let repetition: Repetition | undefined
    if (!isRoot) {
      if (path.length + 1 > maxDepth) fail("Limit", `the schema nests deeper than maxDepth (${maxDepth})`)
      const code = required(e.repetition, `the repetition of schema element "${e.name}"`)
      repetition = repetitions[code] ?? fail("Malformed", `schema element "${e.name}" has repetition ${code}`)
      if (repetition !== "REQUIRED") definition++
      if (repetition === "REPEATED") repetitionLevel++
    }
    const base = {
      name: e.name,
      repetition,
      typeLength: e.typeLength,
      scale: e.scale,
      precision: e.precision,
      fieldId: e.fieldId
    }
    if (e.type === undefined) {
      const count = required(e.numChildren, `the type or children of schema element "${e.name}"`)
      if (count < 0) fail("Malformed", `schema element "${e.name}" has ${count} children`)
      const children: Array<SchemaNode> = []
      const { convertedType, logicalType } = annotations(e, undefined)
      const self: SchemaNode = { ...base, convertedType, logicalType, physicalType: undefined, children }
      const nodes = isRoot ? path : [...path, self]
      for (let i = 0; i < count; i++) children.push(node(nodes, definition, repetitionLevel))
      return self
    }
    if (isRoot) fail("Malformed", "the schema root is not a group")
    if (e.numChildren !== undefined && e.numChildren !== 0) {
      fail("Malformed", `schema element "${e.name}" has both a type and children`)
    }
    const physicalType = physicalTypes[e.type] ?? fail("Unsupported", `physical type ${e.type} is not supported`)
    if (physicalType === "FIXED_LEN_BYTE_ARRAY" && !(e.typeLength !== undefined && e.typeLength > 0)) {
      fail("Malformed", `FIXED_LEN_BYTE_ARRAY column "${e.name}" has no positive type_length`)
    }
    const { convertedType, known, logicalType } = annotations(e, physicalType)
    const self: SchemaNode = { ...base, convertedType, logicalType, physicalType, children: undefined }
    const nodes = [...path, self]
    const order = orders?.[columns.length]
    columns.push({
      path: nodes.map((n) => n.name),
      nodes,
      physicalType,
      typeLength: physicalType === "FIXED_LEN_BYTE_ARRAY" ? e.typeLength : undefined,
      maxDefinitionLevel: definition,
      maxRepetitionLevel: repetitionLevel,
      columnOrder: typeof order === "number" || !known ? undefined : order
    })
    return self
  }
  const root = node([], 0, 0)
  if (index !== elements.length) fail("Malformed", `the schema has ${elements.length - index} elements after its root`)
  if (orders !== undefined && orders.length !== columns.length) {
    fail("Malformed", `the file has ${orders.length} column orders for ${columns.length} columns`)
  }
  return { root, columns }
}

const fileMetaData = (footer: Uint8Array, maxDepth: number): FileMetaData => {
  const r = Thrift.makeReader(footer)
  const f = readStruct(r, {
    version: [1, i32],
    schema: [2, list(T.Struct, schemaElement)],
    numRows: [3, i64],
    rowGroups: [4, list(T.Struct, rowGroup)],
    keyValueMetadata: [5, list(T.Struct, keyValue)],
    createdBy: [6, string],
    orders: [7, list(T.Struct, (r) => unionName(r, columnOrders))]
  })
  const elements = required(f.schema, "FileMetaData.schema")
  if (elements.length === 0) fail("Malformed", "FileMetaData.schema is empty")
  const { columns, root } = schemaTree(elements, f.orders, maxDepth)
  const rowGroups = required(f.rowGroups, "FileMetaData.row_groups")
  for (const group of rowGroups) {
    if (group.columns.length !== columns.length) {
      fail("Malformed", `a row group has ${group.columns.length} column chunks for ${columns.length} columns`)
    }
    group.columns.forEach((chunk, i) => {
      const meta = chunk.metaData
      const column = columns[i]
      if (meta === undefined) return
      if (meta.physicalType !== column.physicalType) {
        fail(
          "Malformed",
          `column chunk ${i} is ${meta.physicalType}, but column "${column.path.join(".")}" is ${column.physicalType}`
        )
      }
      if (meta.pathInSchema.join("\u0000") !== column.path.join("\u0000")) {
        fail("Malformed", `column chunk ${i} is for "${meta.pathInSchema.join(".")}", not "${column.path.join(".")}"`)
      }
    })
  }
  return {
    version: required(f.version, "FileMetaData.version"),
    numRows: required(f.numRows, "FileMetaData.num_rows"),
    createdBy: f.createdBy,
    keyValueMetadata: f.keyValueMetadata ?? [],
    schema: root,
    columns,
    rowGroups
  }
}

const MAGIC = 0x31524150 // "PAR1" little-endian
const MAGIC_ENCRYPTED = 0x45524150 // "PARE"

/**
 * Reads the metadata in the footer of a Parquet file.
 *
 * **Details**
 *
 * This reads the last 8 bytes, the first 4 and the footer. `maxFooterLength`
 * (default 64 MiB) caps the footer's size and `maxDepth` (default 64, at most
 * 255) how deep the schema may nest.
 *
 * @stability experimental
 * @category decoding
 * @since 4.1.5
 */
export const readMetadata = <E, R>(
  source: Source<E, R>,
  options?: {
    readonly maxFooterLength?: number | undefined
    readonly maxDepth?: number | undefined
  }
): Effect.Effect<FileMetaData, ParquetError | E, R> =>
  Effect.gen(function*() {
    const maxFooterLength = limit("maxFooterLength", options?.maxFooterLength, 64 * 1024 * 1024, 0xffffffff)
    const maxDepth = limit("maxDepth", options?.maxDepth, 64, 255)
    const size = source.size
    if (!Number.isSafeInteger(size) || size < 0) usage(`the source size ${size} is not a non-negative integer`)
    if (size < 12) return yield* error("Malformed", `a file of ${size} bytes is too short to be Parquet`)
    const tail = yield* readRange(source, size - 8, 8)
    const magic = u32(tail, 4)
    if (magic === MAGIC_ENCRYPTED) {
      return yield* error("Unsupported", "files with an encrypted footer are not supported")
    }
    if (magic !== MAGIC) return yield* error("Malformed", "the file does not end with the magic number PAR1")
    if (u32(yield* readRange(source, 0, 4), 0) !== MAGIC) {
      return yield* error("Malformed", "the file does not start with the magic number PAR1")
    }
    const length = u32(tail, 0)
    if (length > size - 12) return yield* error("Malformed", `the footer length ${length} is larger than the file`)
    if (length > maxFooterLength) {
      return yield* error("Limit", `the footer of ${length} bytes exceeds maxFooterLength (${maxFooterLength})`)
    }
    const footer = yield* readRange(source, size - 8 - length, length)
    return yield* attempt(() => fileMetaData(footer, maxDepth))
  })

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------

const DATA_PAGE = 0
const DICTIONARY_PAGE = 2
const DATA_PAGE_V2 = 3

interface PageHeader {
  readonly type: number
  readonly uncompressedSize: number
  readonly compressedSize: number
  readonly numValues: number
  readonly encoding: Encoding | number
  readonly definitionEncoding: Encoding | number
  readonly repetitionEncoding: Encoding | number
  readonly numNulls: number
  readonly numRows: number
  readonly definitionLength: number
  readonly repetitionLength: number
  readonly compressed: boolean
}

const pageHeader = (r: Reader): PageHeader => {
  const f = readStruct(r, {
    type: [1, i32],
    uncompressedSize: [2, i32],
    compressedSize: [3, i32],
    dataPage: [
      5,
      structOf((r) =>
        readStruct(r, {
          numValues: [1, i32],
          encoding: [2, i32],
          definitionEncoding: [3, i32],
          repetitionEncoding: [4, i32]
        })
      )
    ],
    dictionaryPage: [7, structOf((r) => readStruct(r, { numValues: [1, i32], encoding: [2, i32] }))],
    dataPageV2: [
      8,
      structOf((r) =>
        readStruct(r, {
          numValues: [1, i32],
          numNulls: [2, i32],
          numRows: [3, i32],
          encoding: [4, i32],
          definitionLength: [5, i32],
          repetitionLength: [6, i32],
          compressed: [7, bool]
        })
      )
    ]
  })
  const type = required(f.type, "PageHeader.type")
  const uncompressedSize = required(f.uncompressedSize, "PageHeader.uncompressed_page_size")
  const compressedSize = required(f.compressedSize, "PageHeader.compressed_page_size")
  if (uncompressedSize < 0 || compressedSize < 0) fail("Malformed", "a page header has a negative size")
  const count = (n: number | undefined, what: string): number => {
    const value = required(n, what)
    if (value < 0) fail("Malformed", `${what} is negative`)
    return value
  }
  const encoding = (code: number | undefined, what: string) => name(encodings, required(code, what))
  const header: PageHeader = {
    type,
    uncompressedSize,
    compressedSize,
    numValues: 0,
    encoding: "PLAIN",
    definitionEncoding: "RLE",
    repetitionEncoding: "RLE",
    numNulls: 0,
    numRows: 0,
    definitionLength: 0,
    repetitionLength: 0,
    compressed: true
  }
  switch (type) {
    case DATA_PAGE: {
      const p = required(f.dataPage, "PageHeader.data_page_header")
      return {
        ...header,
        numValues: count(p.numValues, "DataPageHeader.num_values"),
        encoding: encoding(p.encoding, "DataPageHeader.encoding"),
        definitionEncoding: encoding(p.definitionEncoding, "DataPageHeader.definition_level_encoding"),
        repetitionEncoding: encoding(p.repetitionEncoding, "DataPageHeader.repetition_level_encoding")
      }
    }
    case DATA_PAGE_V2: {
      const p = required(f.dataPageV2, "PageHeader.data_page_header_v2")
      const v2 = {
        ...header,
        numValues: count(p.numValues, "DataPageHeaderV2.num_values"),
        numNulls: count(p.numNulls, "DataPageHeaderV2.num_nulls"),
        numRows: count(p.numRows, "DataPageHeaderV2.num_rows"),
        encoding: encoding(p.encoding, "DataPageHeaderV2.encoding"),
        definitionLength: count(p.definitionLength, "DataPageHeaderV2.definition_levels_byte_length"),
        repetitionLength: count(p.repetitionLength, "DataPageHeaderV2.repetition_levels_byte_length"),
        compressed: p.compressed !== false
      }
      const levels = v2.repetitionLength + v2.definitionLength
      if (levels > compressedSize || levels > uncompressedSize) {
        fail("Malformed", "the levels of a v2 data page are larger than the page")
      }
      return v2
    }
    case DICTIONARY_PAGE: {
      const p = required(f.dictionaryPage, "PageHeader.dictionary_page_header")
      return {
        ...header,
        numValues: count(p.numValues, "DictionaryPageHeader.num_values"),
        encoding: encoding(p.encoding, "DictionaryPageHeader.encoding")
      }
    }
    default:
      return header
  }
}

const kindOf = (column: ColumnDescriptor): Encodings.Kind => {
  switch (column.physicalType) {
    case "BOOLEAN":
      return { tag: "bool" }
    case "INT32":
      return { tag: "i32", width: 4 }
    case "FLOAT":
      return { tag: "f32", width: 4 }
    case "INT64":
      return { tag: "i64", width: 8 }
    case "DOUBLE":
      return { tag: "f64", width: 8 }
    case "INT96":
      return { tag: "int96", width: 12 }
    case "FIXED_LEN_BYTE_ARRAY":
      return { tag: "fixed", width: column.typeLength! }
    case "BYTE_ARRAY":
      return { tag: "bytes" }
  }
}

/** Decodes RLE/bit-packed hybrid levels from 0 to `max` into `out`, unless the column has none. */
const decodeLevels = (
  bytes: Uint8Array,
  start: number,
  end: number,
  max: number,
  out: Uint8Array | undefined,
  what: string
): void => {
  if (out !== undefined) Encodings.hybrid(bytes, start, end, Encodings.bitWidth(max), max, out, what)
}

/** Decodes the pages of one column chunk and assembles its {@link Column}. */
class ChunkDecoder {
  readonly column: ColumnDescriptor
  readonly kind: Encodings.Kind
  readonly numValues: number
  private readonly budget: Encodings.Budget
  /** The levels of every value, nulls included; `undefined` when the column has none. */
  private readonly repetitions: Uint8Array | undefined
  private readonly definitions: Uint8Array | undefined
  private readonly dense: Array<Encodings.Dense> = []
  private dictionary: Encodings.Dense | undefined
  private seenData = false
  /** Levels decoded so far: values, nulls included. */
  count = 0

  constructor(column: ColumnDescriptor, kind: Encodings.Kind, numValues: number, maxBinaryLength: number) {
    this.column = column
    this.kind = kind
    this.numValues = numValues
    this.budget = { left: maxBinaryLength }
    // Fixed-width values take their bytes in every slot, nulls included.
    if (kind.tag === "fixed" || kind.tag === "int96") Encodings.spend(this.budget, numValues * kind.width)
    this.repetitions = column.maxRepetitionLevel === 0 ? undefined : new Uint8Array(numValues)
    this.definitions = column.maxDefinitionLevel === 0 ? undefined : new Uint8Array(numValues)
  }

  dictionaryPage(header: PageHeader, data: Uint8Array): void {
    if (this.dictionary !== undefined || this.seenData) {
      fail("Malformed", "a dictionary page must be the first page of a column chunk, and the only one")
    }
    if (header.encoding !== "PLAIN" && header.encoding !== "PLAIN_DICTIONARY") {
      fail("Malformed", `a dictionary page is encoded with ${header.encoding}, not PLAIN`)
    }
    this.dictionary = Encodings.plain(this.kind, data, 0, data.length, header.numValues, this.budget)
  }

  /** A v1 data page: repetition levels, definition levels and values, all after decompression. */
  dataPage(header: PageHeader, page: Uint8Array): void {
    const [repetition, definition] = this.start(header.numValues)
    let pos = 0
    const levels = (out: Uint8Array | undefined, encoding: Encoding | number, max: number, what: string) => {
      if (out === undefined) return
      if (encoding === "RLE") {
        const end = Encodings.lengthPrefix(page, pos, page.length, what)
        decodeLevels(page, pos + 4, end, max, out, what)
        pos = end
      } else if (encoding === "BIT_PACKED") {
        pos = Encodings.bitPacked(page, pos, page.length, Encodings.bitWidth(max), max, out, what)
      } else {
        fail("Unsupported", `${what} encoded with ${encoding} are not supported`)
      }
    }
    levels(repetition, header.repetitionEncoding, this.column.maxRepetitionLevel, "repetition levels")
    levels(definition, header.definitionEncoding, this.column.maxDefinitionLevel, "definition levels")
    this.values(header.encoding, page, pos, this.tally(header.numValues, repetition, definition).nonNull)
  }

  /** A v2 data page: the levels as written and the values after decompression. */
  dataPageV2(header: PageHeader, levels: Uint8Array, values: Uint8Array): void {
    const n = header.numValues
    const [repetition, definition] = this.start(n)
    const split = header.repetitionLength
    decodeLevels(levels, 0, split, this.column.maxRepetitionLevel, repetition, "repetition levels")
    decodeLevels(levels, split, levels.length, this.column.maxDefinitionLevel, definition, "definition levels")
    const { nonNull, rows } = this.tally(n, repetition, definition)
    if (n - nonNull !== header.numNulls) {
      fail("Malformed", `a v2 data page has ${n - nonNull} nulls, but its header says ${header.numNulls}`)
    }
    if (repetition !== undefined && n > 0 && repetition[0] !== 0) {
      fail("Malformed", "a v2 data page does not start at a row boundary")
    }
    if (rows !== header.numRows) {
      fail("Malformed", `a v2 data page has ${rows} rows, but its header says ${header.numRows}`)
    }
    this.values(header.encoding, values, 0, nonNull)
  }

  /** Starts a data page of `n` values, and returns its parts of the chunk's repetition and definition levels. */
  private start(n: number): readonly [Uint8Array | undefined, Uint8Array | undefined] {
    if (n > this.numValues - this.count) fail("Malformed", "the pages hold more values than their column chunk")
    this.seenData = true
    const end = this.count + n
    return [this.repetitions?.subarray(this.count, end), this.definitions?.subarray(this.count, end)]
  }

  /** Counts a page's non-null values and rows, and adds its levels to the chunk's. */
  private tally(
    n: number,
    repetition: Uint8Array | undefined,
    definition: Uint8Array | undefined
  ): { readonly nonNull: number; readonly rows: number } {
    const max = this.column.maxDefinitionLevel
    let nonNull = 0
    let rows = 0
    for (let i = 0; i < n; i++) {
      if (definition === undefined || definition[i] === max) nonNull++
      if (repetition === undefined || repetition[i] === 0) rows++
    }
    this.count += n
    return { nonNull, rows }
  }

  private values(encoding: Encoding | number, bytes: Uint8Array, pos: number, n: number): void {
    const kind = this.kind
    const end = bytes.length
    const invalid = (): never =>
      fail("Malformed", `${encoding} is not an encoding for ${this.column.physicalType} values`)
    let dense: Encodings.Dense
    switch (encoding) {
      case "PLAIN":
        dense = Encodings.plain(kind, bytes, pos, end, n, this.budget)
        break
      case "PLAIN_DICTIONARY":
      case "RLE_DICTIONARY": {
        const dictionary = this.dictionary
        if (dictionary === undefined) return fail("Malformed", "a dictionary-encoded page has no dictionary page")
        if (n === 0) return
        if (pos >= end) fail("Malformed", "dictionary indices are truncated")
        const width = bytes[pos]
        if (width > 32) fail("Malformed", `dictionary indices have a bit width of ${width}, more than 32`)
        const indices = new Int32Array(n)
        const max = Encodings.lengthOf(kind, dictionary) - 1
        if (max < 0) fail("Malformed", "a dictionary-encoded page has values but the dictionary is empty")
        Encodings.hybrid(bytes, pos + 1, end, width, max, indices, "dictionary indices")
        dense = Encodings.gather(kind, dictionary, indices, this.budget)
        break
      }
      case "RLE": {
        if (kind.tag !== "bool") return invalid()
        const out = new Uint8Array(n)
        const stop = Encodings.lengthPrefix(bytes, pos, end, "RLE BOOLEAN values")
        Encodings.hybrid(bytes, pos + 4, stop, 1, 1, out, "RLE BOOLEAN values")
        dense = out
        break
      }
      case "DELTA_BINARY_PACKED":
        if (kind.tag === "i32") dense = Encodings.deltaBinaryPacked(bytes, pos, end, n, false)[0]
        else if (kind.tag === "i64") dense = Encodings.deltaBinaryPacked(bytes, pos, end, n, true)[0]
        else return invalid()
        break
      case "DELTA_LENGTH_BYTE_ARRAY":
        if (kind.tag !== "bytes") return invalid()
        dense = Encodings.deltaLengthByteArray(bytes, pos, end, n, this.budget)
        break
      case "DELTA_BYTE_ARRAY":
        if (kind.tag === "bytes") dense = Encodings.deltaByteArray(bytes, pos, end, n, this.budget)
        else if (kind.tag === "fixed") {
          dense = Encodings.deltaByteArray(bytes, pos, end, n, this.budget, kind.width).data
        } else return invalid()
        break
      case "BYTE_STREAM_SPLIT":
        if (kind.tag === "bool" || kind.tag === "bytes" || kind.tag === "int96") return invalid()
        dense = Encodings.byteStreamSplit(kind, bytes, pos, end, n)
        break
      case "BIT_PACKED":
        return invalid()
      default:
        return fail("Unsupported", `the ${encoding} encoding is not supported`)
    }
    this.dense.push(dense)
  }

  finish(numRows: number): Column {
    if (this.count !== this.numValues) {
      fail("Malformed", `the column chunk ends after ${this.count} of its ${this.numValues} values`)
    }
    const dense = Encodings.concat(this.kind, this.dense)
    return assemble(this.column, this.kind, numRows, this.count, this.repetitions, this.definitions, dense)
  }
}

/**
 * Turns repetition and definition levels into one {@link Layer} per node of the
 * column's path, and spreads the dense values over the leaf's slots.
 *
 * Each repeated node starts a new "space" of slots (its elements); the other
 * nodes share the space of their nearest repeated ancestor, or the rows. A
 * level entry (r, d) adds a slot to every space s >= r whose repeated node it
 * defines, so to spaces r, r + 1, ... while d reaches the space's definition
 * level.
 */
const assemble = (
  column: ColumnDescriptor,
  kind: Encodings.Kind,
  numRows: number,
  n: number,
  repetition: Uint8Array | undefined,
  definition: Uint8Array | undefined,
  dense: Encodings.Dense
): Column => {
  const nodes = column.nodes
  const maxRepetition = column.maxRepetitionLevel
  const maxDefinition = column.maxDefinitionLevel
  // spaceDefinition[s]: the definition level at which space s has a slot
  const spaceDefinition = [0]
  const nodeDefinition: Array<number> = []
  const nodeSpace: Array<number> = []
  const optionalIn: Array<Array<number>> = [[]]
  const repeatedOf: Array<number> = [-1]
  let d = 0
  for (let i = 0; i < nodes.length; i++) {
    const repetitionType = nodes[i].repetition
    if (repetitionType !== "REQUIRED") d++
    if (repetitionType === "REPEATED") {
      spaceDefinition.push(d)
      optionalIn.push([])
      repeatedOf.push(i)
    }
    nodeDefinition.push(d)
    nodeSpace.push(spaceDefinition.length - 1)
    if (repetitionType === "OPTIONAL") optionalIn[spaceDefinition.length - 1].push(i)
  }

  const counts = new Array<number>(maxRepetition + 1).fill(0)
  let open = -1
  for (let e = 0; e < n; e++) {
    const r = repetition === undefined ? 0 : repetition[e]
    const level = definition === undefined ? maxDefinition : definition[e]
    if (r > 0 && (open < r || level < spaceDefinition[r])) {
      fail("Malformed", `level ${e} repeats a list that has no elements (repetition ${r}, definition ${level})`)
    }
    let s = r
    while (s <= maxRepetition && level >= spaceDefinition[s]) counts[s++]++
    open = s - 1
  }
  if (counts[0] !== numRows) {
    fail("Malformed", `the column chunk holds ${counts[0]} rows, but its row group has ${numRows}`)
  }

  const validity = nodes.map((node, i) =>
    node.repetition === "OPTIONAL" ? new Uint8Array((counts[nodeSpace[i]] + 7) >> 3) : undefined
  )
  const valid = new Array<number>(nodes.length).fill(0)
  const offsets = nodes.map((node, i) =>
    node.repetition === "REPEATED" ? new Int32Array(counts[nodeSpace[i] - 1] + 1) : undefined
  )
  const slots = counts[maxRepetition]
  const present = new Uint8Array(slots)
  const next = new Array<number>(maxRepetition + 1).fill(0)
  for (let e = 0; e < n; e++) {
    const r = repetition === undefined ? 0 : repetition[e]
    const level = definition === undefined ? maxDefinition : definition[e]
    for (let s = r; s <= maxRepetition && level >= spaceDefinition[s]; s++) {
      const slot = next[s]++
      if (s < maxRepetition) offsets[repeatedOf[s + 1]]![slot] = next[s + 1]
      for (const i of optionalIn[s]) {
        if (level >= nodeDefinition[i]) {
          validity[i]![slot >> 3] |= 1 << (slot & 7)
          valid[i]++
        }
      }
      if (s === maxRepetition && level === maxDefinition) present[slot] = 1
    }
  }
  for (let s = 1; s <= maxRepetition; s++) offsets[repeatedOf[s]]![counts[s - 1]] = counts[s]

  return {
    descriptor: column,
    numRows,
    layers: nodes.map((node, i) => {
      const length = counts[nodeSpace[i]]
      return {
        node,
        length,
        validity: validity[i],
        nullCount: validity[i] === undefined ? 0 : length - valid[i],
        offsets: offsets[i]
      }
    }),
    values: spread(column, kind, dense, present, slots)
  }
}

/** Gives every leaf slot a value, leaving null slots empty. */
const spread = (
  column: ColumnDescriptor,
  kind: Encodings.Kind,
  dense: Encodings.Dense,
  present: Uint8Array,
  slots: number
): Values => {
  const full = Encodings.lengthOf(kind, dense) === slots
  switch (kind.tag) {
    case "bool": {
      const bits = dense as Uint8Array
      const out = new Uint8Array((slots + 7) >> 3)
      for (let j = 0, k = 0; j < slots; j++) {
        if (present[j] === 1 && bits[k++] === 1) out[j >> 3] |= 1 << (j & 7)
      }
      return { type: "BOOLEAN", values: out }
    }
    case "bytes": {
      const values = dense as Encodings.Binary
      let offsets = values.offsets
      if (!full) {
        offsets = new Int32Array(slots + 1)
        for (let j = 0, k = 0; j < slots; j++) {
          offsets[j + 1] = offsets[j] + (present[j] === 1 ? values.offsets[k + 1] - values.offsets[k++] : 0)
        }
      }
      return { type: "BYTE_ARRAY", offsets, values: values.data }
    }
    case "int96":
    case "fixed": {
      const width = kind.width
      let values = dense as Uint8Array
      if (!full) {
        const from = values
        values = new Uint8Array(slots * width)
        for (let j = 0, k = 0; j < slots; j++) {
          if (present[j] !== 1) continue
          for (let at = j * width, stop = at + width; at < stop; at++) values[at] = from[k++]
        }
      }
      return kind.tag === "int96" ? { type: "INT96", values } : { type: "FIXED_LEN_BYTE_ARRAY", width, values }
    }
    default: {
      let values = dense as Int32Array
      if (!full) {
        const from = values
        values = Encodings.alloc(kind, slots) as Int32Array
        for (let j = 0, k = 0; j < slots; j++) if (present[j] === 1) values[j] = from[k++]
      }
      return { type: column.physicalType, values } as Values
    }
  }
}

const decompress = (
  codec: CompressionCodec | number,
  decompressors: { readonly [codec: string]: Decompress | undefined } | undefined,
  data: Uint8Array,
  size: number
): Effect.Effect<Uint8Array, ParquetError> => {
  const checked = (out: Uint8Array) =>
    out.length === size
      ? Effect.succeed(out)
      : Effect.fail(error("Malformed", `a page decompressed to ${out.length} bytes, but its header says ${size}`))
  if (codec === "UNCOMPRESSED") return checked(data)
  const f = typeof codec === "string" ? decompressors?.[codec] : undefined
  if (f === undefined) {
    return Effect.fail(error("Unsupported", `${codec} pages need a Decompress for ${codec} in the codecs option`))
  }
  return Effect.flatMap(
    Effect.mapError(f(data, size), (cause) => error("Codec", `${codec} decompression failed`, cause)),
    checked
  )
}

/**
 * Reads the values of one column chunk: column `column` of
 * `metadata.columns` in row group `rowGroup`.
 *
 * **Details**
 *
 * Pages compressed with a codec other than `UNCOMPRESSED` need a
 * {@link Decompress} for it in `codecs`. Dictionary-encoded values are looked
 * up in the dictionary, so the result never refers to it.
 *
 * Limits for untrusted files, each at most 2^31 - 1:
 *
 * - `maxPageSize` (default 256 MiB) caps each page's compressed and
 *   uncompressed size.
 * - `maxValues` (default 2^24) caps the values of the column chunk and of
 *   each page, nulls included.
 * - `maxBinaryLength` (default 1 GiB) caps the total bytes of the chunk's
 *   `BYTE_ARRAY`, `FIXED_LEN_BYTE_ARRAY` and `INT96` values. Fixed-width
 *   values are counted for every value, nulls included.
 *
 * **Gotchas**
 *
 * - Memory and time grow with the values times the nodes on the column's
 *   path: every optional node has a validity bitmap. Lower `maxValues` for
 *   deeply nested columns from untrusted files.
 * - `rowGroup` and `column` must be indexes into `metadata`: anything else
 *   is a defect, not a failure.
 *
 * @stability experimental
 * @category decoding
 * @since 4.1.5
 */
export const readColumn = <E, R>(
  source: Source<E, R>,
  metadata: FileMetaData,
  options: {
    readonly rowGroup: number
    readonly column: number
    readonly codecs?: { readonly [K in Exclude<CompressionCodec, "UNCOMPRESSED">]?: Decompress | undefined } | undefined
    readonly maxPageSize?: number | undefined
    readonly maxValues?: number | undefined
    readonly maxBinaryLength?: number | undefined
  }
): Effect.Effect<Column, ParquetError | E, R> =>
  Effect.gen(function*() {
    const maxPageSize = limit("maxPageSize", options.maxPageSize, 256 * 1024 * 1024, MAX_INT32)
    const maxValues = limit("maxValues", options.maxValues, 2 ** 24, MAX_INT32)
    const maxBinaryLength = limit("maxBinaryLength", options.maxBinaryLength, 1024 * 1024 * 1024, MAX_INT32)
    const group = Number.isInteger(options.rowGroup) ? metadata.rowGroups[options.rowGroup] : undefined
    const column = Number.isInteger(options.column) ? metadata.columns[options.column] : undefined
    if (group === undefined) return usage(`the file has no row group ${options.rowGroup}`)
    if (column === undefined) return usage(`the file has no column ${options.column}`)
    const chunk = group.columns[options.column]
    const where = `column "${column.path.join(".")}" of row group ${options.rowGroup}`
    if (chunk.filePath !== undefined) {
      return yield* error("Unsupported", `${where} is in another file, ${chunk.filePath}`)
    }
    if (chunk.encrypted || chunk.metaData === undefined) {
      return yield* error("Unsupported", `${where} is encrypted`)
    }
    const meta = chunk.metaData
    if (meta.numValues < 0) return yield* error("Malformed", `${where} has ${meta.numValues} values`)
    if (meta.numValues > maxValues) {
      return yield* error("Limit", `${where} has ${meta.numValues} values, more than maxValues (${maxValues})`)
    }
    const decoder = yield* Effect.mapError(
      attempt(() => new ChunkDecoder(column, kindOf(column), meta.numValues, maxBinaryLength)),
      locate(where)
    )
    // A chunk without values needs no pages; parquet-cpp writes data_page_offset 0 for one.
    if (meta.numValues > 0) {
      let start = meta.dataPageOffset
      const dictionary = meta.dictionaryPageOffset
      if (dictionary !== undefined && dictionary > 0 && dictionary < start) start = dictionary
      const length = meta.totalCompressedSize
      if (start < 4 || length < 0 || length > source.size - start) {
        return yield* error("Malformed", `${where} has pages outside the file`)
      }
      const bytes = yield* readRange(source, start, length)
      const thrift = Thrift.makeReader(bytes)
      let pos = 0
      while (decoder.count < meta.numValues) {
        if (pos >= bytes.length) {
          return yield* error("Malformed", `${where} ends after ${decoder.count} of its ${meta.numValues} values`)
        }
        const headerAt = start + pos
        const header = yield* Effect.mapError(
          attempt(() => {
            thrift.position = pos
            return pageHeader(thrift)
          }),
          locate(`${where}, page header at byte ${headerAt}`)
        )
        const body = thrift.position
        if (header.compressedSize > bytes.length - body) {
          return yield* error("Malformed", `a page of ${where} is larger than its column chunk`)
        }
        if (header.compressedSize > maxPageSize || header.uncompressedSize > maxPageSize) {
          return yield* error("Limit", `a page of ${where} is larger than maxPageSize (${maxPageSize})`)
        }
        // Caps dictionary pages too, and rejects a page before decompressing it.
        if (header.numValues > maxValues) {
          return yield* error("Limit", `a page of ${where} has more values than maxValues (${maxValues})`)
        }
        pos = body + header.compressedSize
        // Index pages and page types added later are skipped.
        if (header.type !== DATA_PAGE && header.type !== DATA_PAGE_V2 && header.type !== DICTIONARY_PAGE) continue
        const page = bytes.subarray(body, pos)
        const levels = header.type === DATA_PAGE_V2 ? header.repetitionLength + header.definitionLength : 0
        const codec = header.compressed ? meta.codec : "UNCOMPRESSED"
        yield* decompress(codec, options.codecs, page.subarray(levels), header.uncompressedSize - levels).pipe(
          Effect.flatMap((data) =>
            attempt(() =>
              header.type === DICTIONARY_PAGE
                ? decoder.dictionaryPage(header, data)
                : header.type === DATA_PAGE
                ? decoder.dataPage(header, data)
                : decoder.dataPageV2(header, page.subarray(0, levels), data)
            )
          ),
          Effect.mapError(locate(`${where}, page at byte ${headerAt}`))
        )
      }
    }
    return yield* Effect.mapError(attempt(() => decoder.finish(group.numRows)), locate(where))
  })
