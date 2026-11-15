/**
 * Table columns for the fields of an Effect Schema struct, and the checks a
 * frame must pass to be read as rows of the schema.
 *
 * A field's declared column is fixed once, from the schema and the Arrow
 * types given for some fields (`declare`): numbers are Float64,
 * timestamps and durations microseconds, unless an override says otherwise,
 * and decimals need one. Building a frame from rows, validating a frame and
 * reading a table all convert to that declaration (`arrowType`,
 * `conform`), so the same schema and overrides always give the same column
 * types.
 *
 * A `Timestamp` column reads as `DateTime.Utc` values, so its timestamps
 * must have no time zone (or a UTC one, which is dropped) and lie in the
 * range `DateTime` represents. `DateTimeZoned` fields have no column type.
 *
 * @internal
 */
import * as S from "../../arrow/ArrowSchema.ts"
import * as Result from "../../Result.ts"
import * as AST from "../../SchemaAST.ts"
import * as Parser from "../../SchemaParser.ts"
import type * as Plan from "../Plan.ts"
import * as D from "./dtype.ts"
import * as F from "./frame.ts"
import * as K from "./kernels.ts"
import * as V from "./vector.ts"

type Column = Omit<Plan.TableColumn, "name">

const field = (path: string, name: string) => (path === "" ? name : `${path}.${name}`)

const leaf = (type: Plan.TypeName, nullable = false): Column => ({ type, nullable })

const literalType = (literal: unknown): Plan.TypeName | undefined => {
  switch (typeof literal) {
    case "string":
      return "Utf8"
    case "number":
      return "Float64"
    case "boolean":
      return "Bool"
    case "bigint":
      return "Int64"
    default:
      return undefined
  }
}

const sameShape = (a: Column, b: Column): boolean =>
  a.type === b.type && JSON.stringify(a.fields ?? []) === JSON.stringify(b.fields ?? [])

const suspended = new Set<AST.AST>()

/** `f` of a suspended schema, failing (after `prefix`) when it recurses. */
const unsuspend = <A>(ast: AST.Suspend, prefix: string, f: (ast: AST.AST) => A): A => {
  if (suspended.has(ast)) return V.fail(`${prefix}recursive schemas have no DataFrame column type`)
  suspended.add(ast)
  try {
    return f(ast.thunk())
  } finally {
    suspended.delete(ast)
  }
}

const columnOf = (ast: AST.AST, path: string): Column => {
  switch (ast._tag) {
    case "String":
    case "TemplateLiteral":
      return leaf("Utf8")
    case "Number":
      return leaf("Float64")
    case "Boolean":
      return leaf("Bool")
    case "BigInt":
      return leaf("Int64")
    case "Null":
    case "Undefined":
      return leaf("Null", true)
    case "Literal": {
      const type = literalType(ast.literal)
      return type === undefined ? unsupported(ast, path) : leaf(type)
    }
    case "Enum": {
      const types = new Set(ast.enums.map(([, v]) => literalType(v)))
      return types.size === 1 ? leaf([...types][0]!) : unsupported(ast, path)
    }
    case "Union": {
      let column: Column | undefined
      let nullable = false
      for (const member of ast.types) {
        const m = columnOf(member, path)
        nullable ||= m.nullable
        if (m.type === "Null") continue
        if (column === undefined) column = m
        else if (!sameShape(column, m)) return unsupported(ast, path)
      }
      return { ...(column ?? leaf("Null")), nullable }
    }
    case "Suspend":
      return unsuspend(ast, `field ${JSON.stringify(path)}: `, (ast) => columnOf(ast, path))
    case "Arrays": {
      const element = ast.rest[0]
      if (ast.elements.length > 0 || element === undefined || ast.rest.length > 1) return unsupported(ast, path)
      return { type: "List", nullable: false, fields: [{ name: "item", ...columnOf(element, `${path}[]`) }] }
    }
    case "Objects":
      return ast.indexSignatures.length > 0
        ? unsupported(ast, path)
        : { type: "Struct", nullable: false, fields: fieldsOf(ast, path) }
    case "Declaration": {
      const id = (ast.annotations as { readonly representation?: { readonly id?: unknown } } | undefined)
        ?.representation?.id
      if (id === "effect/schema/DateTimeUtc") return leaf("Timestamp")
      if (id === "effect/schema/Duration") return leaf("Duration")
      if (id === "effect/schema/BigDecimal") return leaf("Decimal")
      return unsupported(ast, path)
    }
    default:
      return unsupported(ast, path)
  }
}

const unsupported = (ast: AST.AST, path: string): never =>
  V.fail(`field ${JSON.stringify(path)}: schemas of kind ${ast._tag} have no DataFrame column type yet`)

const fieldsOf = (ast: AST.Objects, path: string): Array<Plan.TableColumn> =>
  ast.propertySignatures.map((ps) => {
    const name = String(ps.name)
    const column = columnOf(ps.type, field(path, name))
    return { name, ...column, nullable: column.nullable || AST.isOptional(ps.type) }
  })

const structOf = (schema: { readonly ast: AST.AST }): AST.Objects => {
  const ast = AST.toType(schema.ast)
  return ast._tag === "Objects" && ast.indexSignatures.length === 0
    ? ast
    : V.fail("DataFrame rows must be described by a struct schema")
}

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

/** The column declared for a field's `column` with Arrow type `t`, or its default type. */
const declareColumn = (path: string, column: Plan.TableColumn, t: S.DataType | undefined): Plan.TableColumn => {
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

/**
 * The declared columns of a struct schema's fields: their types from the
 * schema, with `overrides` for the Arrow types of some of them, checked
 * against the schema. Decimals have no default precision and scale.
 *
 * @internal
 */
export const declare = (
  schema: { readonly ast: AST.AST },
  overrides: { readonly [name: string]: S.DataType | undefined } | undefined
): Array<Plan.TableColumn> => fieldsOf(structOf(schema), "").map((c) => declareColumn(c.name, c, overrides?.[c.name]))

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
 * The Arrow schema of a struct schema's declared columns, with `overrides`
 * for the types of some of them.
 *
 * @internal
 */
export const toArrowSchema = (
  schema: { readonly ast: AST.AST },
  overrides: { readonly [name: string]: S.DataType | undefined } | undefined
): S.Schema => S.make(declare(schema, overrides).map((c) => S.field(c.name, arrowType(c), { nullable: c.nullable })))

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
      return V.fail(`column ${JSON.stringify(path)} has values that ${D.describe(target)} can't hold exactly`)
    }
  }
  return converted
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
  return expected.type === "Date" || expected.type === "Time" ? v : convert(path, v, arrowType(expected, path), rows)
}

/**
 * A test for values of a schema that it constrains beyond their column type
 * (literals, enums, template literals and checks), anywhere inside it, or
 * `undefined` when the column type says it all. Nulls pass: nullability is
 * checked with the column. Union members are tried in turn.
 */
const valuesCheck = (ast: AST.AST): ((value: unknown) => boolean) | undefined => {
  const own = ast.checks === undefined
    ? undefined
    : (value: unknown) => Result.isSuccess(AST.runChecks(ast.checks!, value))
  const inner = structural(ast)
  if (own === undefined) return inner
  return (value) => value === null || ((inner === undefined || inner(value)) && own(value))
}

const structural = (ast: AST.AST): ((value: unknown) => boolean) | undefined => {
  switch (ast._tag) {
    case "Literal":
    case "Enum":
    case "TemplateLiteral": {
      const is = Parser._is(AST.replaceChecks(ast, undefined))
      return (value) => value === null || is(value)
    }
    case "Suspend":
      return unsuspend(ast, "", valuesCheck)
    case "Union": {
      const members = ast.types.filter((t) => t._tag !== "Null" && t._tag !== "Undefined").map(valuesCheck)
      if (members.some((m) => m === undefined)) return undefined
      return (value) => value === null || members.some((m) => m!(value))
    }
    case "Arrays": {
      const item = valuesCheck(ast.rest[0])
      return item && ((value) => value === null || (value as ReadonlyArray<unknown>).every(item))
    }
    case "Objects": {
      const fields = ast.propertySignatures.flatMap((ps) => {
        const f = valuesCheck(ps.type)
        return f === undefined ? [] : [[ps.name, f] as const]
      })
      return fields.length === 0
        ? undefined
        : (value) => value === null || fields.every(([name, f]) => f((value as any)[name]))
    }
    default:
      return undefined
  }
}

/**
 * The fields of a struct schema whose values it constrains beyond their
 * column type, each with its test for those values.
 */
const valueChecks = (
  schema: { readonly ast: AST.AST }
): Array<readonly [name: string, test: (value: unknown) => boolean]> =>
  structOf(schema).propertySignatures.flatMap((ps) => {
    const test = valuesCheck(ps.type)
    return test === undefined ? [] : [[String(ps.name), test] as const]
  })

/** A test of whole rows against a struct schema's own checks; `undefined` without any. */
const rowsCheck = (schema: { readonly ast: AST.AST }): ((row: unknown) => boolean) | undefined => {
  const checks = structOf(schema).checks
  return checks && ((row) => Result.isSuccess(AST.runChecks(checks, row)))
}

/**
 * The {@link valueChecks} of a schema whose tables are checked column by
 * column, as a SQL engine checks them: a schema with checks on whole rows
 * (`Schema.Struct(...).check(...)`) fails.
 *
 * @internal
 */
export const columnChecks = (
  schema: { readonly ast: AST.AST }
): Array<readonly [name: string, test: (value: unknown) => boolean]> =>
  rowsCheck(schema) === undefined
    ? valueChecks(schema)
    : V.fail("schemas with checks on whole rows aren't supported on SQL tables; check their fields instead")

/**
 * Checks that a frame has the declared columns and narrows it to them, in
 * their order, converting each to its declared type (exactly: a value the
 * declared type can't hold fails). With a `schema`, the values of fields it
 * constrains beyond their column type, and its checks on whole rows, are
 * checked against it too.
 *
 * @internal
 */
export const conform = (
  frame: F.Frame,
  columns: ReadonlyArray<Plan.TableColumn>,
  schema?: { readonly ast: AST.AST } | undefined
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
  if (schema !== undefined) {
    for (const [name, test] of valueChecks(schema)) {
      if (!F.toArray(narrowed, name).every(test)) {
        return V.fail(`column ${JSON.stringify(name)} has values its schema rejects`)
      }
    }
    const rows = rowsCheck(schema)
    if (rows !== undefined && !F.toRows(narrowed).every(rows)) return V.fail("rows have values their schema rejects")
  }
  return narrowed
}
