/**
 * Effect Schema at the boundary of frames: the declared columns of a struct
 * schema's fields, and its checks compiled to plain tests.
 *
 * A schema is read once, when a frame is built from rows or validated, or a
 * table is declared (`declare`). Everything after that works on the declared
 * columns and the compiled tests (see `./table.ts`), without the schema.
 *
 * Frames hold decoded values, so a schema describes the columns of its type
 * side and must not transform: a node with an encoding fails. Numbers are
 * Float64, timestamps and durations microseconds, unless an override says
 * otherwise, and decimals need one. `DateTimeZoned` fields have no column
 * type.
 *
 * @internal
 */
import type * as S from "../../arrow/ArrowSchema.ts"
import * as Result from "../../Result.ts"
import * as AST from "../../SchemaAST.ts"
import * as Parser from "../../SchemaParser.ts"
import type * as Plan from "../Plan.ts"
import * as T from "./table.ts"
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
    const column = columnOf(ps.type, T.field(path, name))
    return { name, ...column, nullable: column.nullable || AST.isOptional(ps.type) }
  })

/** The struct a schema describes its rows by. */
const structOf = (ast: AST.AST): AST.Objects => {
  const type = AST.toType(ast)
  return type._tag === "Objects" && type.indexSignatures.length === 0
    ? type
    : V.fail("DataFrame rows must be described by a struct schema")
}

const transformed = (path: string): never =>
  V.fail(
    `${path === "" ? "the schema" : `field ${JSON.stringify(path)}`} has a transformation: ` +
      "frames hold decoded values and transformations are not run; Schema.toType(schema) describes the decoded rows"
  )

/**
 * Fails when a schema on the way to a column has an encoding: its decoded
 * values differ from the encoded ones, and frames run no transformation.
 */
const rejectEncodings = (ast: AST.AST, path: string): void => {
  if (ast.encoding !== undefined) return transformed(path)
  switch (ast._tag) {
    case "Objects":
      return ast.propertySignatures.forEach((ps) => rejectEncodings(ps.type, T.field(path, String(ps.name))))
    case "Arrays":
      return [...ast.elements, ...ast.rest].forEach((item) => rejectEncodings(item, `${path}[]`))
    case "Union":
      return ast.types.forEach((member) => rejectEncodings(member, path))
    case "Suspend":
      return unsuspend(ast, `field ${JSON.stringify(path)}: `, (ast) => rejectEncodings(ast, path))
  }
}

// -----------------------------------------------------------------------------
// Checks
// -----------------------------------------------------------------------------

/**
 * A test for values of a schema that it constrains beyond their column type
 * (literals, enums, template literals and checks), anywhere inside it, or
 * `undefined` when the column type says it all. Missing values (`null`, and
 * `undefined` in rows that are not in a frame yet) pass: nullability is
 * checked with the column. Union members are tried in turn.
 */
const valuesCheck = (ast: AST.AST): ((value: unknown) => boolean) | undefined => {
  const own = ast.checks === undefined
    ? undefined
    : (value: unknown) => Result.isSuccess(AST.runChecks(ast.checks!, value))
  const inner = structural(ast)
  if (own === undefined) return inner
  return (value) => value == null || ((inner === undefined || inner(value)) && own(value))
}

/** Whether a schema holds only missing values, behind any `suspend`. */
const isMissing = (ast: AST.AST): boolean =>
  ast._tag === "Suspend" ? unsuspend(ast, "", isMissing) : ast._tag === "Null" || ast._tag === "Undefined"

const structural = (ast: AST.AST): ((value: unknown) => boolean) | undefined => {
  switch (ast._tag) {
    case "Literal":
    case "Enum":
    case "TemplateLiteral": {
      const is = Parser._is(AST.replaceChecks(ast, undefined))
      return (value) => value == null || is(value)
    }
    case "Suspend":
      return unsuspend(ast, "", valuesCheck)
    case "Union": {
      const members = ast.types.filter((t) => !isMissing(t)).map(valuesCheck)
      if (members.some((m) => m === undefined)) return undefined
      return (value) => value == null || members.some((m) => m!(value))
    }
    case "Arrays": {
      const item = valuesCheck(ast.rest[0])
      return item && ((value) => value == null || (value as ReadonlyArray<unknown>).every(item))
    }
    case "Objects": {
      const fields = ast.propertySignatures.flatMap((ps) => {
        const f = valuesCheck(ps.type)
        return f === undefined ? [] : [[ps.name, f] as const]
      })
      return fields.length === 0
        ? undefined
        : (value) => value == null || fields.every(([name, f]) => f((value as any)[name]))
    }
    default:
      return undefined
  }
}

/**
 * The tests of a struct schema: one for each field whose values it
 * constrains beyond their column type, and one of whole rows when the struct
 * has checks of its own. `undefined` when the column types say it all.
 */
const checksOf = (struct: AST.Objects): Plan.TableChecks | undefined => {
  const columns = struct.propertySignatures.flatMap((ps) => {
    const test = valuesCheck(ps.type)
    return test === undefined ? [] : [[String(ps.name), test] as const]
  })
  const checks = struct.checks
  const rows = checks && ((row: unknown) => Result.isSuccess(AST.runChecks(checks, row)))
  return columns.length === 0 && rows === undefined ? undefined : { columns, rows }
}

// -----------------------------------------------------------------------------
// Declarations
// -----------------------------------------------------------------------------

/**
 * A table as declared by a schema: its columns, and the tests of the values
 * and rows the columns' types don't rule out.
 *
 * @internal
 */
export interface Declared {
  readonly columns: Array<Plan.TableColumn>
  readonly checks: Plan.TableChecks | undefined
}

/**
 * The table a struct schema declares: the columns of its fields, with
 * `overrides` for the Arrow types of some of them, checked against the
 * schema, and its checks compiled. Decimals have no default precision and
 * scale. A schema that transforms its rows fails.
 *
 * An Arrow schema declares its fields as columns, without checks: no Effect
 * Schema is involved.
 *
 * @internal
 */
export const declare = (
  schema: { readonly ast: AST.AST } | S.Schema,
  overrides?: { readonly [name: string]: S.DataType | undefined } | undefined
): Declared => {
  if (!("ast" in schema)) return { columns: T.fromArrowSchema(schema), checks: undefined }
  const struct = structOf(schema.ast)
  const columns = fieldsOf(struct, "").map((c) => T.declareColumn(c.name, c, overrides?.[c.name]))
  // After the columns: a decoded side without column types fails for that first.
  rejectEncodings(schema.ast, "")
  return { columns, checks: checksOf(struct) }
}
