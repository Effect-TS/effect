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
import * as Values from "../../arrow/internal/values.ts"
import { identity } from "../../Function.ts"
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
// Missing values
// -----------------------------------------------------------------------------

type Missing = "null" | "undefined" | "absent"

/**
 * How a schema writes the values a frame stores. A frame holds `null` for
 * every missing value, and a schema writes one as `null`, as `undefined`
 * or as an absent key: `missing` is the one it writes where values can be
 * missing, for a list's items and a struct's fields too.
 */
interface Shape {
  readonly missing?: Missing | undefined
  readonly item?: Shape | undefined
  readonly fields?: ReadonlyArray<readonly [name: string, shape: Shape]> | undefined
}

const written: { readonly [M in Missing]: string } = { null: "null", undefined: "undefined", absent: "an absent key" }

/**
 * The shape of the values of a schema, the type of an `optional` key or
 * not. `seen` says that a check around them is handed these values (one of
 * a struct, an array or a union they are in).
 *
 * A check must be handed what the schema describes, so a missing value it
 * sees needs one way of being written. An optional field's is an absent
 * key, whether or not its type has `undefined` too. It fails when the
 * schema writes it as `null` and another way.
 */
const shapeOf = (ast: AST.AST, path: string, seen: boolean, optional = false): Shape => {
  const ways = new Set<Missing>(optional ? ["absent"] : [])
  const members: Array<Shape> = []
  // Whether a check inside this field is handed a missing value.
  let own = false
  const visit = (ast: AST.AST, checked: boolean): void => {
    checked ||= ast.checks !== undefined
    switch (ast._tag) {
      case "Null":
      case "Undefined":
        ways.add(ast._tag === "Null" ? "null" : "undefined")
        own ||= checked
        return
      case "Suspend":
        return unsuspend(ast, "", (inner) => visit(inner, checked))
      case "Union":
        // Matching exactly one member tells the members apart, as a check does.
        return ast.types.forEach((member) => visit(member, checked || ast.options?.mode === "oneOf"))
      case "Arrays":
        members.push({ item: shapeOf(ast.rest[0], `${path}[]`, seen || checked) })
        return
      case "Objects":
        members.push({
          fields: ast.propertySignatures.map((ps) => {
            const name = String(ps.name)
            return [name, shapeOf(ps.type, T.field(path, name), seen || checked, AST.isOptional(ps.type))] as const
          })
        })
    }
  }
  visit(ast, false)
  if (ways.size > 1 && ways.has("null") && (own || seen)) {
    V.fail(
      `field ${JSON.stringify(path)}: a check sees a missing value that the schema writes in several ways (${
        [...ways].map((way) => written[way]).join(", ")
      }), and a frame holds null for each of them`
    )
  }
  if (new Set(members.map((member) => JSON.stringify(member))).size > 1) {
    V.fail(
      `field ${JSON.stringify(path)}: the members of a union write missing values in different ways, ` +
        "and a frame holds null for each of them"
    )
  }
  const missing = ways.has("null")
    ? "null"
    : ways.has("absent")
    ? "absent"
    : ways.has("undefined")
    ? "undefined"
    : undefined
  return { missing, ...members[0] }
}

/**
 * The values a frame stores for `shape`, as the schema writes them, or
 * `undefined` when it stores them that way.
 */
const restorer = (shape: Shape): ((value: unknown) => unknown) | undefined => {
  const present = shape.item !== undefined
    ? items(shape.item)
    : shape.fields !== undefined
    ? struct(shape.fields)
    : undefined
  const missing = shape.missing === "undefined" ? undefined : null
  if (present === undefined && missing === null) return undefined
  return (value) => value === null ? missing : present === undefined ? value : present(value)
}

const items = (shape: Shape): ((value: unknown) => unknown) | undefined => {
  const item = restorer(shape)
  return item && ((value) => (value as ReadonlyArray<unknown>).map(item))
}

const struct = (shapes: NonNullable<Shape["fields"]>): ((value: unknown) => unknown) | undefined => {
  const fields = shapes.map(([name, shape]) => [name, shape.missing === "absent", restorer(shape)] as const)
  if (fields.every(([, absent, restore]) => !absent && restore === undefined)) return undefined
  return (value) => {
    const out: Record<string, unknown> = {}
    for (const [name, absent, restore] of fields) {
      const v = Values.getProperty(value as object, name)
      if (v === null && absent) continue
      Values.setProperty(out, name, restore === undefined ? v : restore(v))
    }
    return out
  }
}

// -----------------------------------------------------------------------------
// Checks
// -----------------------------------------------------------------------------

/**
 * Whether a schema constrains its values beyond their column type and
 * nullability, anywhere inside it: by a check, a literal, an enum, a
 * template literal, or a union that takes the values of exactly one member.
 */
const constrains = (ast: AST.AST): boolean => {
  if (ast.checks !== undefined) return true
  switch (ast._tag) {
    case "Literal":
    case "Enum":
    case "TemplateLiteral":
      return true
    case "Suspend":
      return unsuspend(ast, "", constrains)
    case "Union":
      return ast.options?.mode === "oneOf" || ast.types.some(constrains)
    case "Arrays":
      return constrains(ast.rest[0])
    case "Objects":
      return ast.propertySignatures.some((ps) => constrains(ps.type))
    default:
      return false
  }
}

/**
 * The tests of a struct schema: one for each field whose values it
 * constrains beyond their column type, and one of whole rows when the struct
 * has checks of its own. `undefined` when the column types say it all.
 *
 * The tests take values and rows as a frame stores them, and hand them to
 * the schema as it writes them (see {@link shapeOf}). A field's test is the
 * schema's own: a value passes when the field's type has it, so checks run
 * on every value that reaches them (`null` too) and unions match as they
 * do in Schema. An absent key has no value to test.
 */
const checksOf = (ast: AST.Objects): Plan.TableChecks | undefined => {
  const checks = ast.checks
  const shapes: Array<readonly [string, Shape]> = []
  const columns = ast.propertySignatures.flatMap((ps) => {
    const name = String(ps.name)
    const constrained = constrains(ps.type)
    if (!constrained && checks === undefined) return []
    const shape = shapeOf(ps.type, name, checks !== undefined, AST.isOptional(ps.type))
    shapes.push([name, shape])
    if (!constrained) return []
    const is = Parser._is(ps.type)
    const restore = restorer(shape) ?? identity
    const absent = shape.missing === "absent"
    return [[name, (value: unknown) => (absent && value === null) || is(restore(value))] as const]
  })
  // With checks of rows, every field has its shape.
  const restore = checks && struct(shapes)
  const rows = checks &&
    ((row: unknown) => Result.isSuccess(AST.runChecks(checks, restore === undefined ? row : restore(row))))
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
