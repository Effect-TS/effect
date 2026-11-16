/**
 * Declared table columns: what a frame must hold to be read as a table, and
 * the conversion of a frame to them.
 *
 * A declared column names its type once (`declareColumn`, `fromArrowSchema`).
 * Validating a frame and reading a table convert to that declaration
 * (`arrowType`, `conform`), so the same declaration always gives the same
 * column types. The conversion works on the typed buffers of the columns and
 * builds no value objects.
 *
 * A `Timestamp` column reads as `DateTime.Utc` values, so its timestamps
 * must have no time zone (or a UTC one, which is dropped) and lie in the
 * range `DateTime` represents.
 *
 * A declaration can carry tests of values and rows (`Plan.TableChecks`).
 * They are compiled by whoever declares the table and run here as given, on
 * the values of the columns they name and on the rows.
 *
 * @internal
 */
import * as S from "../../arrow/ArrowSchema.ts"
import * as DateTime from "../../DateTime.ts"
import * as Duration from "../../Duration.ts"
import type * as Plan from "../Plan.ts"
import * as D from "./dtype.ts"
import * as F from "./frame.ts"
import * as K from "./kernels.ts"
import * as V from "./vector.ts"

type Column = Omit<Plan.TableColumn, "name">

/** The path of field `name` under `path`. @internal */
export const field = (path: string, name: string) => (path === "" ? name : `${path}.${name}`)

// -----------------------------------------------------------------------------
// Declared columns
// -----------------------------------------------------------------------------

/** The plan type name of an Arrow type. */
const typeName = (t: S.DataType): Plan.TypeName => {
  switch (t._tag) {
    case "Int":
    case "Float":
      return D.describe(t) as Plan.TypeName
    case "Utf8":
    case "LargeUtf8":
    case "Utf8View":
      return "Utf8"
    case "Binary":
    case "LargeBinary":
    case "BinaryView":
    case "FixedSizeBinary":
      return "Binary"
    case "LargeList":
      return "List"
    default:
      return t._tag as Plan.TypeName
  }
}

const describe = (t: S.DataType): string => {
  if (t._tag === "List" || t._tag === "LargeList") return `List<${describe(t.child.type)}>`
  return t._tag === "Timestamp" || t._tag === "Duration" || t._tag === "Decimal" ? D.describe(t) : typeName(t)
}

const describeColumn = (c: Column): string => c.type === "List" ? `List<${describeColumn(c.fields![0])}>` : c.type

const utcZones: ReadonlySet<string> = new Set(["UTC", "Etc/UTC", "+00:00"])

/**
 * Fails unless values of Arrow type `t` read as values of the column (not
 * looking into lists and structs). Timestamps need no time zone or a UTC one.
 */
const checkType = (path: string, t: S.DataType, expected: Column): void => {
  if (expected.type === "Timestamp" && t._tag === "Timestamp" && t.timezone !== undefined) {
    if (utcZones.has(t.timezone)) return
    return V.fail(`column ${JSON.stringify(path)} has time zone ${t.timezone}, expected UTC timestamps`)
  }
  if (!compatible(t, expected)) {
    V.fail(`column ${JSON.stringify(path)} is ${describe(t)}, expected ${describeColumn(expected)}`)
  }
}

/**
 * Integers below 64 bits read as floats and narrower integers, 64-bit
 * integers (bigints) as 64-bit ones, any decimal as a decimal, and temporal
 * types as the same kind in any unit.
 */
const compatible = (t: S.DataType, expected: Column): boolean => {
  switch (expected.type) {
    case "Float16":
    case "Float32":
    case "Float64":
      return t._tag === "Float" || (t._tag === "Int" && t.bitWidth < 64)
    case "Int8":
    case "Int16":
    case "Int32":
    case "UInt8":
    case "UInt16":
    case "UInt32":
      return t._tag === "Int" && t.bitWidth < 64
    case "Int64":
    case "UInt64":
      return t._tag === "Int" && t.bitWidth === 64
    default:
      return typeName(t) === expected.type
  }
}

const missing = (path: string): never => V.fail(`missing column ${JSON.stringify(path)}`)

/** The column declared for a field's `column` with Arrow type `t`, or its default type. @internal */
export const declareColumn = (path: string, column: Plan.TableColumn, t: S.DataType | undefined): Plan.TableColumn => {
  if (t !== undefined) checkType(path, t, column)
  switch (column.type) {
    case "List": {
      const child = t !== undefined && (t._tag === "List" || t._tag === "LargeList") ? t.child.type : undefined
      return { ...column, fields: [declareColumn(`${path}[]`, column.fields![0], child)] }
    }
    case "Struct":
      return {
        ...column,
        fields: column.fields!.map((f) => {
          const p = field(path, f.name)
          const g = t?._tag === "Struct" ? (t.fields.find((g) => g.name === f.name) ?? missing(p)).type : undefined
          return declareColumn(p, f, g)
        })
      }
    case "Decimal":
      return t?._tag === "Decimal" ? { ...column, precision: t.precision, scale: t.scale } : column
    case "Timestamp":
    case "Duration":
      return { ...column, unit: t?._tag === column.type ? t.unit : "microsecond" }
    default:
      return t === undefined || column.type === "Null" ? column : { ...column, type: typeName(t) }
  }
}

/** Arrow types frames hold as another type, which is the one to declare. */
const heldAs: { readonly [tag: string]: string } = {
  LargeUtf8: "Utf8",
  Utf8View: "Utf8",
  LargeBinary: "Binary",
  BinaryView: "Binary",
  LargeList: "List",
  Dictionary: "their value type"
}

const undeclarable = (path: string, what: string, why?: string): never =>
  V.fail(`column ${JSON.stringify(path)}: ${what} can't be declared${why === undefined ? "" : `: ${why}`}`)

/**
 * The declared column of an Arrow field. Only types that {@link arrowType}
 * gives back are declared: a type frames can't hold, or hold as another
 * type, fails. A UTC time zone is dropped, as {@link checkType} reads it.
 */
const fieldColumn = (path: string, f: S.Field): Plan.TableColumn => {
  const t = f.type
  const column = { name: f.name, nullable: f.nullable }
  switch (t._tag) {
    case "Null":
      return f.nullable
        ? { ...column, type: "Null" }
        : V.fail(`column ${JSON.stringify(path)}: Null columns are nullable`)
    case "Bool":
    case "Utf8":
    case "Binary":
    case "Int":
      return { ...column, type: typeName(t) }
    case "Float":
      return t.bitWidth === 16 ? undeclarable(path, "Float16 columns") : { ...column, type: typeName(t) }
    case "Date":
      return t.unit === "day"
        ? { ...column, type: "Date" }
        : undeclarable(path, `dates in ${t.unit}s`, "declared dates are in days")
    case "Time":
      return t.unit === "microsecond"
        ? { ...column, type: "Time" }
        : undeclarable(path, `times in ${t.unit}s`, "declared times are in microseconds")
    case "Timestamp":
      checkType(path, t, { type: "Timestamp", nullable: f.nullable })
      return { ...column, type: "Timestamp", unit: t.unit }
    case "Duration":
      return { ...column, type: "Duration", unit: t.unit }
    case "Decimal":
      return t.bitWidth === 128
        ? { ...column, type: "Decimal", precision: t.precision, scale: t.scale }
        : undeclarable(path, `${t.bitWidth}-bit decimals`, "declared decimals are 128-bit")
    case "List":
      return { ...column, type: "List", fields: [fieldColumn(`${path}[]`, { ...t.child, name: "item" })] }
    case "Struct":
      return { ...column, type: "Struct", fields: t.fields.map((g) => fieldColumn(field(path, g.name), g)) }
    default:
      return undeclarable(
        path,
        `${t._tag} columns`,
        heldAs[t._tag] === undefined ? undefined : `frames hold them as ${heldAs[t._tag]}`
      )
  }
}

/**
 * The declared columns of an Arrow schema's fields: their types,
 * nullability, nested fields, decimal precision and scale, and time units.
 *
 * @internal
 */
export const fromArrowSchema = (schema: S.Schema): Array<Plan.TableColumn> =>
  schema.fields.map((f) => fieldColumn(f.name, f))

/**
 * The Arrow type of a declared column. Timestamps and durations without a
 * unit are microseconds, dates days and times microseconds; decimals need
 * their precision and scale.
 *
 * @internal
 */
export const arrowType = (column: Plan.TableColumn, path: string = column.name): S.DataType => {
  switch (column.type) {
    case "List": {
      const item = column.fields![0]
      return S.list(S.field("item", arrowType(item, `${path}[]`), { nullable: item.nullable }))
    }
    case "Struct":
      return S.struct(
        column.fields!.map((f) => S.field(f.name, arrowType(f, field(path, f.name)), { nullable: f.nullable }))
      )
    case "Utf8":
      return S.utf8
    case "Binary":
      return S.binary
    case "Bool":
      return S.bool
    case "Null":
      return S.nullType
    case "Date":
      return S.date("day")
    case "Time":
      return S.time("microsecond")
    case "Timestamp":
      return S.timestamp(column.unit ?? "microsecond")
    case "Duration":
      return S.duration(column.unit ?? "microsecond")
    case "Decimal":
      return column.precision === undefined || column.scale === undefined
        ? V.fail(
          `column ${
            JSON.stringify(path)
          }: decimal columns need a precision and scale: pass options.types (for example ArrowSchema.decimal(18, 2))`
        )
        : S.decimal(column.precision, column.scale)
    case "Float16":
      return S.float16
    default:
      // The other numeric types, named as cast targets.
      return D.castTargets[column.type]
  }
}

/**
 * The Arrow schema of declared columns.
 *
 * @internal
 */
export const toArrowSchema = (columns: ReadonlyArray<Plan.TableColumn>): S.Schema =>
  S.make(columns.map((c) => S.field(c.name, arrowType(c), { nullable: c.nullable })))

// -----------------------------------------------------------------------------
// Checking frames
// -----------------------------------------------------------------------------

const inRows = (rows: Uint8Array | undefined, i: number): boolean => rows === undefined || rows[i] === 1

const allNull = (v: V.Vector, rows: Uint8Array | undefined): boolean => {
  for (let i = 0; i < v.length; i++) if (inRows(rows, i) && V.isValid(v, i)) return false
  return true
}

/** The stored values of a timestamp in each unit that `DateTime` represents (±8.64e15 ms). */
const timestampRange: { readonly [U in S.TimeUnit]: readonly [bigint, bigint] } = {
  second: [-BigInt("8640000000000"), BigInt("8640000000000")],
  millisecond: [-BigInt("8640000000000000"), BigInt("8640000000000000")],
  microsecond: [-BigInt("8640000000000000000"), BigInt("8640000000000000999")],
  nanosecond: [-BigInt("9223372036854775808"), BigInt("9223372036854775807")]
}

const checkRange = (path: string, v: V.I64, unit: S.TimeUnit, rows: Uint8Array | undefined): void => {
  const [lo, hi] = timestampRange[unit]
  for (let i = 0; i < v.length; i++) {
    if (inRows(rows, i) && V.isValid(v, i) && (v.values[i] < lo || v.values[i] > hi)) {
      V.fail(`column ${JSON.stringify(path)} has timestamps outside the range of DateTime`)
    }
  }
}

/**
 * Fails for a decimal with more digits than its column's precision. A
 * column holds one all the same, and a conversion to its own type finds none.
 */
const checkPrecision = (path: string, v: V.I64, type: S.Decimal, rows: Uint8Array | undefined): void => {
  const limit = BigInt(10) ** BigInt(type.precision)
  for (let i = 0; i < v.length; i++) {
    if (inRows(rows, i) && V.isValid(v, i) && (v.values[i] >= limit || v.values[i] <= -limit)) inexact(path, type)
  }
}

const sameValue = (a: V.Vector, b: V.Vector, i: number): boolean => {
  switch (a.kind) {
    case "f64": {
      const x = a.values[i]
      const y = (b as V.F64).values[i]
      return Object.is(x, y) || (x !== x && y !== y)
    }
    case "i32":
    case "i64":
    case "bool":
      return a.values[i] === (b as typeof a).values[i]
    case "str":
      return V.decodeString(a, i) === V.decodeString(b as V.Str, i)
    default:
      return true
  }
}

/** `v` converted to `target`, failing unless every present value converts exactly. */
const convert = (path: string, v: V.Vector, target: S.DataType, rows: Uint8Array | undefined): V.Vector => {
  if (D.sameType(v.type, target)) return v
  const converted = K.cast(v, target)
  const back = K.cast(converted, v.type)
  for (let i = 0; i < v.length; i++) {
    if (
      inRows(rows, i) && V.isValid(v, i) &&
      (!V.isValid(converted, i) || !sameValue(v, back, i))
    ) {
      return inexact(path, target)
    }
  }
  return converted
}

const inexact = (path: string, target: S.DataType): never =>
  V.fail(`column ${JSON.stringify(path)} has values that ${D.describe(target)} can't hold exactly`)

/** Microseconds in each unit of a time, as a fraction. */
const microseconds: { readonly [U in S.TimeUnit]: readonly [bigint, bigint] } = {
  second: [BigInt(1_000_000), BigInt(1)],
  millisecond: [BigInt(1_000), BigInt(1)],
  microsecond: [BigInt(1), BigInt(1)],
  nanosecond: [BigInt(1), BigInt(1_000)]
}

/**
 * A date in days or a time in microseconds (`target`) from one in another
 * unit, failing unless every present value converts exactly. `K.cast`
 * reads the stored numbers of these types as they are, in any unit.
 */
const rescale = (path: string, v: V.I32 | V.I64, target: S.Date | S.Time, rows: Uint8Array | undefined): V.Vector => {
  const [mul, div] = v.type._tag === "Time" ? microseconds[v.type.unit] : [BigInt(1), BigInt(86_400_000)]
  const out = target._tag === "Date" ? new Int32Array(v.length) : new BigInt64Array(v.length)
  for (let i = 0; i < v.length; i++) {
    if (!inRows(rows, i) || !V.isValid(v, i)) continue
    const x = BigInt(v.values[i]) * mul
    const y = x / div
    if (y * div !== x || BigInt.asIntN(out.BYTES_PER_ELEMENT * 8, y) !== y) return inexact(path, target)
    out[i] = (target._tag === "Date" ? Number(y) : y) as never
  }
  return out instanceof Int32Array ? V.i32(target, out, v.valid) : V.i64(target, out, v.valid)
}

/**
 * A test of the values rows give a column, failing for a `DateTime` or
 * `Duration` that is not a whole number of the column's unit: building the
 * column rounds it down. `undefined` when the unit holds them all (a
 * `DateTime` is in milliseconds, a `Duration` in nanoseconds).
 */
const exact = (path: string, column: Plan.TableColumn): ((value: unknown) => void) | undefined => {
  switch (column.type) {
    case "Timestamp":
      return column.unit !== "second" ? undefined : (value) => {
        if (DateTime.isDateTime(value) && DateTime.toEpochMillis(value) % 1000 !== 0) {
          inexact(path, arrowType(column, path))
        }
      }
    case "Duration": {
      const [mul, div] = microseconds[column.unit ?? "microsecond"]
      const nanos = mul * BigInt(1000) / div
      return nanos === BigInt(1) ? undefined : (value) => {
        if (Duration.isDuration(value) && Duration.toNanosUnsafe(value) % nanos !== BigInt(0)) {
          inexact(path, arrowType(column, path))
        }
      }
    }
    case "List": {
      const item = exact(`${path}[]`, column.fields![0])
      return item && ((value) => {
        if (value == null) return
        // Any other iterable may be spent by now, with nothing left to test.
        if (!Array.isArray(value)) return V.fail(`column ${JSON.stringify(path)} needs its lists as arrays`)
        value.forEach(item)
      })
    }
    case "Struct": {
      const fields = column.fields!.flatMap((f, k) => {
        const test = exact(field(path, f.name), f)
        return test === undefined ? [] : [[f.name, k, test] as const]
      })
      return fields.length === 0 ? undefined : (value) => {
        if (value == null) return
        // An array gives a struct's values by position.
        for (const [name, k, test] of fields) test(Array.isArray(value) ? value[k] : (value as any)[name])
      }
    }
    default:
      return undefined
  }
}

/**
 * Fails unless building the columns from `rows` keeps their `DateTime`
 * and `Duration` values exactly: one finer than its column's unit fails,
 * as it does when a frame is converted ({@link conform}).
 *
 * @internal
 */
export const checkExact = (columns: ReadonlyArray<Plan.TableColumn>, rows: ReadonlyArray<any>): void => {
  for (const column of columns) {
    const test = exact(column.name, column)
    if (test !== undefined) { for (const row of rows) test(row[column.name]) }
  }
}

/** A column checked against its declaration and converted to its declared type. */
const check = (path: string, v: V.Vector, expected: Plan.TableColumn, rows: Uint8Array | undefined): V.Vector => {
  if (expected.type === "Null") {
    if (!allNull(v, rows)) checkType(path, v.type, expected)
    return V.nulls(v.length)
  }
  checkType(path, v.type, expected)
  if (!expected.nullable) {
    for (let i = 0; i < v.length; i++) {
      if (inRows(rows, i) && !V.isValid(v, i)) {
        return V.fail(`column ${JSON.stringify(path)} has missing values`)
      }
    }
  }
  if (v.kind === "struct" && v.type._tag === "Struct") {
    const present = new Uint8Array(v.length)
    for (let i = 0; i < v.length; i++) present[i] = inRows(rows, i) && V.isValid(v, i) ? 1 : 0
    const fields = v.type.fields
    const children = expected.fields!.map((f) => {
      const k = fields.findIndex((g) => g.name === f.name)
      return k === -1 ? missing(field(path, f.name)) : check(field(path, f.name), v.children[k], f, present)
    })
    const type = S.struct(expected.fields!.map((f, k) => S.field(f.name, children[k].type, { nullable: f.nullable })))
    return V.struct(type, children, v.length, v.valid)
  }
  if (v.kind === "list") {
    const present = new Uint8Array(v.child.length)
    for (let i = 0; i < v.length; i++) {
      if (inRows(rows, i) && V.isValid(v, i)) present.fill(1, v.offsets[i], v.offsets[i + 1])
    }
    const item = expected.fields![0]
    const child = check(`${path}[]`, v.child, item, present)
    return V.list(S.list(S.field("item", child.type, { nullable: item.nullable })), v.offsets, child, v.valid)
  }
  if (expected.type === "Timestamp" && v.kind === "i64" && v.type._tag === "Timestamp") {
    checkRange(path, v, v.type.unit, rows)
  }
  const target = arrowType(expected, path)
  if (target._tag === "Decimal" && v.kind === "i64" && D.sameType(v.type, target)) {
    checkPrecision(path, v, target, rows)
  }
  return (target._tag === "Date" || target._tag === "Time") && !D.sameType(v.type, target)
    ? rescale(path, v as V.I32 | V.I64, target, rows)
    : convert(path, v, target, rows)
}

/**
 * Fails unless the values of the columns that `checks` names pass their
 * test, and the rows the row test.
 *
 * @internal
 */
export const runChecks = (
  checks: Plan.TableChecks,
  values: (name: string) => ReadonlyArray<unknown>,
  rows: () => ReadonlyArray<unknown>
): void => {
  for (const [name, test] of checks.columns) {
    if (!values(name).every(test)) V.fail(`column ${JSON.stringify(name)} has values its schema rejects`)
  }
  if (checks.rows !== undefined && !rows().every(checks.rows)) V.fail("rows have values their schema rejects")
}

/**
 * Checks that a frame has the declared columns and narrows it to them, in
 * their order, converting each to its declared type (exactly: a value the
 * declared type can't hold fails). With `checks`, the values of the columns
 * they name, and the rows when they test rows, are then read and tested;
 * other columns are never read as values.
 *
 * @internal
 */
export const conform = (
  frame: F.Frame,
  columns: ReadonlyArray<Plan.TableColumn>,
  checks?: Plan.TableChecks | undefined
): F.Frame => {
  const narrowed = F.make(
    columns.map((expected) => {
      const c = frame.columns.find((c) => c.name === expected.name) ?? missing(expected.name)
      const values = c.values()
      const checked = check(expected.name, values, expected, undefined)
      return checked === values && c.nullable === expected.nullable
        ? c
        : new F.Column(c.name, checked, undefined, expected.nullable)
    }),
    frame.length
  )
  if (checks !== undefined) runChecks(checks, (name) => F.toArray(narrowed, name), () => F.toRows(narrowed))
  return narrowed
}
