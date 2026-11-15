/**
 * Table columns for the fields of an Effect Schema struct: their Arrow types,
 * and the checks a frame must pass to be read as rows of the schema.
 *
 * @internal
 */
import * as S from "../../arrow/ArrowSchema.ts"
import * as AST from "../../SchemaAST.ts"
import * as Parser from "../../SchemaParser.ts"
import type * as Plan from "../Plan.ts"
import * as D from "./dtype.ts"
import * as F from "./frame.ts"
import * as V from "./vector.ts"

type Column = Omit<Plan.TableColumn, "name">

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
      const kinds = new Set(ast.enums.map(([, v]) => typeof v))
      return kinds.size === 1 && kinds.has("string")
        ? leaf("Utf8")
        : kinds.size === 1
        ? leaf("Float64")
        : unsupported(ast, path)
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
      return columnOf(ast.thunk(), path)
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

const fieldsOf = (ast: AST.Objects, prefix: string | undefined): Array<Plan.TableColumn> =>
  ast.propertySignatures.map((ps) => {
    const name = String(ps.name)
    const column = columnOf(ps.type, prefix === undefined ? name : `${prefix}.${name}`)
    return { name, ...column, nullable: column.nullable || AST.isOptional(ps.type) }
  })

const structOf = (schema: { readonly ast: AST.AST }): AST.Objects => {
  const ast = AST.toType(schema.ast)
  return ast._tag === "Objects" && ast.indexSignatures.length === 0
    ? ast
    : V.fail("DataFrame rows must be described by a struct schema")
}

/** The table columns of a struct schema's type side. @internal */
export const columns = (schema: { readonly ast: AST.AST }): Array<Plan.TableColumn> =>
  fieldsOf(structOf(schema), undefined)

const defaultType = (column: Plan.TableColumn, path: string): S.DataType => {
  switch (column.type) {
    case "List": {
      const item = column.fields![0]
      return S.list(S.field("item", defaultType(item, `${path}[]`), { nullable: item.nullable }))
    }
    case "Struct":
      return S.struct(
        column.fields!.map((f) => S.field(f.name, defaultType(f, `${path}.${f.name}`), { nullable: f.nullable }))
      )
    case "Utf8":
      return S.utf8
    case "Float64":
      return S.float64
    case "Bool":
      return S.bool
    case "Int64":
      return S.int64
    case "Null":
      return S.nullType
    case "Timestamp":
      return S.timestamp("microsecond")
    case "Duration":
      return S.duration("microsecond")
    case "Decimal":
      return V.fail(
        `field ${
          JSON.stringify(path)
        }: decimal columns need a precision and scale: pass options.types (for example ArrowSchema.decimal(18, 2))`
      )
    default:
      return V.fail(`field ${JSON.stringify(path)}: no default Arrow type for ${column.type}`)
  }
}

/**
 * The Arrow schema of a struct schema's type side, with `overrides` for the
 * types of some of its columns.
 *
 * @internal
 */
export const toArrowSchema = (
  schema: { readonly ast: AST.AST },
  overrides: { readonly [name: string]: S.DataType | undefined } | undefined
): S.Schema =>
  S.make(
    columns(schema).map((column) => {
      const override = overrides?.[column.name]
      if (override !== undefined && !compatible(override, column)) {
        return V.fail(
          `field ${JSON.stringify(column.name)}: ${describe(override)} can't hold values of ${describeColumn(column)}`
        )
      }
      return S.field(column.name, override ?? defaultType(column, column.name), { nullable: column.nullable })
    })
  )

// -----------------------------------------------------------------------------
// Checking frames
// -----------------------------------------------------------------------------

/** The plan type name of an Arrow type. @internal */
export const typeName = (t: S.DataType): Plan.TypeName => {
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
  const name = typeName(t)
  if (t._tag === "List" || t._tag === "LargeList") return `List<${describe(t.child.type)}>`
  return name
}

const describeColumn = (c: Column): string => c.type === "List" ? `List<${describeColumn(c.fields![0])}>` : c.type

/**
 * Whether a column of Arrow type `t` reads as values of the declared
 * column: integers below 64 bits for floats and narrower integers, 64-bit
 * integers (bigints) for 64-bit ones, any decimal for a decimal, temporal
 * types of the same kind in any unit, and lists and structs whose children
 * are compatible (unless `shallow`).
 */
const compatible = (t: S.DataType, expected: Column, shallow = false): boolean => {
  const actual = typeName(t)
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
    case "List":
      return (t._tag === "List" || t._tag === "LargeList") &&
        (shallow || expected.fields === undefined || compatible(t.child.type, expected.fields[0]))
    case "Struct":
      return t._tag === "Struct" &&
        (shallow || (expected.fields ?? []).every((f) => {
          const field = t.fields.find((g) => g.name === f.name)
          return field !== undefined && compatible(field.type, f)
        }))
    default:
      return actual === expected.type
  }
}

const allNull = (v: V.Vector, rows: Uint8Array | undefined): boolean => {
  for (let i = 0; i < v.length; i++) if ((rows === undefined || rows[i] === 1) && V.isValid(v, i)) return false
  return true
}

const check = (path: string, v: V.Vector, expected: Column, rows: Uint8Array | undefined): void => {
  if (!compatible(v.type, expected, true) && !(expected.type === "Null" && allNull(v, rows))) {
    return V.fail(`column ${JSON.stringify(path)} is ${describe(v.type)}, expected ${describeColumn(expected)}`)
  }
  if (!expected.nullable) {
    for (let i = 0; i < v.length; i++) {
      if ((rows === undefined || rows[i] === 1) && !V.isValid(v, i)) {
        return V.fail(`column ${JSON.stringify(path)} has missing values`)
      }
    }
  }
  if (expected.fields === undefined) return
  if (v.kind === "struct" && v.type._tag === "Struct") {
    const present = new Uint8Array(v.length)
    for (let i = 0; i < v.length; i++) present[i] = (rows === undefined || rows[i] === 1) && V.isValid(v, i) ? 1 : 0
    for (const f of expected.fields) {
      const k = v.type.fields.findIndex((g) => g.name === f.name)
      if (k === -1) return V.fail(`missing column ${JSON.stringify(`${path}.${f.name}`)}`)
      check(`${path}.${f.name}`, v.children[k], f, present)
    }
  } else if (v.kind === "list") {
    const present = new Uint8Array(v.child.length)
    for (let i = 0; i < v.length; i++) {
      if ((rows === undefined || rows[i] === 1) && V.isValid(v, i)) present.fill(1, v.offsets[i], v.offsets[i + 1])
    }
    check(`${path}[]`, v.child, expected.fields[0], present)
  }
}

const refined = (ast: AST.AST): boolean =>
  ast.checks !== undefined || ast._tag === "Literal" || ast._tag === "Enum" || ast._tag === "TemplateLiteral"

/**
 * A test for the values of a field whose schema constrains them beyond its
 * column type (literals, enums, template literals and refinements), or
 * `undefined` when the column type says it all. Nulls pass: nullability is
 * checked with the column.
 */
const valuesCheck = (ast: AST.AST): ((value: unknown) => boolean) | undefined => {
  if (refined(ast)) {
    const is = Parser._is(ast)
    return (value) => value === null || is(value)
  }
  switch (ast._tag) {
    case "Suspend":
      return valuesCheck(ast.thunk())
    case "Union": {
      const members = ast.types.filter((t) => t._tag !== "Null" && t._tag !== "Undefined")
      if (members.length === 1) return valuesCheck(members[0])
      if (!members.some(refined)) return undefined
      const is = Parser._is(ast)
      return (value) => value === null || is(value)
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
 * Checks that a frame has the expected columns and narrows it to them. With
 * a `schema`, the values of fields it constrains beyond their column type are
 * checked against it too.
 *
 * @internal
 */
export const conform = (
  frame: F.Frame,
  columns: ReadonlyArray<Plan.TableColumn>,
  schema?: { readonly ast: AST.AST } | undefined
): F.Frame => {
  for (const expected of columns) {
    const c = frame.columns.find((c) => c.name === expected.name)
    if (c === undefined) return V.fail(`missing column ${JSON.stringify(expected.name)}`)
    check(expected.name, c.values(), expected, undefined)
  }
  const narrowed = F.pick(frame, columns.map((c) => c.name))
  if (schema !== undefined) {
    for (const ps of structOf(schema).propertySignatures) {
      const test = valuesCheck(ps.type)
      const name = String(ps.name)
      if (test !== undefined && !F.toArray(narrowed, name).every(test)) {
        return V.fail(`column ${JSON.stringify(name)} has values its schema rejects`)
      }
    }
  }
  return narrowed
}
