/**
 * Arrow data types, fields and schemas, as plain immutable data.
 *
 * **Mental model**
 *
 * - A {@link Schema} is an ordered list of {@link Field}s plus key/value
 *   metadata. It describes every record batch of a table.
 * - A {@link Field} names a column, gives its {@link DataType}, and says
 *   whether it may hold nulls.
 * - A {@link DataType} is a tagged object. Nested types (`List`, `Struct`,
 *   `Map`, `Union`, `RunEndEncoded`, …) carry their child fields.
 * - Dictionary encoding is a type too: {@link Dictionary} wraps the value type
 *   with the type of its indices.
 *
 * Types follow the Arrow columnar format (format/Schema.fbs) one to one, so
 * every type the format defines can be described, read and written.
 *
 * **Example** (A schema with a nested column)
 *
 * ```ts import.meta.vitest
 * import { ArrowSchema } from "effect/arrow"
 *
 * const schema = ArrowSchema.make([
 *   ArrowSchema.field("id", ArrowSchema.int64, { nullable: false }),
 *   ArrowSchema.field("tags", ArrowSchema.list(ArrowSchema.field("item", ArrowSchema.utf8)))
 * ])
 *
 * schema.fields.map((f) => f.type._tag) // => ["Int", "List"]
 * ```
 *
 * @stability experimental
 * @since 4.1.5
 */

// -----------------------------------------------------------------------------
// Units
// -----------------------------------------------------------------------------

/**
 * The unit of a `Time`, `Timestamp` or `Duration` value.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export type TimeUnit = "second" | "millisecond" | "microsecond" | "nanosecond"

/**
 * The unit of a `Date` value: days (32-bit) or milliseconds (64-bit) since the
 * UNIX epoch.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export type DateUnit = "day" | "millisecond"

/**
 * The unit of an `Interval` value.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export type IntervalUnit = "yearMonth" | "dayTime" | "monthDayNano"

// -----------------------------------------------------------------------------
// Data types
// -----------------------------------------------------------------------------

/**
 * Every Arrow data type.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export type DataType =
  | Null
  | Bool
  | Int
  | Float
  | Decimal
  | Date
  | Time
  | Timestamp
  | Duration
  | Interval
  | Binary
  | LargeBinary
  | BinaryView
  | FixedSizeBinary
  | Utf8
  | LargeUtf8
  | Utf8View
  | List
  | LargeList
  | ListView
  | LargeListView
  | FixedSizeList
  | Struct
  | Map
  | Union
  | RunEndEncoded
  | Dictionary

/**
 * A column of nulls only, without buffers.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Null {
  readonly _tag: "Null"
}

/**
 * Booleans, stored as a bitmap.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Bool {
  readonly _tag: "Bool"
}

/**
 * Signed or unsigned integers of 8, 16, 32 or 64 bits.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Int {
  readonly _tag: "Int"
  readonly bitWidth: 8 | 16 | 32 | 64
  readonly signed: boolean
}

/**
 * IEEE 754 floating point numbers of 16, 32 or 64 bits.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Float {
  readonly _tag: "Float"
  readonly bitWidth: 16 | 32 | 64
}

/**
 * Fixed-point decimals stored as two's complement integers of `bitWidth`
 * bits, scaled by 10^`scale`.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Decimal {
  readonly _tag: "Decimal"
  readonly precision: number
  readonly scale: number
  readonly bitWidth: 32 | 64 | 128 | 256
}

/**
 * Calendar dates since the UNIX epoch.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Date {
  readonly _tag: "Date"
  readonly unit: DateUnit
}

/**
 * Time of day since midnight: 32-bit for seconds and milliseconds, 64-bit
 * for microseconds and nanoseconds.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Time {
  readonly _tag: "Time"
  readonly unit: TimeUnit
  readonly bitWidth: 32 | 64
}

/**
 * 64-bit instants since the UNIX epoch. With a `timezone` (IANA name or
 * offset) the values are UTC instants displayed in that zone; without one
 * they are wall-clock times in an unknown zone.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Timestamp {
  readonly _tag: "Timestamp"
  readonly unit: TimeUnit
  readonly timezone: string | undefined
}

/**
 * 64-bit elapsed time.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Duration {
  readonly _tag: "Duration"
  readonly unit: TimeUnit
}

/**
 * Calendar intervals: months (`yearMonth`), days and milliseconds
 * (`dayTime`), or months, days and nanoseconds (`monthDayNano`).
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Interval {
  readonly _tag: "Interval"
  readonly unit: IntervalUnit
}

/**
 * Variable-length bytes with 32-bit offsets.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Binary {
  readonly _tag: "Binary"
}

/**
 * Variable-length bytes with 64-bit offsets.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface LargeBinary {
  readonly _tag: "LargeBinary"
}

/**
 * Variable-length bytes stored as 16-byte views: short values inline, longer
 * ones in separate data buffers.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface BinaryView {
  readonly _tag: "BinaryView"
}

/**
 * Bytes of a fixed width.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface FixedSizeBinary {
  readonly _tag: "FixedSizeBinary"
  readonly byteWidth: number
}

/**
 * UTF-8 strings with 32-bit offsets.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Utf8 {
  readonly _tag: "Utf8"
}

/**
 * UTF-8 strings with 64-bit offsets.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface LargeUtf8 {
  readonly _tag: "LargeUtf8"
}

/**
 * UTF-8 strings stored as 16-byte views, like {@link BinaryView}.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Utf8View {
  readonly _tag: "Utf8View"
}

/**
 * Variable-length lists with 32-bit offsets.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface List {
  readonly _tag: "List"
  readonly child: Field
}

/**
 * Variable-length lists with 64-bit offsets.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface LargeList {
  readonly _tag: "LargeList"
  readonly child: Field
}

/**
 * Lists stored as 32-bit offsets and sizes, so slots may overlap or appear
 * out of order.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface ListView {
  readonly _tag: "ListView"
  readonly child: Field
}

/**
 * Lists stored as 64-bit offsets and sizes.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface LargeListView {
  readonly _tag: "LargeListView"
  readonly child: Field
}

/**
 * Lists of exactly `listSize` items each.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface FixedSizeList {
  readonly _tag: "FixedSizeList"
  readonly child: Field
  readonly listSize: number
}

/**
 * Records with one child field per member. Member names may repeat.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Struct {
  readonly _tag: "Struct"
  readonly fields: ReadonlyArray<Field>
}

/**
 * Lists of key/value entries. `entries` is a non-nullable struct field with
 * exactly two children, the key and the value; their names are kept as
 * written (conventionally `entries`, `key` and `value`).
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Map {
  readonly _tag: "Map"
  readonly entries: Field
  readonly keysSorted: boolean
}

/**
 * Values that are one of several member types. `typeIds[i]` is the type code
 * that marks a slot as holding member `fields[i]`.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Union {
  readonly _tag: "Union"
  readonly mode: "sparse" | "dense"
  readonly fields: ReadonlyArray<Field>
  readonly typeIds: ReadonlyArray<number>
}

/**
 * Runs of equal values: `runEnds` (non-nullable 16, 32 or 64-bit signed
 * integers) holds the end of each run, `values` the value of each run.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface RunEndEncoded {
  readonly _tag: "RunEndEncoded"
  readonly runEnds: Field
  readonly values: Field
}

/**
 * Dictionary-encoded values: each slot holds an index into a dictionary of
 * `valueType` values. `id` identifies the dictionary within an IPC stream or
 * file, so several fields may share one.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Dictionary {
  readonly _tag: "Dictionary"
  readonly id: number
  readonly indexType: Int
  readonly valueType: DataType
  readonly ordered: boolean
}

// -----------------------------------------------------------------------------
// Fields and schemas
// -----------------------------------------------------------------------------

/**
 * A named, typed column or child of a nested type.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Field {
  readonly name: string
  readonly type: DataType
  readonly nullable: boolean
  readonly metadata: ReadonlyMap<string, string>
}

/**
 * The fields of a table, plus key/value metadata.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Schema {
  readonly fields: ReadonlyArray<Field>
  readonly metadata: ReadonlyMap<string, string>
}

const emptyMetadata: ReadonlyMap<string, string> = new globalThis.Map()

/**
 * Creates a field. Fields are nullable unless `nullable: false` is given.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const field = (
  name: string,
  type: DataType,
  options?: {
    readonly nullable?: boolean | undefined
    readonly metadata?: ReadonlyMap<string, string> | undefined
  }
): Field => ({
  name,
  type,
  nullable: options?.nullable ?? true,
  metadata: options?.metadata ?? emptyMetadata
})

/**
 * Creates a schema.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const make = (
  fields: ReadonlyArray<Field>,
  metadata: ReadonlyMap<string, string> = emptyMetadata
): Schema => ({ fields, metadata })

// -----------------------------------------------------------------------------
// Type constructors
// -----------------------------------------------------------------------------

/**
 * The `Null` type.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const nullType: Null = { _tag: "Null" }

/**
 * The `Bool` type.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const bool: Bool = { _tag: "Bool" }

/**
 * Creates an integer type.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const int = (bitWidth: Int["bitWidth"], signed: boolean): Int => ({ _tag: "Int", bitWidth, signed })

/**
 * Signed 8-bit integers.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const int8: Int = int(8, true)
/**
 * Signed 16-bit integers.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const int16: Int = int(16, true)
/**
 * Signed 32-bit integers.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const int32: Int = int(32, true)
/**
 * Signed 64-bit integers.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const int64: Int = int(64, true)
/**
 * Unsigned 8-bit integers.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const uint8: Int = int(8, false)
/**
 * Unsigned 16-bit integers.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const uint16: Int = int(16, false)
/**
 * Unsigned 32-bit integers.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const uint32: Int = int(32, false)
/**
 * Unsigned 64-bit integers.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const uint64: Int = int(64, false)

/**
 * Half-precision (16-bit) floats.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const float16: Float = { _tag: "Float", bitWidth: 16 }
/**
 * Single-precision (32-bit) floats.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const float32: Float = { _tag: "Float", bitWidth: 32 }
/**
 * Double-precision (64-bit) floats.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const float64: Float = { _tag: "Float", bitWidth: 64 }

/**
 * Creates a decimal type. The bit width defaults to 128.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const decimal = (precision: number, scale: number, bitWidth: Decimal["bitWidth"] = 128): Decimal => ({
  _tag: "Decimal",
  precision,
  scale,
  bitWidth
})

/**
 * Creates a date type.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const date = (unit: DateUnit): Date => ({ _tag: "Date", unit })

/**
 * Creates a time-of-day type; the bit width follows from the unit.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const time = (unit: TimeUnit): Time => ({
  _tag: "Time",
  unit,
  bitWidth: unit === "second" || unit === "millisecond" ? 32 : 64
})

/**
 * Creates a timestamp type, optionally with a time zone.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const timestamp = (unit: TimeUnit, timezone?: string): Timestamp => ({ _tag: "Timestamp", unit, timezone })

/**
 * Creates a duration type.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const duration = (unit: TimeUnit): Duration => ({ _tag: "Duration", unit })

/**
 * Creates an interval type.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const interval = (unit: IntervalUnit): Interval => ({ _tag: "Interval", unit })

/**
 * Variable-length bytes with 32-bit offsets.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const binary: Binary = { _tag: "Binary" }
/**
 * Variable-length bytes with 64-bit offsets.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const largeBinary: LargeBinary = { _tag: "LargeBinary" }
/**
 * Variable-length bytes stored as views.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const binaryView: BinaryView = { _tag: "BinaryView" }
/**
 * Creates a fixed-width binary type.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const fixedSizeBinary = (byteWidth: number): FixedSizeBinary => ({ _tag: "FixedSizeBinary", byteWidth })
/**
 * UTF-8 strings with 32-bit offsets.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const utf8: Utf8 = { _tag: "Utf8" }
/**
 * UTF-8 strings with 64-bit offsets.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const largeUtf8: LargeUtf8 = { _tag: "LargeUtf8" }
/**
 * UTF-8 strings stored as views.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const utf8View: Utf8View = { _tag: "Utf8View" }

/**
 * Creates a list type.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const list = (child: Field): List => ({ _tag: "List", child })
/**
 * Creates a list type with 64-bit offsets.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const largeList = (child: Field): LargeList => ({ _tag: "LargeList", child })
/**
 * Creates a list view type.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const listView = (child: Field): ListView => ({ _tag: "ListView", child })
/**
 * Creates a list view type with 64-bit offsets and sizes.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const largeListView = (child: Field): LargeListView => ({ _tag: "LargeListView", child })
/**
 * Creates a fixed-size list type.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const fixedSizeList = (child: Field, listSize: number): FixedSizeList => ({
  _tag: "FixedSizeList",
  child,
  listSize
})

/**
 * Creates a struct type.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const struct = (fields: ReadonlyArray<Field>): Struct => ({ _tag: "Struct", fields })

/**
 * Creates a map type from its key and value fields, with the conventional
 * entry field name `entries`. The key field is made non-nullable.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const map = (key: Field, value: Field, options?: { readonly keysSorted?: boolean | undefined }): Map => ({
  _tag: "Map",
  entries: field("entries", struct([{ ...key, nullable: false }, value]), { nullable: false }),
  keysSorted: options?.keysSorted ?? false
})

/**
 * Creates a union type. Type codes default to the member positions.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const union = (
  mode: Union["mode"],
  fields: ReadonlyArray<Field>,
  typeIds: ReadonlyArray<number> = fields.map((_, i) => i)
): Union => ({ _tag: "Union", mode, fields, typeIds })

/**
 * Creates a run-end encoded type from the run-end integer type and the value
 * field.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const runEndEncoded = (runEnds: Int, values: Field): RunEndEncoded => ({
  _tag: "RunEndEncoded",
  runEnds: field("run_ends", runEnds, { nullable: false }),
  values
})

/**
 * Creates a dictionary type. Indices default to `int32`; `id` defaults to 0
 * and must be unique per dictionary within one IPC stream or file.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const dictionary = (
  valueType: DataType,
  options?: {
    readonly indexType?: Int | undefined
    readonly ordered?: boolean | undefined
    readonly id?: number | undefined
  }
): Dictionary => ({
  _tag: "Dictionary",
  id: options?.id ?? 0,
  indexType: options?.indexType ?? int32,
  valueType,
  ordered: options?.ordered ?? false
})
