/**
 * Arrow types for the fields of an Effect Schema struct.
 *
 * @internal
 */
import * as S from "../../arrow/ArrowSchema.ts"
import * as AST from "../../SchemaAST.ts"
import type * as Plan from "../Plan.ts"
import * as D from "./dtype.ts"
import * as F from "./frame.ts"
import * as V from "./vector.ts"

interface Mapped {
  readonly type: S.DataType
  readonly nullable: boolean
}

const literalType = (literal: unknown): S.DataType | undefined => {
  switch (typeof literal) {
    case "string":
      return S.utf8
    case "number":
      return S.float64
    case "boolean":
      return S.bool
    case "bigint":
      return S.int64
    default:
      return undefined
  }
}

const map = (ast: AST.AST, path: string): Mapped => {
  switch (ast._tag) {
    case "String":
    case "TemplateLiteral":
      return { type: S.utf8, nullable: false }
    case "Number":
      return { type: S.float64, nullable: false }
    case "Boolean":
      return { type: S.bool, nullable: false }
    case "BigInt":
      return { type: S.int64, nullable: false }
    case "Null":
    case "Undefined":
      return { type: S.nullType, nullable: true }
    case "Literal": {
      const type = literalType(ast.literal)
      return type === undefined ? unsupported(ast, path) : { type, nullable: false }
    }
    case "Enum": {
      const kinds = new Set(ast.enums.map(([, v]) => typeof v))
      return kinds.size === 1 && kinds.has("string")
        ? { type: S.utf8, nullable: false }
        : kinds.size === 1
        ? { type: S.float64, nullable: false }
        : unsupported(ast, path)
    }
    case "Union": {
      let type: S.DataType | undefined
      let nullable = false
      for (const member of ast.types) {
        const m = map(member, path)
        nullable ||= m.nullable
        if (m.type._tag === "Null") continue
        if (type === undefined) type = m.type
        else if (type._tag !== m.type._tag) return unsupported(ast, path)
      }
      return { type: type ?? S.nullType, nullable }
    }
    case "Suspend":
      return map(ast.thunk(), path)
    case "Arrays": {
      const element = ast.rest[0]
      if (ast.elements.length > 0 || element === undefined || ast.rest.length > 1) return unsupported(ast, path)
      const m = map(element, `${path}[]`)
      return { type: S.list(S.field("item", m.type, { nullable: m.nullable })), nullable: false }
    }
    case "Objects": {
      if (ast.indexSignatures.length > 0) return unsupported(ast, path)
      const fields = ast.propertySignatures.map((ps) => {
        const name = String(ps.name)
        const m = map(ps.type, `${path}.${name}`)
        return S.field(name, m.type, { nullable: m.nullable || AST.isOptional(ps.type) })
      })
      return { type: S.struct(fields), nullable: false }
    }
    case "Declaration": {
      const id = (ast.annotations as { readonly representation?: { readonly id?: unknown } } | undefined)
        ?.representation?.id
      if (id === "effect/schema/DateTimeUtc") return { type: S.timestamp("microsecond"), nullable: false }
      if (id === "effect/schema/Duration") return { type: S.duration("microsecond"), nullable: false }
      if (id === "effect/schema/BigDecimal") {
        return V.fail(
          `field ${
            JSON.stringify(path)
          }: decimal columns need a precision and scale: pass options.types (for example ArrowSchema.decimal(18, 2))`
        )
      }
      return unsupported(ast, path)
    }
    default:
      return unsupported(ast, path)
  }
}

const unsupported = (ast: AST.AST, path: string): never =>
  V.fail(`field ${JSON.stringify(path)}: schemas of kind ${ast._tag} have no DataFrame column type yet`)

/** The Arrow schema of a struct schema's type side. @internal */
export const toArrowSchema = (
  schema: { readonly ast: AST.AST },
  overrides: { readonly [name: string]: S.DataType | undefined } | undefined
): S.Schema => {
  const ast = AST.toType(schema.ast)
  if (ast._tag !== "Objects") return V.fail("DataFrame rows must be described by a struct schema")
  return S.make(ast.propertySignatures.map((ps) => {
    const name = String(ps.name)
    const m = map(ps.type, name)
    const type = overrides?.[name] ?? m.type
    return S.field(name, type, { nullable: m.nullable || AST.isOptional(ps.type) })
  }))
}

// -----------------------------------------------------------------------------
// Types of table columns
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
    default:
      return t._tag as Plan.TypeName
  }
}

const kind = (name: string): string =>
  name.startsWith("Int") || name.startsWith("UInt") ? "Int" : name.startsWith("Float") ? "Float" : name

/** Columns of an Effect-Schema-derived Arrow schema, as table columns. @internal */
export const tableColumns = (schema: S.Schema): Array<Plan.TableColumn> =>
  schema.fields.map((f) => ({ name: f.name, type: typeName(f.type), nullable: f.nullable }))

/**
 * Checks that a frame has the expected columns and narrows it to them.
 *
 * @internal
 */
export const conform = (frame: F.Frame, columns: ReadonlyArray<Plan.TableColumn>): F.Frame => {
  for (const expected of columns) {
    const c = frame.columns.find((c) => c.name === expected.name)
    if (c === undefined) return V.fail(`missing column ${JSON.stringify(expected.name)}`)
    const actual = typeName(c.type)
    const compatible = kind(actual) === kind(expected.type) ||
      (kind(expected.type) === "Float" && c.type._tag === "Int" && c.type.bitWidth < 64) ||
      (expected.type === "Null" && expected.nullable)
    if (!compatible) {
      return V.fail(`column ${JSON.stringify(expected.name)} is ${actual}, expected ${expected.type}`)
    }
    if (!expected.nullable && V.nullCount(c.values()) > 0) {
      return V.fail(`column ${JSON.stringify(expected.name)} has missing values`)
    }
  }
  return F.pick(frame, columns.map((c) => c.name))
}
