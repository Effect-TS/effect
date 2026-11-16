import { assert, describe, it } from "@effect/vitest"
import { Effect, Option, Result, Stream } from "effect"
import { ArrowColumn, ArrowData, ArrowIpc, ArrowParquet, type ArrowSchema as S, ArrowTable } from "effect/arrow"
import * as Hex from "effect/encoding/Hex"
import * as Parquet from "effect/encoding/Parquet"
import { readFileSync } from "node:fs"
import { gunzipSync } from "node:zlib"
import {
  type Annotation,
  Bool,
  bytes,
  dataPage,
  decimal,
  dies,
  element,
  failsWith,
  file,
  files,
  flat,
  gzip,
  int32s,
  integer,
  lengthPrefixed,
  List,
  logical,
  OPTIONAL,
  plainBytes,
  REPEATED,
  REQUIRED,
  root,
  runs,
  Str,
  STRING,
  Struct,
  Type,
  type V
} from "../utils/parquet.ts"

// Source pins, exact assertions and exclusions: ./CONFORMANCE.md (ARROW-PARQUET-*).
// Two kinds of evidence, as in the Parquet reader tests: files written by
// pyarrow and compared with gold values computed from their source data, and
// synthetic files for what pyarrow doesn't write.

type Gold = null | boolean | number | string | ReadonlyArray<Gold> | { readonly [key: string]: Gold }
interface GoldColumn {
  readonly path: ReadonlyArray<string>
  readonly physicalType: Parquet.PhysicalType
  readonly logicalType: Parquet.LogicalType | null
  readonly values: ReadonlyArray<Gold>
}
interface GoldFile {
  readonly name: string
  readonly rowGroups: ReadonlyArray<{ readonly numRows: number }>
  readonly columns: ReadonlyArray<GoldColumn>
}

const fixtureBytes = (name: string) =>
  new Uint8Array(readFileSync(new URL("../fixtures/parquet/" + name, import.meta.url)))
const fixtureJson = (name: string) => JSON.parse(new TextDecoder().decode(fixtureBytes(name)))
const gold: { readonly writer: string; readonly files: ReadonlyArray<GoldFile> } = fixtureJson("gold.json")
const logicalGold: {
  readonly columns: ReadonlyArray<{ readonly name: string; readonly values: ReadonlyArray<Gold> }>
} = fixtureJson("logical.gold.json")

const unhex = (hex: string) => Result.getOrThrow(Hex.decode(hex))
const codecs = { GZIP: gzip }

type ReadOptions = Parameters<typeof ArrowParquet.recordBatches>[1]
const batchesOf = (bytes: Uint8Array, options?: ReadOptions) =>
  Stream.runCollect(ArrowParquet.recordBatches(Parquet.fromBytes(bytes), options))
const schemaOf = (bytes: Uint8Array, columns?: ReadonlyArray<string>) =>
  Effect.map(Parquet.readMetadata(Parquet.fromBytes(bytes)), (metadata) => ArrowParquet.schema(metadata, { columns }))

/** Storage values as JSON: 64-bit integers and decimals as decimal strings, bytes as hex, a map as its entries. */
const plain = (value: unknown): Gold => {
  if (typeof value === "bigint") return String(value)
  if (value instanceof Uint8Array) return Hex.encode(value)
  if (value instanceof Map) return Array.from(value, ([k, v]) => [plain(k), plain(v)])
  if (Array.isArray(value)) return value.map(plain)
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, plain(v)])) as any
  }
  return value as Gold
}
const storage = { representation: "storage" } as const
const valuesOf = (field: S.Field, data: ArrowData.ArrowData) =>
  ArrowColumn.toArray(ArrowColumn.make(field, [data], storage)).map(plain)
/** The storage values of every field, across the batches. */
const columnsOf = (batches: ReadonlyArray<ArrowTable.RecordBatch>, schema: S.Schema) =>
  schema.fields.map((field, i) => batches.flatMap((batch) => valuesOf(field, batch.columns[i])))
/** The only column of a file with one row group. */
const columnOf = (bytes: Uint8Array) =>
  Effect.map(batchesOf(bytes), ([batch]) => {
    const [field] = batch.schema.fields
    const [data] = batch.columns
    return { field, data, values: valuesOf(field, data) }
  })

const schemaFailsWith = Effect.fnUntraced(function*(
  bytes: Uint8Array,
  kind: Parquet.ParquetError["kind"],
  message: RegExp
) {
  yield* failsWith(Effect.flatMap(schemaOf(bytes), Effect.fromResult), kind, message)
})

// ---------------------------------------------------------------------------
// Gold values of the pyarrow fixtures, as Arrow stores them
// ---------------------------------------------------------------------------

const NANOS_PER_DAY = 86_400_000_000_000n
/** A gold leaf, which is the Parquet physical value, as the storage value of its Arrow type. */
const expectedLeaf = (column: GoldColumn, value: Exclude<Gold, ReadonlyArray<Gold> | null>): Gold => {
  if (column.logicalType?.type === "STRING") return new TextDecoder().decode(unhex(value as string))
  if (column.logicalType?.type === "DECIMAL" && column.physicalType === "FIXED_LEN_BYTE_ARRAY") {
    const hex = value as string
    return String(BigInt.asIntN(hex.length * 4, BigInt("0x" + hex)))
  }
  if (column.physicalType === "INT96") {
    const view = new DataView(unhex(value as string).buffer)
    return String(BigInt(view.getUint32(8, true) - 2440588) * NANOS_PER_DAY + view.getBigUint64(0, true))
  }
  return value
}
const expected = (column: GoldColumn, value: Gold): Gold =>
  value === null
    ? null
    : Array.isArray(value)
    ? value.map((v) => expected(column, v))
    : expectedLeaf(column, value as any)

/** The values of a field at a leaf path, as gold.json has them: a list or a map takes two path components. */
const project = (value: Gold, type: S.DataType, path: ReadonlyArray<string>): Gold => {
  if (value === null || path.length === 0) return value
  switch (type._tag) {
    case "Struct": {
      const index = type.fields.findIndex((field) => field.name === path[0])
      return project((value as any)[path[0]], type.fields[index].type, path.slice(1))
    }
    case "List":
      return (value as ReadonlyArray<Gold>).map((item) => project(item, type.child.type, path.slice(2)))
    case "Map": {
      const index = path[1] === "key" ? 0 : 1
      const entries = type.entries.type as S.Struct
      return (value as ReadonlyArray<ReadonlyArray<Gold>>).map((entry) =>
        project(entry[index], entries.fields[index].type, path.slice(2))
      )
    }
    default:
      return assert.fail("unexpected " + type._tag + " at " + path.join("."))
  }
}

/** A short form of a field, to compare schemas with. */
const show = (field: S.Field): string => {
  const type = field.type
  const params = (): string => {
    switch (type._tag) {
      case "Int":
        return (type.signed ? "" : "u") + type.bitWidth
      case "Float":
        return String(type.bitWidth)
      case "Decimal":
        return type.bitWidth + "(" + type.precision + "," + type.scale + ")"
      case "Date":
      case "Time":
        return type.unit
      case "Timestamp":
        return type.unit + (type.timezone === undefined ? "" : "," + type.timezone)
      case "FixedSizeBinary":
        return String(type.byteWidth)
      case "List":
        return show(type.child)
      case "Struct":
        return type.fields.map(show).join(", ")
      case "Map":
        return (type.entries.type as S.Struct).fields.map(show).join(", ")
      default:
        return ""
    }
  }
  const inner = params()
  const extension = field.metadata.get("ARROW:extension:name")
  return field.name + ": " + type._tag + (inner === "" ? "" : "<" + inner + ">") + (field.nullable ? "" : " not null") +
    (extension === undefined ? "" : " [" + extension + "]")
}
const showSchema = (schema: S.Schema) => schema.fields.map(show)

// ---------------------------------------------------------------------------
// Synthetic files
// ---------------------------------------------------------------------------

const LIST = logical(3)
const MAP = logical(2)
const converted = (convertedType: number): Annotation => ({ convertedType })
const Converted = {
  UTF8: 0,
  MAP_KEY_VALUE: 2,
  TIME_MILLIS: 7,
  TIME_MICROS: 8,
  TIMESTAMP_MILLIS: 9,
  TIMESTAMP_MICROS: 10,
  UINT_32: 13,
  UINT_64: 14,
  INT_64: 18,
  JSON: 19,
  INTERVAL: 21
}

const int64s = (...values: ReadonlyArray<bigint>) => new Uint8Array(BigInt64Array.from(values).buffer)
const binaries = (...values: ReadonlyArray<ReadonlyArray<number>>) => plainBytes(values)
// Definition levels 1, 0, 1 of a column with one optional node.
const someNull = lengthPrefixed(runs(1, [1, 1], [0, 1], [1, 1]))

/** A file with one optional column `x` of three rows: a value, null, a value. */
const optional = (type: number, data: Uint8Array, annotation?: Annotation) =>
  flat({
    type,
    repetition: OPTIONAL,
    numRows: 3,
    typeLength: annotation?.typeLength,
    annotation,
    pages: [dataPage(3, bytes(someNull, data))]
  })

/** An INT96: the nanoseconds of the day, then the Julian day. */
const int96 = (julianDay: number, nanos: bigint) => {
  const out = new Uint8Array(12)
  const view = new DataView(out.buffer)
  view.setBigUint64(0, nanos, true)
  view.setUint32(8, julianDay, true)
  return out
}

interface Node {
  readonly name: string
  readonly repetition: number
  readonly type?: number | undefined
  readonly annotation?: Annotation | undefined
  readonly children?: ReadonlyArray<Node> | undefined
}
const group = (
  name: string,
  repetition: number,
  children: ReadonlyArray<Node>,
  annotation?: Node["annotation"]
): Node => ({ name, repetition, children, annotation })
const leaf = (name: string, repetition: number, type = Type.INT32, annotation?: Node["annotation"]): Node => ({
  name,
  repetition,
  type,
  annotation
})
const elementsOf = (node: Node): ReadonlyArray<V> => [
  element(node.name, {
    type: node.type,
    repetition: node.repetition,
    children: node.children?.length,
    ...node.annotation
  }),
  ...(node.children ?? []).flatMap(elementsOf)
]
const leavesOf = (
  node: Node,
  path: ReadonlyArray<string> = []
): ReadonlyArray<readonly [number, ReadonlyArray<string>]> =>
  node.children === undefined
    ? [[node.type!, [...path, node.name]]]
    : node.children.flatMap((child) => leavesOf(child, [...path, node.name]))

/**
 * A file with these fields. Without `pages` it has one row group without
 * rows, and otherwise one page list per leaf, in schema order.
 */
const tree = (fields: ReadonlyArray<Node>, numRows = 0, pages: ReadonlyArray<readonly [number, Uint8Array]> = []) =>
  file({
    schema: [root(fields.length), ...fields.flatMap(elementsOf)],
    numRows,
    chunks: fields.flatMap((field) => leavesOf(field)).map(([type, path], i) => ({
      type,
      path,
      numValues: pages[i]?.[0] ?? 0,
      pages: pages[i] === undefined ? [] : [dataPage(pages[i][0], pages[i][1])]
    }))
  })

/** A file with a required INT32 column `x` and one row group per entry of `groups`. */
const rowGroups = (groups: ReadonlyArray<ReadonlyArray<number>>) =>
  files({
    schema: [root(1), element("x", { type: Type.INT32, repetition: REQUIRED })],
    rowGroups: groups.map((values) => ({
      numRows: values.length,
      chunks: [{
        type: Type.INT32,
        path: ["x"],
        numValues: values.length,
        pages: values.length === 0 ? [] : [dataPage(values.length, int32s(...values))]
      }]
    }))
  })

describe("ArrowParquet", () => {
  describe("pyarrow " + gold.writer + " fixtures", () => {
    // ARROW-PARQUET-001 (interop): one batch per row group, every leaf value against gold.json.
    for (const goldFile of gold.files) {
      it.effect(goldFile.name, () =>
        Effect.gen(function*() {
          const bytes = fixtureBytes(goldFile.name)
          const batches = yield* batchesOf(bytes, { codecs })
          assert.deepStrictEqual(batches.map((batch) => batch.length), goldFile.rowGroups.map((group) => group.numRows))
          const schema = Result.getOrThrow(yield* schemaOf(bytes))
          for (const batch of batches) assert.deepStrictEqual(batch.schema, schema)
          const columns = columnsOf(batches, schema)
          for (const column of goldFile.columns) {
            const index = schema.fields.findIndex((field) => field.name === column.path[0])
            assert.deepStrictEqual(
              columns[index].map((value) => project(value, schema.fields[index].type, column.path.slice(1))),
              column.values.map((value) => expected(column, value)),
              column.path.join(".")
            )
          }
        }))
    }

    // ARROW-PARQUET-002 (normative + local): the Arrow types of annotated leaves and nested groups.
    it.effect("maps the schemas of plain.parquet, int96.parquet and nested.parquet", () =>
      Effect.gen(function*() {
        const fields = (name: string) =>
          Effect.map(schemaOf(fixtureBytes(name)), (schema) => showSchema(Result.getOrThrow(schema)))
        assert.deepStrictEqual(yield* fields("plain.parquet"), [
          "bool: Bool",
          "int32: Int<32> not null",
          "int64: Int<64>",
          "float32: Float<32>",
          "float64: Float<64>",
          "string: Utf8",
          "binary: Binary",
          "fixed_size_binary: FixedSizeBinary<4>",
          "int8: Int<8>",
          "uint16: Int<u16>",
          "date32: Date<day>",
          "timestamp_ms_utc: Timestamp<millisecond,UTC>",
          "time64_us: Time<microsecond>",
          "decimal: Decimal<128(9,2)>"
        ])
        assert.deepStrictEqual(yield* fields("int96.parquet"), ["timestamp_ns: Timestamp<nanosecond>"])
        assert.deepStrictEqual(yield* fields("nested.parquet"), [
          "ints: List<element: Int<32>>",
          "nested_strings: List<element: List<element: Utf8>>",
          "struct: Struct<a: Int<32> not null, b: List<element: Int<64>>>",
          "map: Map<key: Utf8 not null, value: Int<32>>",
          "required_struct: Struct<x: Float<64>> not null",
          "structs: List<element: Struct<s: Utf8, t: Bool>>"
        ])
      }))

    // ARROW-PARQUET-003 (interop + local): logical types pyarrow writes, extension metadata, typed buffers.
    it.effect("maps the logical types of logical.parquet and reads their values from typed arrays", () =>
      Effect.gen(function*() {
        const batches = yield* batchesOf(fixtureBytes("logical.parquet"))
        const schema = batches[0].schema
        assert.deepStrictEqual(batches.map((batch) => batch.length), [3, 1])
        assert.deepStrictEqual(showSchema(schema), [
          "uint8: Int<u8>",
          "int16: Int<16>",
          "uint32: Int<u32>",
          "uint64: Int<u64>",
          "time32_ms: Time<millisecond>",
          "time64_ns: Time<nanosecond>",
          "timestamp_ms: Timestamp<millisecond>",
          "timestamp_us: Timestamp<microsecond>",
          "timestamp_ns_utc: Timestamp<nanosecond,UTC>",
          "float16: Float<16>",
          "uuid: FixedSizeBinary<16> [arrow.uuid]",
          "json: Utf8 [arrow.json]",
          // pyarrow restores large_string from ARROW:schema, which is not read
          "large_string: Utf8",
          "decimal_int32: Decimal<32(9,2)>",
          "decimal_int64: Decimal<64(18,4)>",
          "decimal128: Decimal<128(38,10)>",
          "decimal256: Decimal<256(76,0)>",
          "null: Null"
        ])
        assert.deepStrictEqual(Array.from(schema.metadata.keys()), [])
        assert.deepStrictEqual(
          columnsOf(batches, schema),
          logicalGold.columns.map((column) => column.values),
          "storage values"
        )

        // The buffers are the column's values, with a slot for the null of row 2
        const [first] = batches
        const values = (name: string) =>
          Option.getOrThrow(ArrowData.values(first.columns[schema.fields.findIndex((field) => field.name === name)]))
        assert.deepStrictEqual(values("uint8"), Uint8Array.of(0, 255, 0))
        assert.deepStrictEqual(values("int16"), Int16Array.of(-32768, 32767, 0))
        assert.deepStrictEqual(values("uint32"), Uint32Array.of(0, 4294967295, 0))
        assert.deepStrictEqual(values("uint64"), BigUint64Array.of(0n, 18446744073709551615n, 0n))
        assert.deepStrictEqual(values("time32_ms"), Int32Array.of(0, 86_399_999, 0))
        assert.deepStrictEqual(values("timestamp_us"), BigInt64Array.of(-(2n ** 63n), 2n ** 63n - 1n, 0n))
        assert.deepStrictEqual(values("decimal_int32"), Int32Array.of(999_999_999, -999_999_999, 0))
        assert.deepStrictEqual(values("decimal_int64"), BigInt64Array.of(10n ** 18n - 1n, 1n - 10n ** 18n, 0n))
        const nulls = first.columns[schema.fields.length - 1]
        assert.deepStrictEqual([nulls.length, nulls.nullCount, nulls.buffers.length], [3, 3, 0])
        for (const [i, data] of first.columns.entries()) {
          assert.strictEqual(data.length, 3, schema.fields[i].name)
          assert.strictEqual(data.nullCount, data.type._tag === "Null" ? 3 : 1, schema.fields[i].name)
          if (data.type._tag === "Decimal") {
            assert.strictEqual(data.buffers[0].length, 3 * data.type.bitWidth / 8, schema.fields[i].name)
          }
        }
      }))
  })

  describe("leaf mappings of synthetic files", () => {
    // ARROW-PARQUET-004 (normative + local): converted types, ENUM, BSON, JSON, BYTE_ARRAY decimals, INT96.
    it.effect("maps converted types, and the logical types pyarrow does not write", () =>
      Effect.gen(function*() {
        const cases: ReadonlyArray<readonly [file: Uint8Array, field: string, values: ReadonlyArray<Gold>]> = [
          [optional(Type.INT32, int32s(1, -3), integer(32, true)), "x: Int<32>", [1, null, -3]],
          [optional(Type.INT32, int32s(-1, 1), converted(Converted.UINT_32)), "x: Int<u32>", [4294967295, null, 1]],
          [optional(Type.INT32, int32s(5, 6), converted(Converted.TIME_MILLIS)), "x: Time<millisecond>", [5, null, 6]],
          [optional(Type.INT64, int64s(1n, -3n), integer(64, true)), "x: Int<64>", ["1", null, "-3"]],
          [optional(Type.INT64, int64s(1n, -3n), converted(Converted.INT_64)), "x: Int<64>", ["1", null, "-3"]],
          [
            optional(Type.INT64, int64s(-1n, 1n), converted(Converted.UINT_64)),
            "x: Int<u64>",
            ["18446744073709551615", null, "1"]
          ],
          [optional(Type.INT64, int64s(5n, 6n), converted(Converted.TIME_MICROS)), "x: Time<microsecond>", [
            "5",
            null,
            "6"
          ]],
          [
            optional(Type.INT64, int64s(5n, -6n), converted(Converted.TIMESTAMP_MILLIS)),
            "x: Timestamp<millisecond,UTC>",
            ["5", null, "-6"]
          ],
          [
            optional(Type.INT64, int64s(5n, -6n), converted(Converted.TIMESTAMP_MICROS)),
            "x: Timestamp<microsecond,UTC>",
            ["5", null, "-6"]
          ],
          // 1970-01-02T00:00:00.000000005 and the nanosecond before the epoch
          [
            optional(Type.INT96, bytes(int96(2440589, 5n), int96(2440587, NANOS_PER_DAY - 1n))),
            "x: Timestamp<nanosecond>",
            ["86400000000005", null, "-1"]
          ],
          // The first and the last nanosecond 64 bits reach
          [
            optional(
              Type.INT96,
              bytes(int96(2440588 - 106752, 763145224192n), int96(2440588 + 106751, 85636854775807n))
            ),
            "x: Timestamp<nanosecond>",
            ["-9223372036854775808", null, "9223372036854775807"]
          ],
          [optional(Type.BYTE_ARRAY, binaries([0x61], [0x62, 0x63]), converted(Converted.UTF8)), "x: Utf8", [
            "a",
            null,
            "bc"
          ]],
          [optional(Type.BYTE_ARRAY, binaries([0x61], [0x62, 0x63]), logical(4)), "x: Utf8", ["a", null, "bc"]],
          [
            optional(Type.BYTE_ARRAY, binaries([0x31], [0x5b, 0x5d]), converted(Converted.JSON)),
            "x: Utf8 [arrow.json]",
            ["1", null, "[]"]
          ],
          [optional(Type.BYTE_ARRAY, binaries([0xff], []), logical(13)), "x: Binary", ["ff", null, ""]],
          // UTF8 maps only without a logical type: next to one that is unknown, or not for BYTE_ARRAY, the
          // physical type does (LogicalTypes.md 53-57, 59-64)
          [
            optional(Type.BYTE_ARRAY, binaries([0xff], []), { ...logical(99), ...converted(Converted.UTF8) }),
            "x: Binary",
            ["ff", null, ""]
          ],
          [
            optional(Type.BYTE_ARRAY, binaries([0xff], []), { ...logical(6), ...converted(Converted.UTF8) }),
            "x: Binary",
            ["ff", null, ""]
          ],
          // One byte, and seventeen bytes that repeat the sign
          [
            optional(Type.BYTE_ARRAY, binaries([0x7f], [...new Array(16).fill(0xff), 0x85]), decimal(38, 2)),
            "x: Decimal<128(38,2)>",
            ["127", null, "-123"]
          ],
          [
            optional(Type.BYTE_ARRAY, binaries([0xff, 0x00], [0x01, ...new Array(31).fill(0)]), decimal(76, 0)),
            "x: Decimal<256(76,0)>",
            ["-256", null, String(2n ** 248n)]
          ],
          // The largest and smallest values of a precision
          [optional(Type.INT32, int32s(99, -99), decimal(2, 0)), "x: Decimal<32(2,0)>", ["99", null, "-99"]],
          [
            optional(Type.FIXED_LEN_BYTE_ARRAY, Uint8Array.of(0x27, 0x0f, 0xd8, 0xf1), {
              ...decimal(4, 1),
              typeLength: 2
            }),
            "x: Decimal<128(4,1)>",
            ["9999", null, "-9999"]
          ]
        ]
        for (const [file, field, values] of cases) {
          const column = yield* columnOf(file)
          assert.strictEqual(show(column.field), field)
          assert.deepStrictEqual(column.values, values, field)
          assert.strictEqual(column.data.nullCount, 1, field)
        }
      }))

    // ARROW-PARQUET-005 (local): field ids and key/value metadata.
    it.effect("keeps field ids and the file's key/value metadata, except ARROW:schema", () =>
      Effect.gen(function*() {
        const keyValue = (key: string, value?: string) =>
          Struct({ 1: Str(key), 2: value === undefined ? undefined : Str(value) })
        const schema = Result.getOrThrow(
          yield* schemaOf(file({
            schema: [
              root(2),
              element("a", { type: Type.INT32, repetition: REQUIRED, fieldId: 7 }),
              element("b", {
                type: Type.FIXED_LEN_BYTE_ARRAY,
                typeLength: 16,
                repetition: OPTIONAL,
                fieldId: 0,
                ...logical(14)
              })
            ],
            numRows: 0,
            chunks: [
              { type: Type.INT32, path: ["a"], numValues: 0, pages: [] },
              { type: Type.FIXED_LEN_BYTE_ARRAY, path: ["b"], numValues: 0, pages: [] }
            ],
            metadata: {
              5: List("Struct", [keyValue("writer", "test"), keyValue("ARROW:schema", "AAAA"), keyValue("flag")])
            }
          }))
        )
        assert.deepStrictEqual(schema.fields.map((field) => Array.from(field.metadata)), [
          [["PARQUET:field_id", "7"]],
          [["ARROW:extension:name", "arrow.uuid"], ["PARQUET:field_id", "0"]]
        ])
        assert.deepStrictEqual(Array.from(schema.metadata), [["writer", "test"], ["flag", ""]])

        // The annotations that map to the same Arrow type as another one, or as none
        const time = (isAdjustedToUTC: boolean) =>
          logical(7, { 1: Bool(isAdjustedToUTC), 2: Struct({ 1: Struct({}) }) })
        const leaves: ReadonlyArray<
          readonly [type: number, Annotation, metadata: ReadonlyArray<readonly [string, string]>]
        > = [
          [Type.BYTE_ARRAY, STRING, []],
          [Type.BYTE_ARRAY, logical(4), [["PARQUET:logical_type", "ENUM"]]],
          [Type.BYTE_ARRAY, converted(4), [["PARQUET:logical_type", "ENUM"]]],
          [Type.BYTE_ARRAY, {}, []],
          [Type.BYTE_ARRAY, logical(13), [["PARQUET:logical_type", "BSON"]]],
          [Type.BYTE_ARRAY, converted(20), [["PARQUET:logical_type", "BSON"]]],
          [Type.INT32, time(true), [["PARQUET:is_adjusted_to_utc", "true"]]],
          [Type.INT32, time(false), [["PARQUET:is_adjusted_to_utc", "false"]]],
          [Type.INT32, converted(Converted.TIME_MILLIS), [["PARQUET:is_adjusted_to_utc", "true"]]]
        ]
        const annotated = Result.getOrThrow(
          yield* schemaOf(tree(leaves.map(([type, annotation], i) => leaf(`f${i}`, REQUIRED, type, annotation))))
        )
        assert.deepStrictEqual(
          annotated.fields.map((field) => [show(field), Array.from(field.metadata)]),
          leaves.map(([type, , metadata], i) => [
            `f${i}: ${type === Type.INT32 ? "Time<millisecond>" : i < 3 ? "Utf8" : "Binary"} not null`,
            metadata
          ])
        )
      }))

    // ARROW-PARQUET-006 (local): range, precision and width checks.
    it.effect("rejects values outside their narrow integer, decimal or timestamp type", () =>
      Effect.gen(function*() {
        const fails = (bytes: Uint8Array, kind: Parquet.ParquetError["kind"], message: RegExp) =>
          failsWith(batchesOf(bytes), kind, message)
        yield* fails(
          optional(Type.INT32, int32s(127, 128), integer(8, true)),
          "Malformed",
          /value 2 is 128, outside the 8 signed/
        )
        yield* fails(optional(Type.INT32, int32s(-129, 0), integer(8, true)), "Malformed", /value 0 is -129/)
        yield* fails(optional(Type.INT32, int32s(256, 0), integer(8, false)), "Malformed", /outside the 8 unsigned/)
        yield* fails(optional(Type.INT32, int32s(0, 32768), integer(16, true)), "Malformed", /outside the 16 signed/)
        yield* fails(optional(Type.INT32, int32s(-1, 0), integer(16, false)), "Malformed", /outside the 16 unsigned/)

        const digits = /more digits than the precision of its DECIMAL/
        yield* fails(optional(Type.INT32, int32s(99, 100), decimal(2, 0)), "Malformed", digits)
        yield* fails(optional(Type.INT32, int32s(-100, 0), decimal(2, 0)), "Malformed", digits)
        yield* fails(optional(Type.INT64, int64s(10n ** 18n, 0n), decimal(18, 0)), "Malformed", digits)
        yield* fails(optional(Type.INT64, int64s(0n, -(10n ** 18n)), decimal(18, 0)), "Malformed", digits)
        // 10000 and -10000 in two bytes
        yield* fails(
          optional(Type.FIXED_LEN_BYTE_ARRAY, Uint8Array.of(0x27, 0x10, 0, 0), { ...decimal(4, 1), typeLength: 2 }),
          "Malformed",
          digits
        )
        yield* fails(
          optional(Type.FIXED_LEN_BYTE_ARRAY, Uint8Array.of(0, 0, 0xd8, 0xf0), { ...decimal(4, 1), typeLength: 2 }),
          "Malformed",
          digits
        )
        yield* fails(optional(Type.BYTE_ARRAY, binaries([0x03, 0xe8], [0]), decimal(3, 0)), "Malformed", digits)
        // 10^38 fits 128 bits, but not 38 digits
        yield* fails(
          optional(
            Type.BYTE_ARRAY,
            binaries([0], Array.from(unhex("4b3b4ca85a86c47a098a224000000000"))),
            decimal(38, 0)
          ),
          "Malformed",
          digits
        )

        const width = /value 0 does not fit in 128 bits/
        // 2^128, and 2^127 behind a zero sign byte
        yield* fails(
          optional(Type.BYTE_ARRAY, binaries([1, ...new Array(16).fill(0)], [0]), decimal(38, 0)),
          "Malformed",
          width
        )
        yield* fails(
          optional(Type.BYTE_ARRAY, binaries([0, 0x80, ...new Array(15).fill(0)], [0]), decimal(38, 0)),
          "Malformed",
          width
        )
        yield* fails(
          optional(Type.BYTE_ARRAY, binaries([0xff, 0x7f, ...new Array(15).fill(0xff)], [0]), decimal(38, 0)),
          "Malformed",
          width
        )
        yield* fails(
          optional(Type.BYTE_ARRAY, binaries([0], []), decimal(38, 0)),
          "Malformed",
          /value 2 is a DECIMAL without bytes/
        )
        yield* schemaFailsWith(
          optional(Type.BYTE_ARRAY, binaries([0], [0]), decimal(77, 0)),
          "Unsupported",
          /"x" is a DECIMAL of 77/
        )

        // The day after the last one 64-bit nanoseconds reach, and the one before the first
        const range = /INT96 timestamp \d is outside the range of 64-bit nanoseconds/
        yield* fails(optional(Type.INT96, bytes(int96(2440588 + 106752, 0n), int96(0, 0n))), "Unsupported", range)
        yield* fails(optional(Type.INT96, bytes(int96(2440588, 0n), int96(2440588 - 106753, 0n))), "Unsupported", range)
        yield* fails(optional(Type.INT96, bytes(int96(0xffffffff, 0n), int96(0, 0n))), "Unsupported", range)
      }))

    // ARROW-PARQUET-007 (normative + local): UNKNOWN is always null.
    it.effect("reads an UNKNOWN column as nulls, and rejects one with a value", () =>
      Effect.gen(function*() {
        const allNull = flat({
          type: Type.INT32,
          repetition: OPTIONAL,
          numRows: 3,
          annotation: logical(11),
          pages: [dataPage(3, lengthPrefixed(runs(1, [0, 3])))]
        })
        const column = yield* columnOf(allNull)
        assert.strictEqual(show(column.field), "x: Null")
        assert.deepStrictEqual(column.values, [null, null, null])
        yield* failsWith(
          batchesOf(optional(Type.INT32, int32s(1, 3), logical(11))),
          "Malformed",
          /an UNKNOWN column has 2 values that are not null/
        )
      }))

    // ARROW-PARQUET-008 (local): unsupported annotations fail only when selected.
    it.effect("fails with Unsupported on a selected column of an unsupported annotation", () =>
      Effect.gen(function*() {
        const ok = leaf("ok", REQUIRED)
        const binary = [leaf("metadata", REQUIRED, Type.BYTE_ARRAY), leaf("value", REQUIRED, Type.BYTE_ARRAY)]
        const cases: ReadonlyArray<readonly [Node, RegExp]> = [
          [
            leaf("x", REQUIRED, Type.FIXED_LEN_BYTE_ARRAY, { ...converted(Converted.INTERVAL), typeLength: 12 }),
            /column "x" is a FIXED_LEN_BYTE_ARRAY annotated INTERVAL/
          ],
          [leaf("x", REQUIRED, Type.BYTE_ARRAY, logical(17)), /column "x" is a BYTE_ARRAY annotated GEOMETRY/],
          [leaf("x", REQUIRED, Type.BYTE_ARRAY, logical(18)), /column "x" is a BYTE_ARRAY annotated GEOGRAPHY/],
          [group("x", REQUIRED, binary, logical(16)), /group "x" is annotated VARIANT/],
          [group("x", REQUIRED, binary, logical(19)), /group "x" is annotated FILE/],
          [group("x", OPTIONAL, binary, logical(11)), /group "x" is annotated UNKNOWN/],
          [group("x", REQUIRED, []), /group "x" has no fields/]
        ]
        for (const [node, message] of cases) {
          const bytes = tree([node, ok])
          yield* schemaFailsWith(bytes, "Unsupported", message)
          yield* failsWith(batchesOf(bytes), "Unsupported", message)
          // The other column of the file can still be read
          assert.deepStrictEqual(showSchema(Result.getOrThrow(yield* schemaOf(bytes, ["ok"]))), [
            "ok: Int<32> not null"
          ])
          assert.deepStrictEqual((yield* batchesOf(bytes, { columns: ["ok"] })).map((batch) => batch.length), [0])
        }
      }))
  })

  describe("nested fields", () => {
    const string = (name: string, repetition: number) => leaf(name, repetition, Type.BYTE_ARRAY, STRING)
    const fieldsOf = (...fields: ReadonlyArray<Node>) =>
      Effect.map(schemaOf(tree(fields)), (schema) => showSchema(Result.getOrThrow(schema)))

    // ARROW-PARQUET-009 (normative): LogicalTypes.md Lists, backward-compatibility rules 1 to 5.
    it.effect("maps LIST groups by the backward-compatibility rules, and repeated fields without annotation", () =>
      Effect.gen(function*() {
        // The examples of LogicalTypes.md, in its order
        assert.deepStrictEqual(
          yield* fieldsOf(
            leaf("num", REPEATED),
            group("my_list", REPEATED, [leaf("num", REQUIRED), string("str", OPTIONAL)]),
            group("three_level", OPTIONAL, [group("list", REPEATED, [string("element", REQUIRED)])], LIST),
            group("renamed", OPTIONAL, [group("element", REPEATED, [string("str", REQUIRED)])], LIST),
            group("rule1", OPTIONAL, [leaf("element", REPEATED)], LIST),
            group(
              "rule2",
              OPTIONAL,
              [group("element", REPEATED, [string("str", REQUIRED), leaf("num", REQUIRED)])],
              LIST
            ),
            group("rule3", OPTIONAL, [group("array", REPEATED, [leaf("array", REPEATED)], LIST)], LIST),
            group("rule4", OPTIONAL, [group("array", REPEATED, [string("str", REQUIRED)])], LIST),
            group("rule4b", OPTIONAL, [group("rule4b_tuple", REPEATED, [string("str", REQUIRED)])], LIST),
            group("rule5", OPTIONAL, [group("element", REPEATED, [string("str", OPTIONAL)])], LIST)
          ),
          [
            "num: List<num: Int<32> not null> not null",
            "my_list: List<my_list: Struct<num: Int<32> not null, str: Utf8> not null> not null",
            "three_level: List<element: Utf8 not null>",
            "renamed: List<str: Utf8 not null>",
            "rule1: List<element: Int<32> not null>",
            "rule2: List<element: Struct<str: Utf8 not null, num: Int<32> not null> not null>",
            "rule3: List<array: List<array: Int<32> not null> not null>",
            "rule4: List<array: Struct<str: Utf8 not null> not null>",
            "rule4b: List<rule4b_tuple: Struct<str: Utf8 not null> not null>",
            "rule5: List<str: Utf8>"
          ]
        )
        // Rule 3 without an annotation on the repeated group, and the LIST converted type
        assert.deepStrictEqual(
          yield* fieldsOf(
            group("a", REQUIRED, [group("items", REPEATED, [leaf("values", REPEATED)])], LIST),
            group("b", REQUIRED, [group("list", REPEATED, [leaf("element", OPTIONAL)])], converted(3))
          ),
          [
            "a: List<items: Struct<values: List<values: Int<32> not null> not null> not null> not null",
            "b: List<element: Int<32>> not null"
          ]
        )
      }))

    // ARROW-PARQUET-010 (normative + local): LogicalTypes.md Maps and their backward-compatibility rules.
    it.effect("maps MAP and MAP_KEY_VALUE groups, with the key and value by position", () =>
      Effect.gen(function*() {
        const keyValue = (name: string, key: Node, ...value: ReadonlyArray<Node>) =>
          group(name, REPEATED, [key, ...value])
        assert.deepStrictEqual(
          yield* fieldsOf(
            group("my_map", REQUIRED, [keyValue("key_value", string("key", REQUIRED), leaf("value", OPTIONAL))], MAP),
            group("renamed", OPTIONAL, [keyValue("map", string("str", REQUIRED), leaf("num", REQUIRED))], MAP),
            group(
              "legacy",
              OPTIONAL,
              [keyValue("map", string("key", REQUIRED), leaf("value", OPTIONAL))],
              converted(Converted.MAP_KEY_VALUE)
            ),
            // Local: the repeated group of a MAP annotated MAP_KEY_VALUE, and a repeated value, which the
            // Maps text doesn't allow, read as a list
            group(
              "inner",
              OPTIONAL,
              [group(
                "map",
                REPEATED,
                [string("key", REQUIRED), leaf("value", REPEATED)],
                converted(Converted.MAP_KEY_VALUE)
              )],
              converted(1)
            )
          ),
          [
            "my_map: Map<key: Utf8 not null, value: Int<32>> not null",
            "renamed: Map<str: Utf8 not null, num: Int<32> not null>",
            "legacy: Map<key: Utf8 not null, value: Int<32>>",
            "inner: Map<key: Utf8 not null, value: List<value: Int<32> not null> not null>"
          ]
        )
      }))

    // ARROW-PARQUET-011 (normative + local): forbidden LIST and MAP structures and their error kinds.
    it.effect("rejects LIST and MAP groups without the structure the specification requires", () =>
      Effect.gen(function*() {
        const malformed = (node: Node, message: RegExp) => schemaFailsWith(tree([node]), "Malformed", message)
        const element = leaf("element", REQUIRED)
        yield* malformed(
          group("l", OPTIONAL, [leaf("a", REPEATED), leaf("b", REPEATED)], LIST),
          /LIST group "l" has 2 fields/
        )
        yield* malformed(group("l", OPTIONAL, [], LIST), /LIST group "l" has 0 fields/)
        yield* malformed(group("l", OPTIONAL, [element], LIST), /the field of LIST group "l" is REQUIRED, not REPEATED/)
        yield* malformed(group("l", OPTIONAL, [group("list", REPEATED, [])], LIST), /"l.list" of a LIST has no fields/)
        yield* malformed(group("l", REPEATED, [leaf("element", REPEATED)], LIST), /LIST group "l" is repeated/)
        yield* malformed(
          group("l", OPTIONAL, [group("list", REPEATED, [group("list", REPEATED, [element])], LIST)], LIST),
          /LIST group "l.list" is repeated, but is not a 2-level list/
        )
        yield* malformed(
          group("l", OPTIONAL, [group("m", REPEATED, [group("kv", REPEATED, [element, element])], MAP)], LIST),
          /MAP group "l.m" is repeated/
        )

        const key = leaf("key", REQUIRED)
        const value = leaf("value", OPTIONAL)
        yield* malformed(group("m", OPTIONAL, [key, value], MAP), /MAP group "m" has 2 fields/)
        yield* malformed(group("m", OPTIONAL, [group("kv", OPTIONAL, [key, value])], MAP), /is OPTIONAL, not REPEATED/)
        yield* malformed(group("m", OPTIONAL, [leaf("kv", REPEATED)], MAP), /"m.kv" of a MAP is not a group/)
        yield* malformed(
          group("m", OPTIONAL, [group("kv", REPEATED, [])], MAP),
          /has 0 fields instead of a key and a value/
        )
        yield* malformed(
          group("m", OPTIONAL, [group("kv", REPEATED, [key, value, value])], MAP),
          /has 3 fields instead of a key and a value/
        )
        yield* malformed(
          group("m", OPTIONAL, [group("kv", REPEATED, [leaf("key", OPTIONAL), value])], MAP),
          /the key "m.kv.key" of a MAP is OPTIONAL, not REQUIRED/
        )
        yield* malformed(group("m", REPEATED, [group("kv", REPEATED, [key, value])], MAP), /MAP group "m" is repeated/)
        yield* malformed(
          group("m", REPEATED, [group("kv", REPEATED, [key, value])], converted(Converted.MAP_KEY_VALUE)),
          /MAP_KEY_VALUE group "m" is repeated/
        )
        // A set of keys is valid Parquet, but not an Arrow map
        yield* schemaFailsWith(
          tree([group("m", OPTIONAL, [group("kv", REPEATED, [key])], MAP)]),
          "Unsupported",
          /MAP group "m" has keys but no values/
        )
      }))

    // ARROW-PARQUET-012 (normative + local): Columnar struct and list nulls, agreement of sibling columns.
    it.effect("assembles structs and lists with their nulls, and rejects columns that disagree", () =>
      Effect.gen(function*() {
        // An optional struct of required fields: {a: 5, b: 6}, null, {a: 7, b: 8}
        const struct = [group("g", OPTIONAL, [leaf("a", REQUIRED), leaf("b", REQUIRED)])]
        const [batch] = yield* batchesOf(
          tree(struct, 3, [[3, bytes(someNull, int32s(5, 7))], [3, bytes(someNull, int32s(6, 8))]])
        )
        const [g] = batch.columns
        assert.deepStrictEqual(valuesOf(batch.schema.fields[0], g), [{ a: 5, b: 6 }, null, { a: 7, b: 8 }])
        assert.deepStrictEqual([g.length, g.nullCount, g.validity], [3, 1, Uint8Array.of(0b101)])
        // The children keep a slot for the null struct, and have no nulls of their own
        assert.deepStrictEqual(g.children.map((child) => [child.length, child.nullCount, child.validity]), [
          [3, 0, undefined],
          [3, 0, undefined]
        ])
        assert.deepStrictEqual(Option.getOrThrow(ArrowData.values(g.children[0])), Int32Array.of(5, 0, 7))

        // The slot of a required field in a null struct is no value: neither a decimal without bytes nor a timestamp
        const hidden = [
          group("g", OPTIONAL, [leaf("d", REQUIRED, Type.BYTE_ARRAY, decimal(38, 0)), leaf("t", REQUIRED, Type.INT96)])
        ]
        const [inside] = yield* batchesOf(
          tree(hidden, 3, [
            [3, bytes(someNull, binaries([0x05], [0xfb]))],
            [3, bytes(someNull, int96(2440588, 1n), int96(2440588, 2n))]
          ])
        )
        assert.deepStrictEqual(valuesOf(inside.schema.fields[0], inside.columns[0]), [
          { d: "5", t: "1" },
          null,
          { d: "-5", t: "2" }
        ])
        assert.deepStrictEqual(inside.columns[0].children.map((child) => child.nullCount), [0, 0])

        // A 2-level list: [1, 2], null, [], [3]. Levels (r, d) = (0, 2) (1, 2) (0, 0) (0, 1) (0, 2)
        const list = [group("l", OPTIONAL, [leaf("element", REPEATED)], LIST)]
        const levels = bytes(
          lengthPrefixed(runs(1, [0, 1], [1, 1], [0, 3])),
          lengthPrefixed(runs(2, [2, 2], [0, 1], [1, 1], [2, 1]))
        )
        const [lists] = yield* batchesOf(tree(list, 4, [[5, bytes(levels, int32s(1, 2, 3))]]))
        const [l] = lists.columns
        assert.deepStrictEqual(valuesOf(lists.schema.fields[0], l), [[1, 2], null, [], [3]])
        assert.deepStrictEqual([l.length, l.nullCount, l.validity], [4, 1, Uint8Array.of(0b1101)])
        assert.deepStrictEqual(Option.getOrThrow(ArrowData.offsets(l)), Int32Array.of(0, 2, 2, 2, 3))
        assert.deepStrictEqual([l.children[0].length, l.children[0].nullCount], [3, 0])

        // A repeated field without annotation: [1, 2], [], [3]
        const repeated = bytes(
          lengthPrefixed(runs(1, [0, 1], [1, 1], [0, 2])),
          lengthPrefixed(runs(1, [1, 2], [0, 1], [1, 1]))
        )
        const [bare] = yield* batchesOf(tree([leaf("num", REPEATED)], 3, [[4, bytes(repeated, int32s(1, 2, 3))]]))
        assert.deepStrictEqual(valuesOf(bare.schema.fields[0], bare.columns[0]), [[1, 2], [], [3]])
        assert.deepStrictEqual([bare.columns[0].nullCount, bare.columns[0].validity], [0, undefined])

        // The second column has the struct of row 1, which the first says is null
        yield* failsWith(
          batchesOf(
            tree(struct, 3, [[3, bytes(someNull, int32s(5, 7))], [
              3,
              bytes(lengthPrefixed(runs(1, [1, 3])), int32s(6, 0, 8))
            ]])
          ),
          "Malformed",
          /columns "g.a" and "g.b" of row group 0 disagree about "g"/
        )
        // One row of a repeated group with two elements in the first column, and one in the second
        const one = lengthPrefixed(runs(1, [1, 1]))
        yield* failsWith(
          batchesOf(
            tree([group("r", REPEATED, [leaf("a", REQUIRED), leaf("b", REQUIRED)])], 1, [
              [2, bytes(lengthPrefixed(runs(1, [0, 1], [1, 1])), lengthPrefixed(runs(1, [1, 2])), int32s(1, 2))],
              [1, bytes(lengthPrefixed(runs(1, [0, 1])), one, int32s(3))]
            ])
          ),
          "Malformed",
          /columns "r.a" and "r.b" of row group 0 disagree about "r"/
        )
      }))
  })

  describe("batches", () => {
    const plainBytes = fixtureBytes("plain.parquet")

    // ARROW-PARQUET-013 (local): batch boundaries are row group boundaries.
    it.effect("emits one batch per row group, also without rows, and nothing without row groups", () =>
      Effect.gen(function*() {
        const batches = yield* batchesOf(rowGroups([[1, 2], [], [3]]))
        assert.deepStrictEqual(batches.map((batch) => batch.length), [2, 0, 1])
        assert.deepStrictEqual(batches.map((batch) => valuesOf(batch.schema.fields[0], batch.columns[0])), [
          [1, 2],
          [],
          [3]
        ])
        assert.deepStrictEqual(yield* batchesOf(rowGroups([])), [])
      }))

    // ARROW-PARQUET-014 (local): the stream is lazy.
    it.effect("reads a row group only when its batch is pulled", () =>
      Effect.gen(function*() {
        const bytes = rowGroups([[1, 2], [3]])
        const metadata = yield* Parquet.readMetadata(Parquet.fromBytes(bytes))
        // Break the page header of the second row group
        const second = Number(metadata.rowGroups[1].columns[0].metaData!.dataPageOffset)
        bytes.fill(0xff, second, second + 4)
        const reads: Array<number> = []
        const source: Parquet.Source = {
          size: bytes.length,
          read: (offset, length) => Effect.sync(() => (reads.push(offset), bytes.subarray(offset, offset + length)))
        }
        const stream = ArrowParquet.recordBatches(source)
        const [first] = yield* Stream.runCollect(Stream.take(stream, 1))
        assert.deepStrictEqual(valuesOf(first.schema.fields[0], first.columns[0]), [1, 2])
        assert.isFalse(reads.includes(second))
        yield* failsWith(Stream.runCollect(stream), "Malformed", /./)
      }))

    // ARROW-PARQUET-015 (local): projection, and usage errors as defects.
    it.effect("selects top-level fields by name, in the order given", () =>
      Effect.gen(function*() {
        const source = Parquet.fromBytes(plainBytes)
        const metadata = yield* Parquet.readMetadata(source)
        const columns = ["string", "int32"]
        const all = yield* ArrowParquet.readRecordBatch(source, metadata, { rowGroup: 1 })
        const some = yield* ArrowParquet.readRecordBatch(source, metadata, { rowGroup: 1, columns })
        assert.deepStrictEqual(some.schema, Result.getOrThrow(ArrowParquet.schema(metadata, { columns })))
        assert.deepStrictEqual(showSchema(some.schema), ["string: Utf8", "int32: Int<32> not null"])
        assert.strictEqual(some.length, 15)
        assert.deepStrictEqual(
          columnsOf([some], some.schema),
          [5, 1].map((i) => valuesOf(all.schema.fields[i], all.columns[i]))
        )
        assert.deepStrictEqual(
          (yield* batchesOf(plainBytes, { columns: [] })).map((batch) => [batch.length, batch.columns.length]),
          [[25, 0], [15, 0]]
        )
        // Without a column to read, the row count alone gives the batch length, so it must not be negative
        const rows = (numRows: number) =>
          flat({ type: Type.INT32, repetition: REQUIRED, numRows, numValues: 0, pages: [] })
        assert.deepStrictEqual((yield* batchesOf(rows(0), { columns: [] })).map((batch) => batch.length), [0])
        yield* failsWith(batchesOf(rows(-1), { columns: [] }), "Malformed", /num_rows is -1/)

        // A name the file doesn't have and a row group it doesn't have are bugs in the caller
        assert.throws(() => ArrowParquet.schema(metadata, { columns: ["nope"] }), /the file has no column "nope"/)
        yield* dies(ArrowParquet.readRecordBatch(source, metadata, { rowGroup: 0, columns: ["nope"] }))
        yield* dies(batchesOf(plainBytes, { columns: ["nope"] }))
        yield* dies(ArrowParquet.readRecordBatch(source, metadata, { rowGroup: 2 }))
        yield* dies(ArrowParquet.readRecordBatch(source, metadata, { rowGroup: 0.5 }))
      }))

    // ARROW-PARQUET-016 (local): codecs and resource limits of the Parquet reader.
    it.effect("passes codecs and limits on to the Parquet reader", () =>
      Effect.gen(function*() {
        yield* failsWith(batchesOf(fixtureBytes("gzip.parquet")), "Unsupported", /GZIP/)
        yield* failsWith(batchesOf(plainBytes, { maxValues: 24 }), "Limit", /maxValues/)
        yield* failsWith(batchesOf(plainBytes, { maxPageSize: 8 }), "Limit", /maxPageSize/)
        yield* failsWith(batchesOf(plainBytes, { maxBinaryLength: 1, columns: ["string"] }), "Limit", /maxBinaryLength/)
        yield* failsWith(batchesOf(plainBytes, { maxFooterLength: 8 }), "Limit", /maxFooterLength/)
        yield* failsWith(batchesOf(fixtureBytes("nested.parquet"), { maxDepth: 1 }), "Limit", /maxDepth/)
        assert.strictEqual((yield* batchesOf(plainBytes, { maxValues: 25 })).length, 2)
      }))

    // ARROW-PARQUET-017 (local): batches own their buffers.
    it.effect("returns batches that share no buffer with the source or a codec's output", () =>
      Effect.gen(function*() {
        const outputs: Array<Uint8Array> = []
        const keeping: Parquet.Decompress = (data) =>
          Effect.sync(() => {
            const out = new Uint8Array(gunzipSync(data))
            outputs.push(out)
            return out
          })
        for (const name of [...gold.files.map((file) => file.name), "logical.parquet"]) {
          const bytes = fixtureBytes(name)
          const batches = yield* batchesOf(bytes, { codecs: { GZIP: keeping } })
          const before = columnsOf(batches, batches[0].schema)
          bytes.fill(0xff)
          for (const output of outputs) output.fill(0xff)
          assert.deepStrictEqual(columnsOf(batches, batches[0].schema), before, name)
          const buffers = (data: ArrowData.ArrowData): ReadonlyArray<Uint8Array> => [
            ...(data.validity === undefined ? [] : [data.validity]),
            ...data.buffers,
            ...data.children.flatMap(buffers)
          ]
          for (const buffer of batches.flatMap((batch) => batch.columns.flatMap(buffers))) {
            assert.notStrictEqual(buffer.buffer, bytes.buffer, name)
            for (const output of outputs) assert.notStrictEqual(buffer.buffer, output.buffer, name)
          }
        }
        assert.isAbove(outputs.length, 0)
      }))

    // ARROW-PARQUET-018 (local): round trip through the Arrow IPC stream format.
    it.effect("gives batches that an Arrow IPC stream encodes and decodes to the same schema and values", () =>
      Effect.gen(function*() {
        for (const name of ["plain.parquet", "int96.parquet", "nested.parquet", "logical.parquet", "empty.parquet"]) {
          const bytes = fixtureBytes(name)
          const batches = yield* batchesOf(bytes)
          const schema = Result.getOrThrow(yield* schemaOf(bytes))
          const table = ArrowTable.make(schema, batches)
          const decoded = Result.getOrThrow(ArrowIpc.decodeStream(Result.getOrThrow(ArrowIpc.encodeStream(table))))
          assert.deepStrictEqual(decoded.schema, schema, name)
          assert.deepStrictEqual(
            decoded.batches.map((batch) => batch.length),
            batches.map((batch) => batch.length),
            name
          )
          assert.deepStrictEqual(columnsOf(decoded.batches, schema), columnsOf(batches, schema), name)
        }
      }))
  })
})
