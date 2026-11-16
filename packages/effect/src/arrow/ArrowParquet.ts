/**
 * Reads Apache Parquet files as Arrow record batches, one batch per row group.
 *
 * **Mental model**
 *
 * - {@link schema} maps the schema of a Parquet file to an Arrow schema,
 *   {@link readRecordBatch} reads one row group as a record batch of that
 *   schema, and {@link recordBatches} streams the row groups of a file.
 * - The data stays columnar. `Parquet.readColumn` returns validity bitmaps,
 *   offsets and typed values in Arrow's layout, so most columns become Arrow
 *   arrays that view those buffers. No value is created per row, and the
 *   table below says which mappings copy.
 * - The files are read through a `Parquet.Source`, so they can be in memory,
 *   on disk or behind HTTP range requests. Compressed pages need a
 *   `Parquet.Decompress` per codec in the `codecs` option.
 * - Every failure is a `Parquet.ParquetError`. A file that breaks the
 *   format fails with kind `Malformed`, and a valid file this module can't
 *   map to Arrow fails with `Unsupported`.
 *
 * **Example** (Reading a file batch by batch)
 *
 * ```ts
 * import { Effect, Stream } from "effect"
 * import { ArrowParquet } from "effect/arrow"
 * import { Parquet } from "effect/encoding"
 * import { readFile } from "node:fs/promises"
 *
 * const program = Effect.gen(function*() {
 *   const source = Parquet.fromBytes(new Uint8Array(yield* Effect.promise(() => readFile("data.parquet"))))
 *   yield* ArrowParquet.recordBatches(source, { columns: ["id", "price"] }).pipe(
 *     Stream.runForEach((batch) => Effect.log(`${batch.length} rows of ${batch.schema.fields.length} columns`))
 *   )
 * })
 * ```
 *
 * **Details**
 *
 * The mapping follows
 * [LogicalTypes.md of parquet-format 2.14.0](https://github.com/apache/parquet-format/blob/apache-parquet-format-2.14.0/LogicalTypes.md).
 * A logical type takes precedence over a converted type. "Shared" buffers are
 * the ones `Parquet.readColumn` returned, and "copy" is one new buffer for
 * the column chunk.
 *
 * | Physical type | Annotation | Arrow type | Values |
 * | --- | --- | --- | --- |
 * | `BOOLEAN` | none | `Bool` | shared |
 * | `INT32` | none, `INTEGER(32, signed)`, `INT_32` | `Int32` | shared |
 * | `INT32` | `INTEGER(32, unsigned)`, `UINT_32` | `UInt32` | shared |
 * | `INT32` | `INTEGER` of 8 or 16 bits, `INT_8`, `INT_16`, `UINT_8`, `UINT_16` | `Int8`, `Int16`, `UInt8`, `UInt16` | copy |
 * | `INT32` | `DATE` | `Date` in days | shared |
 * | `INT32` | `TIME(MILLIS)`, `TIME_MILLIS` | `Time` in milliseconds | shared |
 * | `INT32` | `DECIMAL(p, s)` | `Decimal(p, s)` of 32 bits | shared |
 * | `INT64` | none, `INTEGER(64, signed)`, `INT_64` | `Int64` | shared |
 * | `INT64` | `INTEGER(64, unsigned)`, `UINT_64` | `UInt64` | shared |
 * | `INT64` | `TIME(MICROS)`, `TIME(NANOS)`, `TIME_MICROS` | `Time` in that unit | shared |
 * | `INT64` | `TIMESTAMP(unit, isAdjustedToUTC)`, `TIMESTAMP_MILLIS`, `TIMESTAMP_MICROS` | `Timestamp` in that unit | shared |
 * | `INT64` | `DECIMAL(p, s)` | `Decimal(p, s)` of 64 bits | shared |
 * | `INT96` | none | `Timestamp` in nanoseconds, no timezone | copy |
 * | `FLOAT`, `DOUBLE` | none | `Float` of 32 and 64 bits | shared |
 * | `BYTE_ARRAY` | none, `BSON` | `Binary` | shared |
 * | `BYTE_ARRAY` | `STRING`, `UTF8`, `ENUM` | `Utf8` | shared |
 * | `BYTE_ARRAY` | `JSON` | `Utf8`, extension `arrow.json` | shared |
 * | `FIXED_LEN_BYTE_ARRAY(n)` | none | `FixedSizeBinary(n)` | shared |
 * | `FIXED_LEN_BYTE_ARRAY(16)` | `UUID` | `FixedSizeBinary(16)`, extension `arrow.uuid` | shared |
 * | `FIXED_LEN_BYTE_ARRAY(2)` | `FLOAT16` | `Float` of 16 bits | shared |
 * | `BYTE_ARRAY`, `FIXED_LEN_BYTE_ARRAY` | `DECIMAL(p, s)` | `Decimal(p, s)` of 128 bits for `p` up to 38, of 256 bits up to 76 | copy |
 * | any | `UNKNOWN` | `Null` | none |
 *
 * - A timestamp has timezone `"UTC"` when `isAdjustedToUTC` is true, which
 *   the spec also says of `TIMESTAMP_MILLIS` and `TIMESTAMP_MICROS`, and no
 *   timezone otherwise.
 * - `INT96` is read as Impala and Spark write it: 8 bytes of nanoseconds of
 *   the day, then 4 bytes of Julian day.
 * - Validity bitmaps, the offsets and bytes of `BYTE_ARRAY` values and list
 *   offsets are always shared.
 * - A field is nullable when its Parquet field is `OPTIONAL`. A `fieldId` is
 *   kept as the field metadata `PARQUET:field_id`, as Arrow C++ does. The
 *   file's key/value metadata becomes the schema metadata. When a key
 *   repeats, its last value wins.
 * - The annotations an Arrow type doesn't carry are kept as field metadata:
 *   `PARQUET:logical_type` is `ENUM` or `BSON` for those annotations, and a
 *   `Time` has `PARQUET:is_adjusted_to_utc` set to `true` or `false`.
 *
 * Nested fields:
 *
 * - A group without annotation is a `Struct`.
 * - A `LIST` group is a `List`. The element is found with the five
 *   backward-compatibility rules of the spec, so the 3-level structure and the
 *   legacy 2-level ones are read, whatever their fields are named.
 * - A `MAP` group, or a `MAP_KEY_VALUE` group that isn't the repeated group
 *   of a map, is a `Map`. Its key and value are the first and second field
 *   of the repeated group, whatever they are named. A repeated value, which
 *   the spec doesn't allow, is accepted and read as a list.
 * - A repeated field outside those is a required `List` of required
 *   elements.
 * - A null list has no elements, and the children of a null struct keep a
 *   slot for it.
 *
 * Checked on top of what `Parquet.readColumn` checks, each failing with
 * `Malformed`:
 *
 * - A narrow integer is in the range of its bit width, and a `DECIMAL` has
 *   at most `precision` digits and fits its Arrow width.
 * - Every slot of an `UNKNOWN` column is null.
 * - The columns of a struct, list or map agree on its nulls and list lengths,
 *   so the children of a nested array always have the lengths their parent
 *   says.
 * - A `LIST` or `MAP` has the structure the spec requires: one repeated
 *   field in a group that isn't itself repeated, and for a map a required key
 *   and at most one value.
 *
 * Buffers and limits:
 *
 * - A batch owns its buffers. `Parquet.readColumn` copies every value out of
 *   the pages, and out of what a `Parquet.Decompress` returns, so no buffer
 *   of a batch is a view of the source. The source can be changed or reused
 *   once a batch is returned.
 * - The `maxPageSize`, `maxValues` and `maxBinaryLength` options are those of
 *   `Parquet.readColumn` and apply to every column chunk. The copies made
 *   here are bounded by `maxValues`: at most 32 bytes per slot.
 * - Column chunks are read one after the other, in schema order.
 *
 * Not supported, failing with `Unsupported` when the column is selected:
 * `INTERVAL`, `VARIANT`, `GEOMETRY`, `GEOGRAPHY` and `FILE` annotations, an
 * `UNKNOWN` group, a `DECIMAL` of more than 76 digits, a map without values, a
 * group without fields, and an `INT96` timestamp outside the range of 64-bit
 * nanoseconds.
 *
 * **Gotchas**
 *
 * - The `ARROW:schema` key that Arrow writers store is not read, and is left
 *   out of the schema metadata. Types it would restore come back as their
 *   Parquet storage: a `LargeUtf8` as `Utf8`, a dictionary as its values, a
 *   `Date` in milliseconds as days.
 * - `ENUM` and `BSON` are not kept in the Arrow type, and neither is the
 *   `isAdjustedToUTC` of a `TIME`: they are only in the field metadata. The
 *   field ids of the repeated groups of lists and maps are dropped with those
 *   groups.
 * - An annotation `Parquet.readMetadata` left out, because it is unknown or
 *   not defined for the physical type, maps by physical type, and so does a
 *   converted type next to it: `UTF8` beside an unknown logical type is
 *   `Binary`.
 * - Times of day and dates are not checked to be in range, and `JSON` values
 *   are not parsed.
 * - Like the rest of `effect/arrow`, this assumes a little-endian platform.
 *
 * @stability experimental
 * @since 4.1.5
 */
import * as Effect from "../Effect.ts"
import * as Parquet from "../encoding/Parquet.ts"
import * as Result from "../Result.ts"
import * as Stream from "../Stream.ts"
import * as ArrowData from "./ArrowData.ts"
import * as ArrowExtension from "./ArrowExtension.ts"
import * as ArrowSchema from "./ArrowSchema.ts"
import * as ArrowTable from "./ArrowTable.ts"

// -----------------------------------------------------------------------------
// Errors
// -----------------------------------------------------------------------------

const fail = (kind: Parquet.ParquetError["kind"], message: string): never => {
  throw new Parquet.ParquetError({ kind, message })
}
const malformed = (message: string): never => fail("Malformed", message)
const unsupported = (message: string): never => fail("Unsupported", message)

/** Runs a mapping. Usage errors are bugs in the caller, so they stay thrown. */
const attempt = <A>(f: () => A): Result.Result<A, Parquet.ParquetError> => {
  try {
    return Result.succeed(f())
  } catch (e) {
    if (Parquet.isParquetError(e) && e.kind !== "Usage") return Result.fail(e)
    throw e
  }
}

// -----------------------------------------------------------------------------
// Leaf values
// -----------------------------------------------------------------------------

/** The slots of a leaf column chunk. */
interface Slots {
  readonly length: number
  /** The slots without a value: null themselves, or inside a null struct. */
  readonly nullCount: number
  /** A set bit is a slot with a value. `undefined` when every slot has one. */
  readonly validity: Uint8Array | undefined
  /** The column chunk, for error messages. */
  readonly where: string
}

/** Turns the values of a column chunk into the buffers of an Arrow array. */
type Convert = (values: Parquet.Values, slots: Slots) => ReadonlyArray<Uint8Array>

interface Leaf {
  readonly type: ArrowSchema.DataType
  readonly convert: Convert
  /** The canonical extension the field is marked with. */
  readonly extension?: string | undefined
}

const bytesOf = (array: ArrayBufferView): Uint8Array => new Uint8Array(array.buffer, array.byteOffset, array.byteLength)

/** The 32-bit little-endian limbs of `array`. */
const limbsOf = (array: ArrayBufferView): Uint32Array =>
  new Uint32Array(array.buffer, array.byteOffset, array.byteLength >> 2)

const hasValue = (slots: Slots, i: number): boolean =>
  slots.validity === undefined || (slots.validity[i >> 3] & (1 << (i & 7))) !== 0

/** The buffers of a layout Parquet and Arrow share. */
const shared: Convert = (values) =>
  values.type === "BYTE_ARRAY"
    ? [bytesOf(values.offsets), values.values]
    : [bytesOf(values.values)]

const view = (type: ArrowSchema.DataType, extension?: string): Leaf => ({ type, convert: shared, extension })

const unknown: Leaf = {
  type: ArrowSchema.nullType,
  convert: (_, slots) =>
    slots.nullCount === slots.length
      ? []
      : malformed(`${slots.where}: an UNKNOWN column has ${slots.length - slots.nullCount} values that are not null`)
}

/** Copies INT32 values into a narrower integer array, failing on the ones that don't fit. */
const narrow = (bitWidth: 8 | 16, signed: boolean): Leaf => {
  const Narrow = signed ? (bitWidth === 8 ? Int8Array : Int16Array) : bitWidth === 8 ? Uint8Array : Uint16Array
  const min = signed ? -(2 ** (bitWidth - 1)) : 0
  const max = min + 2 ** bitWidth - 1
  return {
    type: ArrowSchema.int(bitWidth, signed),
    convert: (values, slots) => {
      const from = values.values as Int32Array
      const out = new Narrow(from.length)
      for (let i = 0; i < from.length; i++) {
        const value = from[i]
        if (value < min || value > max) {
          malformed(
            `${slots.where}: value ${i} is ${value}, outside the ${bitWidth} ${
              signed ? "signed" : "unsigned"
            } bits of its INTEGER`
          )
        }
        out[i] = value
      }
      return [bytesOf(out)]
    }
  }
}

const TWO_32 = 4294967296

/** `10 ** precision` in `n` little-endian 32-bit limbs. */
const powerOfTen = (precision: number, n: number): Uint32Array => {
  const out = new Uint32Array(n)
  out[0] = 1
  for (let i = 0; i < precision; i++) {
    let carry = 0
    for (let k = 0; k < n; k++) {
      const product = out[k] * 10 + carry
      carry = Math.floor(product / TWO_32)
      out[k] = product
    }
  }
  return out
}

/** The two's complement of `limbs`. */
const negated = (limbs: Uint32Array): Uint32Array => {
  const out = new Uint32Array(limbs.length)
  let carry = 1
  for (let k = 0; k < limbs.length; k++) {
    const sum = (~limbs[k] >>> 0) + carry
    carry = sum >= TWO_32 ? 1 : 0
    out[k] = sum
  }
  return out
}

/**
 * Fails unless every value of `limbs`, two's complement integers of `n`
 * little-endian limbs each, is strictly between `-(10 ** precision)` and
 * `10 ** precision`. Values of one sign order like their limbs, read as
 * unsigned from the most significant.
 */
const checkPrecision = (limbs: Uint32Array, n: number, precision: number, where: string): void => {
  const max = powerOfTen(precision, n)
  const min = negated(max)
  for (let at = 0; at < limbs.length; at += n) {
    const negative = limbs[at + n - 1] >= 0x80000000
    const bound = negative ? min : max
    let k = n - 1
    while (k > 0 && limbs[at + k] === bound[k]) k--
    if (negative ? limbs[at + k] <= bound[k] : limbs[at + k] >= bound[k]) {
      malformed(`${where}: value ${at / n} has more digits than the precision of its DECIMAL (${precision})`)
    }
  }
}

/** A DECIMAL stored as INT32 or INT64, which Arrow stores the same way. */
const integerDecimal = (annotation: Decimal, bitWidth: 32 | 64): Leaf => ({
  type: ArrowSchema.decimal(annotation.precision, annotation.scale, bitWidth),
  convert: (values, slots) => {
    checkPrecision(limbsOf(values.values), bitWidth / 32, annotation.precision, slots.where)
    return shared(values, slots)
  }
})

/**
 * Writes the big-endian two's complement integer `from[start, end)` to the
 * zeroed `out[at, at + width)`, little-endian and sign-extended. Returns
 * whether it fits.
 */
const writeLittleEndian = (
  from: Uint8Array,
  start: number,
  end: number,
  out: Uint8Array,
  at: number,
  width: number
): boolean => {
  const sign = from[start] >= 0x80 ? 0xff : 0
  let first = start
  if (end - start > width) {
    first = end - width
    // The bytes that don't fit must repeat the sign, and the rest must keep it.
    for (let k = start; k < first; k++) if (from[k] !== sign) return false
    if ((from[first] >= 0x80) !== (sign !== 0)) return false
  }
  let to = at
  for (let k = end - 1; k >= first; k--) out[to++] = from[k]
  if (sign !== 0) out.fill(sign, to, at + width)
  return true
}

/** A DECIMAL stored as big-endian bytes, copied into Arrow's little-endian 128 or 256 bits. */
const bytesDecimal = (annotation: Decimal, path: string): Leaf => {
  const { precision, scale } = annotation
  if (precision > 76) {
    unsupported(`column "${path}" is a DECIMAL of ${precision} digits, more than the 76 of a 256-bit decimal`)
  }
  const bitWidth = precision <= 38 ? 128 : 256
  const width = bitWidth / 8
  return {
    type: ArrowSchema.decimal(precision, scale, bitWidth),
    convert: (values, slots) => {
      const out = new Uint8Array(slots.length * width)
      const tooWide = (i: number) => malformed(`${slots.where}: value ${i} does not fit in ${bitWidth} bits`)
      if (values.type === "FIXED_LEN_BYTE_ARRAY") {
        const size = values.width
        for (let i = 0; i < slots.length; i++) {
          if (!writeLittleEndian(values.values, i * size, (i + 1) * size, out, i * width, width)) tooWide(i)
        }
      } else {
        const offsets = (values as Extract<Parquet.Values, { readonly type: "BYTE_ARRAY" }>).offsets
        for (let i = 0; i < slots.length; i++) {
          const start = offsets[i]
          const end = offsets[i + 1]
          if (start === end) {
            // A null slot is empty and stays zero. A value needs at least its sign.
            if (hasValue(slots, i)) malformed(`${slots.where}: value ${i} is a DECIMAL without bytes`)
          } else if (!writeLittleEndian(values.values as Uint8Array, start, end, out, i * width, width)) tooWide(i)
        }
      }
      checkPrecision(limbsOf(out), width / 4, precision, slots.where)
      return [out]
    }
  }
}

const JULIAN_DAY_OF_EPOCH = 2440588
// The nanoseconds of a day, 86_400_000_000_000, as two 32-bit limbs.
const DAY_HIGH = 20116
const DAY_LOW = 2437873664
const BIG_NANOS_PER_DAY = BigInt(86_400_000_000_000)
const BIG_INT64_MIN = -(BigInt(1) << BigInt(63))
const BIG_INT64_MAX = (BigInt(1) << BigInt(63)) - BigInt(1)

/**
 * INT96 timestamps as Impala and Spark write them: the nanoseconds of the day
 * in 8 bytes, then the Julian day in 4, both little-endian.
 */
const int96: Leaf = {
  type: ArrowSchema.timestamp("nanosecond"),
  convert: (values, slots) => {
    const from = bytesOf(values.values)
    const view = new DataView(from.buffer, from.byteOffset, from.byteLength)
    const out = new Int32Array(slots.length * 2)
    const wide = new DataView(out.buffer)
    for (let i = 0; i < slots.length; i++) {
      // A null slot holds zero bytes, which are not a timestamp in range.
      if (!hasValue(slots, i)) continue
      const nanosLow = view.getUint32(i * 12, true)
      const nanosHigh = view.getUint32(i * 12 + 4, true)
      const days = view.getUint32(i * 12 + 8, true) - JULIAN_DAY_OF_EPOCH
      if (days >= -106750 && days <= 106750 && nanosHigh < 0x8000) {
        // Within these bounds the timestamp is below 2^63 and every product is exact.
        const low = days * DAY_LOW + nanosLow
        const carry = Math.floor(low / TWO_32)
        out[i * 2] = low - carry * TWO_32
        out[i * 2 + 1] = days * DAY_HIGH + nanosHigh + carry
      } else {
        // The last days of the range, and whatever is outside it.
        const nanos = BigInt(days) * BIG_NANOS_PER_DAY + view.getBigUint64(i * 12, true)
        if (nanos < BIG_INT64_MIN || nanos > BIG_INT64_MAX) {
          unsupported(`${slots.where}: INT96 timestamp ${i} is outside the range of 64-bit nanoseconds`)
        }
        wide.setBigInt64(i * 8, nanos, true)
      }
    }
    return [bytesOf(out)]
  }
}

// -----------------------------------------------------------------------------
// Annotations
// -----------------------------------------------------------------------------

type Decimal = Extract<Parquet.LogicalType, { readonly type: "DECIMAL" }>

/** A logical type, or a converted type that no logical type replaced. */
type Annotation = Parquet.LogicalType | { readonly type: "INTERVAL" | "MAP_KEY_VALUE" }

const utc = (type: "TIME" | "TIMESTAMP", unit: "MILLIS" | "MICROS"): Annotation => ({
  type,
  isAdjustedToUTC: true,
  unit
})
const integer = (bitWidth: number, isSigned: boolean): Annotation => ({ type: "INTEGER", bitWidth, isSigned })

/**
 * The annotation of a schema node: its logical type, or its converted type as
 * the logical type LogicalTypes.md gives for it. `undefined` for a node without
 * one, or with one `Parquet.readMetadata` left out.
 */
const annotationOf = (node: Parquet.SchemaNode): Annotation | undefined => {
  if (node.logicalType !== undefined) return node.logicalType
  switch (node.convertedType) {
    case "UTF8":
      return { type: "STRING" }
    case "DECIMAL":
      // readMetadata requires the precision of a DECIMAL it keeps.
      return { type: "DECIMAL", scale: node.scale ?? 0, precision: node.precision! }
    case "TIME_MILLIS":
      return utc("TIME", "MILLIS")
    case "TIME_MICROS":
      return utc("TIME", "MICROS")
    case "TIMESTAMP_MILLIS":
      return utc("TIMESTAMP", "MILLIS")
    case "TIMESTAMP_MICROS":
      return utc("TIMESTAMP", "MICROS")
    case "INT_8":
      return integer(8, true)
    case "INT_16":
      return integer(16, true)
    case "INT_32":
      return integer(32, true)
    case "INT_64":
      return integer(64, true)
    case "UINT_8":
      return integer(8, false)
    case "UINT_16":
      return integer(16, false)
    case "UINT_32":
      return integer(32, false)
    case "UINT_64":
      return integer(64, false)
    case "MAP":
    case "MAP_KEY_VALUE":
    case "LIST":
    case "ENUM":
    case "DATE":
    case "JSON":
    case "BSON":
    case "INTERVAL":
      return { type: node.convertedType }
    default:
      return undefined
  }
}

const timeUnits = { MILLIS: "millisecond", MICROS: "microsecond", NANOS: "nanosecond" } as const

/**
 * Maps a leaf by its physical type and annotation. `Parquet.readMetadata` keeps
 * an annotation only on the physical type the spec defines it for, so the
 * parameters of a kept one need no second check.
 */
const leafOf = (node: Parquet.SchemaNode, path: string): Leaf => {
  const annotation = annotationOf(node)
  if (annotation?.type === "UNKNOWN") return unknown
  switch (node.physicalType) {
    case "BOOLEAN":
      if (annotation === undefined) return view(ArrowSchema.bool)
      break
    case "FLOAT":
      if (annotation === undefined) return view(ArrowSchema.float32)
      break
    case "DOUBLE":
      if (annotation === undefined) return view(ArrowSchema.float64)
      break
    case "INT96":
      if (annotation === undefined) return int96
      break
    case "INT32":
      switch (annotation?.type) {
        case undefined:
          return view(ArrowSchema.int32)
        case "INTEGER":
          return annotation.bitWidth === 8 || annotation.bitWidth === 16
            ? narrow(annotation.bitWidth, annotation.isSigned)
            : view(ArrowSchema.int(32, annotation.isSigned))
        case "DATE":
          return view(ArrowSchema.date("day"))
        case "TIME":
          return view(ArrowSchema.time(timeUnits[annotation.unit]))
        case "DECIMAL":
          return integerDecimal(annotation, 32)
      }
      break
    case "INT64":
      switch (annotation?.type) {
        case undefined:
          return view(ArrowSchema.int64)
        case "INTEGER":
          return view(ArrowSchema.int(64, annotation.isSigned))
        case "TIME":
          return view(ArrowSchema.time(timeUnits[annotation.unit]))
        case "TIMESTAMP":
          return view(ArrowSchema.timestamp(timeUnits[annotation.unit], annotation.isAdjustedToUTC ? "UTC" : undefined))
        case "DECIMAL":
          return integerDecimal(annotation, 64)
      }
      break
    case "BYTE_ARRAY":
      switch (annotation?.type) {
        case undefined:
        case "BSON":
          return view(ArrowSchema.binary)
        case "STRING":
        case "ENUM":
          return view(ArrowSchema.utf8)
        case "JSON":
          return view(ArrowSchema.utf8, "arrow.json")
        case "DECIMAL":
          return bytesDecimal(annotation, path)
      }
      break
    case "FIXED_LEN_BYTE_ARRAY":
      switch (annotation?.type) {
        case undefined:
          return view(ArrowSchema.fixedSizeBinary(node.typeLength!))
        case "UUID":
          return view(ArrowSchema.fixedSizeBinary(16), "arrow.uuid")
        case "FLOAT16":
          return view(ArrowSchema.float16)
        case "DECIMAL":
          return bytesDecimal(annotation, path)
      }
      break
  }
  return unsupported(
    `column "${path}" is a ${node.physicalType} annotated ${annotation?.type}, which is not supported`
  )
}

// -----------------------------------------------------------------------------
// Schema
// -----------------------------------------------------------------------------

/**
 * How the Arrow array of one field is put together from the column chunks
 * below its schema node. `column` is the first of them, and the depths are
 * indexes into its layers.
 */
type Node =
  | {
    readonly _tag: "Leaf"
    readonly type: ArrowSchema.DataType
    readonly column: number
    readonly convert: Convert
  }
  | {
    readonly _tag: "Struct"
    readonly type: ArrowSchema.DataType
    readonly column: number
    /** The layer of the group. */
    readonly depth: number
    readonly children: ReadonlyArray<Node>
  }
  | {
    readonly _tag: "List"
    readonly type: ArrowSchema.DataType
    readonly column: number
    /** The layer of the optional group around the repeated field, if any. */
    readonly validity: number | undefined
    /** The layer of the repeated field. */
    readonly offsets: number
    readonly child: Node
  }

interface Mapped {
  readonly field: ArrowSchema.Field
  readonly node: Node
}

/** The next column chunk, in schema order. */
interface Cursor {
  column: number
}

const isOptional = (node: Parquet.SchemaNode): boolean => node.repetition === "OPTIONAL"

const fieldOf = (node: Parquet.SchemaNode, type: ArrowSchema.DataType, extension?: string): ArrowSchema.Field => {
  const metadata = new Map(extension === undefined ? undefined : ArrowExtension.metadata(extension))
  if (node.fieldId !== undefined) metadata.set("PARQUET:field_id", String(node.fieldId))
  // The annotations the Arrow type doesn't tell apart
  const annotation = node.children === undefined ? annotationOf(node) : undefined
  if (annotation?.type === "ENUM" || annotation?.type === "BSON") {
    metadata.set("PARQUET:logical_type", annotation.type)
  } else if (annotation?.type === "TIME") {
    metadata.set("PARQUET:is_adjusted_to_utc", String(annotation.isAdjustedToUTC))
  }
  return ArrowSchema.field(node.name, type, { nullable: isOptional(node), metadata })
}

const listOf = (
  node: Parquet.SchemaNode,
  type: ArrowSchema.DataType,
  column: number,
  depth: number,
  child: Node
): Mapped => ({
  field: fieldOf(node, type),
  node: { _tag: "List", type, column, validity: isOptional(node) ? depth : undefined, offsets: depth + 1, child }
})

/** The single repeated field of a LIST or MAP group. */
const repeatedOf = (group: Parquet.SchemaNode, path: string, kind: string): Parquet.SchemaNode => {
  const children = group.children!
  if (children.length !== 1) malformed(`${kind} group "${path}" has ${children.length} fields instead of one`)
  if (children[0].repetition !== "REPEATED") {
    malformed(`the field of ${kind} group "${path}" is ${children[0].repetition}, not REPEATED`)
  }
  return children[0]
}

/**
 * Maps a LIST group, whose layer is `depth`. `nested` is whether the group is
 * itself the repeated field of a list, which only the 2-level structure
 * allows.
 */
const list = (
  group: Parquet.SchemaNode,
  depth: number,
  path: string,
  cursor: Cursor,
  nested: boolean
): Mapped => {
  const repeated = repeatedOf(group, path, "LIST")
  const at = `${path}.${repeated.name}`
  const column = cursor.column
  const fields = repeated.children
  const annotation = fields === undefined ? undefined : annotationOf(repeated)?.type
  let element: Mapped
  if (annotation === "LIST") {
    // A repeated LIST group is a 2-level list, and the element of this one.
    element = list(repeated, depth + 1, at, cursor, true)
  } else if (annotation === "MAP" || annotation === "MAP_KEY_VALUE") {
    return malformed(`${annotation} group "${at}" is repeated`)
  } else if (fields?.length === 0) {
    return malformed(`the repeated group "${at}" of a LIST has no fields`)
  } else if (
    // The backward-compatibility rules 1 to 4: the repeated field is the element.
    fields === undefined ||
    fields.length > 1 ||
    fields[0].repetition === "REPEATED" ||
    repeated.name === "array" ||
    repeated.name === `${group.name}_tuple`
  ) {
    element = value(repeated, depth + 1, at, cursor)
  } else if (nested) {
    return malformed(`LIST group "${path}" is repeated, but is not a 2-level list`)
  } else {
    // Rule 5: the field of the repeated group is the element.
    element = value(fields[0], depth + 2, `${at}.${fields[0].name}`, cursor)
  }
  return listOf(group, ArrowSchema.list(element.field), column, depth, element.node)
}

/** Maps a MAP group, whose layer is `depth`. */
const map = (group: Parquet.SchemaNode, depth: number, path: string, cursor: Cursor): Mapped => {
  const repeated = repeatedOf(group, path, "MAP")
  const at = `${path}.${repeated.name}`
  const fields = repeated.children
  if (fields === undefined) return malformed(`the repeated field "${at}" of a MAP is not a group`)
  if (fields.length === 0 || fields.length > 2) {
    return malformed(`the repeated group "${at}" of a MAP has ${fields.length} fields instead of a key and a value`)
  }
  if (fields[0].repetition !== "REQUIRED") {
    return malformed(`the key "${at}.${fields[0].name}" of a MAP is ${fields[0].repetition}, not REQUIRED`)
  }
  if (fields.length === 1) return unsupported(`MAP group "${path}" has keys but no values`)
  const column = cursor.column
  const [key, item] = fields.map((field) => fieldAt(field, depth + 2, `${at}.${field.name}`, cursor))
  const type = ArrowSchema.map(key.field, item.field)
  return listOf(group, type, column, depth, {
    _tag: "Struct",
    type: type.entries.type,
    column,
    depth: depth + 1,
    children: [key.node, item.node]
  })
}

/** Maps a node as one value per slot of its layer, whatever its repetition. */
const value = (node: Parquet.SchemaNode, depth: number, path: string, cursor: Cursor): Mapped => {
  if (node.children === undefined) {
    const leaf = leafOf(node, path)
    return {
      field: fieldOf(node, leaf.type, leaf.extension),
      node: { _tag: "Leaf", type: leaf.type, column: cursor.column++, convert: leaf.convert }
    }
  }
  const annotation = annotationOf(node)?.type
  switch (annotation) {
    case "LIST":
      return list(node, depth, path, cursor, false)
    case "MAP":
    case "MAP_KEY_VALUE":
      return map(node, depth, path, cursor)
    case undefined: {
      // Without a column there is nothing to tell how many slots it has.
      if (node.children.length === 0) return unsupported(`group "${path}" has no fields`)
      const column = cursor.column
      const children = node.children.map((child) => fieldAt(child, depth + 1, `${path}.${child.name}`, cursor))
      const type = ArrowSchema.struct(children.map((child) => child.field))
      return {
        field: fieldOf(node, type),
        node: { _tag: "Struct", type, column, depth, children: children.map((child) => child.node) }
      }
    }
    default:
      return unsupported(`group "${path}" is annotated ${annotation}, which is not supported`)
  }
}

/** Maps the field of a group: a value, or for a repeated field a required list of required values. */
const fieldAt = (node: Parquet.SchemaNode, depth: number, path: string, cursor: Cursor): Mapped => {
  if (node.repetition !== "REPEATED") return value(node, depth, path, cursor)
  const annotation = node.children === undefined ? undefined : annotationOf(node)?.type
  if (annotation === "LIST" || annotation === "MAP" || annotation === "MAP_KEY_VALUE") {
    return malformed(`${annotation} group "${path}" is repeated`)
  }
  const column = cursor.column
  const element = value(node, depth, path, cursor)
  return listOf(node, ArrowSchema.list(element.field), column, depth - 1, element.node)
}

const leafCount = (node: Parquet.SchemaNode): number =>
  node.children === undefined ? 1 : node.children.reduce((count, child) => count + leafCount(child), 0)

interface Plan {
  readonly schema: ArrowSchema.Schema
  /** One per field of `schema`. */
  readonly nodes: ReadonlyArray<Node>
  /** The column chunks the fields need, as indexes into `FileMetaData.columns`. */
  readonly columns: ReadonlyArray<number>
}

const planOf = (metadata: Parquet.FileMetaData, names: ReadonlyArray<string> | undefined): Plan => {
  const roots = metadata.schema.children ?? []
  const first: Array<number> = []
  let count = 0
  for (const root of roots) {
    first.push(count)
    count += leafCount(root)
  }
  const selected = names === undefined ? roots.map((_, i) => i) : names.map((name) => {
    const index = roots.findIndex((root) => root.name === name)
    return index === -1 ? fail("Usage", `the file has no column "${name}"`) : index
  })
  const columns = new Set<number>()
  const mapped = selected.map((index) => {
    const cursor: Cursor = { column: first[index] }
    const out = fieldAt(roots[index], 0, roots[index].name, cursor)
    for (let column = first[index]; column < cursor.column; column++) columns.add(column)
    return out
  })
  const keyValues = new Map<string, string>()
  for (const { key, value } of metadata.keyValueMetadata) {
    if (key !== "ARROW:schema") keyValues.set(key, value ?? "")
  }
  return {
    schema: ArrowSchema.make(mapped.map((field) => field.field), keyValues),
    nodes: mapped.map((field) => field.node),
    columns: Array.from(columns)
  }
}

/**
 * Maps the schema of a Parquet file to an Arrow schema, as the module
 * documentation describes.
 *
 * **Details**
 *
 * `columns` selects top-level fields by name, in the order given. With
 * repeated names in the file, the first field of that name. A field that is
 * not selected is not mapped, so a file with a type this module doesn't
 * support can still be read without it.
 *
 * **Gotchas**
 *
 * - A name in `columns` that the file doesn't have is a bug in the caller:
 *   this throws a `Parquet.ParquetError` of kind `Usage` instead of returning
 *   a failure.
 *
 * **Example** (Mapping a schema)
 *
 * ```ts
 * import { Effect } from "effect"
 * import { ArrowParquet } from "effect/arrow"
 * import { Parquet } from "effect/encoding"
 *
 * const fields = (source: Parquet.Source) =>
 *   Effect.gen(function*() {
 *     const metadata = yield* Parquet.readMetadata(source)
 *     const schema = yield* Effect.fromResult(ArrowParquet.schema(metadata))
 *     return schema.fields.map((field) => `${field.name}: ${field.type._tag}`)
 *   })
 * ```
 *
 * @stability experimental
 * @category schemas
 * @since 4.1.5
 */
export const schema = (
  metadata: Parquet.FileMetaData,
  options?: {
    readonly columns?: ReadonlyArray<string> | undefined
  }
): Result.Result<ArrowSchema.Schema, Parquet.ParquetError> =>
  Result.map(attempt(() => planOf(metadata, options?.columns)), (plan) => plan.schema)

// -----------------------------------------------------------------------------
// Record batches
// -----------------------------------------------------------------------------

const sameElements = (a: Uint8Array | Int32Array | undefined, b: Uint8Array | Int32Array | undefined): boolean => {
  if (a === undefined || b === undefined) return a === b
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

/**
 * Fails unless two column chunks agree on the layers of the nodes they share.
 * Each is decoded from its own levels, so only this makes the children of a
 * nested array as long as their parent says.
 */
const checkShared = (a: Parquet.Column, b: Parquet.Column, rowGroup: number): void => {
  for (let i = 0; i < a.layers.length && i < b.layers.length && a.layers[i].node === b.layers[i].node; i++) {
    const left = a.layers[i]
    const right = b.layers[i]
    if (
      left.length !== right.length ||
      !sameElements(left.validity, right.validity) ||
      !sameElements(left.offsets, right.offsets)
    ) {
      const [x, y, shared] = [a.descriptor.path, b.descriptor.path, a.descriptor.path.slice(0, i + 1)]
        .map((path) => path.join("."))
      malformed(`columns "${x}" and "${y}" of row group ${rowGroup} disagree about "${shared}"`)
    }
  }
}

/** The layer that says which slots of a leaf have a value: the nearest optional node up to the leaf's list. */
const nullsOf = (column: Parquet.Column): Parquet.Layer | undefined => {
  for (let i = column.layers.length - 1; i >= 0; i--) {
    const layer = column.layers[i]
    if (layer.node.repetition === "OPTIONAL") return layer
    if (layer.node.repetition === "REPEATED") return undefined
  }
}

/** The validity of an Arrow array, which has a bitmap only when a slot is null. */
const validityOf = (layer: Parquet.Layer | undefined): {
  readonly validity: Uint8Array | undefined
  readonly nullCount: number
} =>
  layer === undefined || layer.nullCount === 0
    ? { validity: undefined, nullCount: 0 }
    : { validity: layer.validity, nullCount: layer.nullCount }

const assemble = (node: Node, columns: ReadonlyArray<Parquet.Column>, rowGroup: number): ArrowData.ArrowData => {
  const column = columns[node.column]
  const type = node.type
  switch (node._tag) {
    case "Leaf": {
      const layer = column.layers[column.layers.length - 1]
      const length = layer.length
      const nulls = validityOf(nullsOf(column))
      const buffers = node.convert(column.values, {
        length,
        ...nulls,
        where: `column "${column.descriptor.path.join(".")}" of row group ${rowGroup}`
      })
      return type._tag === "Null"
        ? ArrowData.make({ type, length, nullCount: length })
        : ArrowData.make({ type, length, ...validityOf(layer), buffers })
    }
    case "Struct": {
      const layer = column.layers[node.depth]
      return ArrowData.make({
        type,
        length: layer.length,
        ...validityOf(layer),
        children: node.children.map((child) => assemble(child, columns, rowGroup))
      })
    }
    case "List": {
      const offsets = column.layers[node.offsets].offsets!
      return ArrowData.make({
        type,
        length: offsets.length - 1,
        ...validityOf(node.validity === undefined ? undefined : column.layers[node.validity]),
        buffers: [bytesOf(offsets)],
        children: [assemble(node.child, columns, rowGroup)]
      })
    }
  }
}

type ReadOptions = Omit<Parameters<typeof Parquet.readColumn>[2], "column">

const readGroup = <E, R>(
  source: Parquet.Source<E, R>,
  metadata: Parquet.FileMetaData,
  plan: Plan,
  options: ReadOptions
): Effect.Effect<ArrowTable.RecordBatch, Parquet.ParquetError | E, R> =>
  Effect.gen(function*() {
    const rowGroup = options.rowGroup
    const columns: Array<Parquet.Column> = []
    let previous: Parquet.Column | undefined
    for (const index of plan.columns) {
      const column = yield* Parquet.readColumn(source, metadata, { ...options, column: index })
      if (previous !== undefined) yield* Effect.fromResult(attempt(() => checkShared(previous!, column, rowGroup)))
      columns[index] = previous = column
    }
    return yield* Effect.fromResult(attempt(() =>
      ArrowTable.recordBatch(
        plan.schema,
        metadata.rowGroups[rowGroup].numRows,
        plan.nodes.map((node) => assemble(node, columns, rowGroup))
      )
    ))
  })

/**
 * Reads one row group of a Parquet file as a record batch of the schema
 * {@link schema} gives for the same `columns`.
 *
 * **Details**
 *
 * The batch has one row per row of the row group. `columns` selects
 * top-level fields by name, in the order given, and only their column chunks
 * are read. `codecs`, `maxPageSize`, `maxValues` and `maxBinaryLength` are
 * the options of `Parquet.readColumn`, applied to every column chunk.
 *
 * **Gotchas**
 *
 * - `rowGroup` must be an index into `metadata.rowGroups` and `columns` must
 *   name fields of the file. Anything else is a defect, not a failure.
 *
 * **Example** (Reading the first row group)
 *
 * ```ts
 * import { Effect } from "effect"
 * import { ArrowParquet } from "effect/arrow"
 * import { Parquet } from "effect/encoding"
 *
 * const firstBatch = (source: Parquet.Source) =>
 *   Effect.gen(function*() {
 *     const metadata = yield* Parquet.readMetadata(source)
 *     return yield* ArrowParquet.readRecordBatch(source, metadata, { rowGroup: 0 })
 *   })
 * ```
 *
 * @see {@link recordBatches} for every row group of a file
 * @stability experimental
 * @category decoding
 * @since 4.1.5
 */
export const readRecordBatch = <E, R>(
  source: Parquet.Source<E, R>,
  metadata: Parquet.FileMetaData,
  options: {
    readonly rowGroup: number
    readonly columns?: ReadonlyArray<string> | undefined
    readonly codecs?:
      | { readonly [K in Exclude<Parquet.CompressionCodec, "UNCOMPRESSED">]?: Parquet.Decompress | undefined }
      | undefined
    readonly maxPageSize?: number | undefined
    readonly maxValues?: number | undefined
    readonly maxBinaryLength?: number | undefined
  }
): Effect.Effect<ArrowTable.RecordBatch, Parquet.ParquetError | E, R> =>
  Effect.gen(function*() {
    if (!Number.isInteger(options.rowGroup) || metadata.rowGroups[options.rowGroup] === undefined) {
      return fail("Usage", `the file has no row group ${options.rowGroup}`)
    }
    const plan = yield* Effect.fromResult(attempt(() => planOf(metadata, options.columns)))
    return yield* readGroup(source, metadata, plan, options)
  })

/**
 * Reads a Parquet file as a stream of record batches: its footer, then one
 * batch per row group, in file order.
 *
 * **Details**
 *
 * A row group is read when its batch is pulled, so taking the first batches
 * of a stream doesn't read the others. Batches are not split or merged: each
 * has the rows of its row group, and a file without row groups emits nothing.
 * Every batch has the schema {@link schema} gives for the same `columns`.
 *
 * `maxFooterLength` and `maxDepth` are the options of `Parquet.readMetadata`,
 * the others those of {@link readRecordBatch}.
 *
 * **Gotchas**
 *
 * - The schema is mapped before the first row group is read, so a selected
 *   column of an unsupported type fails the stream at once, also when the file
 *   has no rows.
 *
 * **Example** (Counting the rows of two columns)
 *
 * ```ts
 * import { Stream } from "effect"
 * import { ArrowParquet } from "effect/arrow"
 * import { Parquet } from "effect/encoding"
 *
 * const countRows = (source: Parquet.Source) =>
 *   ArrowParquet.recordBatches(source, { columns: ["id", "price"] }).pipe(
 *     Stream.runFold(() => 0, (rows, batch) => rows + batch.length)
 *   )
 * ```
 *
 * @see {@link readRecordBatch} for one row group of a file whose footer is already read
 * @stability experimental
 * @category decoding
 * @since 4.1.5
 */
export const recordBatches = <E, R>(
  source: Parquet.Source<E, R>,
  options?: {
    readonly columns?: ReadonlyArray<string> | undefined
    readonly codecs?:
      | { readonly [K in Exclude<Parquet.CompressionCodec, "UNCOMPRESSED">]?: Parquet.Decompress | undefined }
      | undefined
    readonly maxPageSize?: number | undefined
    readonly maxValues?: number | undefined
    readonly maxBinaryLength?: number | undefined
    readonly maxFooterLength?: number | undefined
    readonly maxDepth?: number | undefined
  }
): Stream.Stream<ArrowTable.RecordBatch, Parquet.ParquetError | E, R> =>
  Stream.unwrap(Effect.gen(function*() {
    const metadata = yield* Parquet.readMetadata(source, options)
    const plan = yield* Effect.fromResult(attempt(() => planOf(metadata, options?.columns)))
    return Stream.unfold(0, (rowGroup) =>
      rowGroup === metadata.rowGroups.length
        ? Effect.succeed(undefined)
        : Effect.map(
          readGroup(source, metadata, plan, { ...options, rowGroup }),
          (batch) => [batch, rowGroup + 1] as const
        ))
  }))
