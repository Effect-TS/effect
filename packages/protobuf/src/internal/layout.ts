/**
 * Compiles the encoded side of an Effect schema into a protobuf message
 * layout. The layout drives the binary codec, the proto3 JSON codec, `.proto`
 * rendering, and the Connect transport.
 *
 * PROTOTYPE.
 */
import * as Schema from "effect/Schema"
import * as SchemaAST from "effect/SchemaAST"
import {
  EnumKey,
  type FieldAnnotation,
  FieldKey,
  getAnnotation,
  protoCamelCase,
  protoSnakeCase,
  ScalarKey,
  type ScalarType,
  WktKey,
  WrapperKey
} from "./annotations.ts"

// -----------------------------------------------------------------------------
// model
// -----------------------------------------------------------------------------

/** @internal */
export type ValueType =
  | ScalarValue
  | EnumValue
  | MessageValue
  | WktValue
  | ConvertValue

/** @internal */
export interface ScalarValue {
  readonly _: "scalar"
  readonly scalar: ScalarType
  /** 64-bit integers represented as JS `number` instead of `bigint`. */
  readonly int64AsNumber: boolean
  /** Wrapped in the matching `google.protobuf.*Value` message. */
  readonly wrapper: boolean
}

/** @internal */
export interface EnumDesc {
  readonly typeName: string | undefined
  readonly values: ReadonlyArray<{ readonly name: string; readonly number: number; readonly value: unknown }>
  readonly byNumber: ReadonlyMap<number, { readonly name: string; readonly value: unknown }>
  readonly byValue: ReadonlyMap<unknown, { readonly name: string; readonly number: number }>
  readonly byName: ReadonlyMap<string, { readonly number: number; readonly value: unknown }>
}

/** @internal */
export interface EnumValue {
  readonly _: "enum"
  readonly desc: EnumDesc
}

/** @internal */
export interface MessageValue {
  readonly _: "message"
  readonly desc: MessageDesc
}

/** @internal */
export type WktKind = "timestamp" | "timestampDate" | "duration" | "value" | "struct" | "listValue"

/** @internal */
export interface WktValue {
  readonly _: "wkt"
  readonly wkt: WktKind
}

/**
 * A declaration without a native mapping: values go through its JSON codec and
 * the JSON form is laid out structurally.
 *
 * @internal
 */
export interface ConvertValue {
  readonly _: "convert"
  readonly inner: ValueType
  readonly toWire: (value: unknown) => unknown
  readonly fromWire: (value: unknown) => unknown
}

/**
 * How a field is represented when it is absent on the wire.
 *
 * - `"zero"`: implicit presence, absent decodes to the zero value
 * - `"omit"`: the property key is left out
 * - `"null"` / `"undefined"`: the property is set to that value
 * - `"none"`: the property is `Option.none()`
 * - `"required"`: explicit presence but the schema requires a value; absence is
 *   left to the schema to report
 *
 * @internal
 */
export type Absent = "zero" | "omit" | "null" | "undefined" | "none" | "required"

/** @internal */
export interface FieldEntry {
  readonly _: "field"
  readonly key: string
  readonly name: string
  readonly jsonName: string
  readonly number: number
  readonly card: "singular" | "repeated" | "map"
  readonly type: ValueType
  readonly mapKey: ScalarType | undefined
  readonly absent: Absent
  readonly packed: boolean
}

/** @internal */
export interface OneofCase {
  readonly number: number
  readonly name: string
  readonly jsonName: string
  readonly type: ValueType
  readonly guard: (encoded: unknown) => boolean
  /**
   * Set when the member is a struct carrying a single wire field next to its
   * literal discriminators: the case value is that field, the literals are
   * restored on decode.
   */
  readonly unwrap: { readonly key: string; readonly literals: ReadonlyArray<readonly [string, unknown]> } | undefined
}

/** @internal */
export interface OneofEntry {
  readonly _: "oneof"
  readonly key: string
  readonly name: string
  readonly absent: Absent
  readonly cases: ReadonlyArray<OneofCase>
}

/** @internal */
export interface MessageDesc {
  typeName: string | undefined
  readonly ast: SchemaAST.AST
  readonly entries: Array<FieldEntry | OneofEntry>
  readonly literals: Array<readonly [string, unknown]>
  readonly byNumber: Map<
    number,
    { readonly entry: FieldEntry } | { readonly entry: OneofEntry; readonly case: OneofCase }
  >
  /** Wire order: field numbers ascending. */
  readonly sorted: Array<{ readonly entry: FieldEntry } | { readonly entry: OneofEntry; readonly case: OneofCase }>
  readonly byJsonName: Map<
    string,
    { readonly entry: FieldEntry } | { readonly entry: OneofEntry; readonly case: OneofCase }
  >
}

/**
 * The root of a codec: a message, or an empty message for `Void`.
 *
 * @internal
 */
export type Root = { readonly _: "message"; readonly desc: MessageDesc } | { readonly _: "void" }

/** @internal */
export class LayoutError extends Error {
  override readonly name = "Protobuf.LayoutError"
}

// -----------------------------------------------------------------------------
// AST helpers
// -----------------------------------------------------------------------------

interface Resolved {
  readonly ast: SchemaAST.AST
  /** Identifier found on the outermost node of the encoding chain. */
  readonly identifier: string | undefined
  /** Merged annotations of all nodes in the chain (outermost wins). */
  readonly annotations: Record<string, unknown>
}

const ownIdentifier = (ast: SchemaAST.AST): string | undefined => {
  const id = ast.annotations?.identifier
  return typeof id === "string" ? id : undefined
}

/**
 * Follows the encoding chain of a node to its encoded side, collecting
 * identifier and protobuf annotations along the way.
 */
const resolveEncoded = (ast: SchemaAST.AST): Resolved => {
  let identifier: string | undefined
  const annotations: Record<string, unknown> = {}
  const collect = (node: SchemaAST.AST) => {
    identifier ??= ownIdentifier(node)
    for (const key of [ScalarKey, WrapperKey, EnumKey, WktKey]) {
      if (annotations[key] === undefined) {
        const value = getAnnotation(node, key)
        if (value !== undefined) annotations[key] = value
      }
    }
  }
  for (;;) {
    collect(ast)
    if (ast.encoding) {
      ast = ast.encoding[ast.encoding.length - 1].to
      continue
    }
    if (ast._tag === "Suspend") {
      ast = ast.thunk()
      continue
    }
    return { ast, identifier, annotations }
  }
}

/** Collects key annotations along a property's encoding chain. */
const keyAnnotations = (ast: SchemaAST.AST): Record<string, unknown> => {
  const out: Record<string, unknown> = {}
  for (;;) {
    const ctx = ast.context?.annotations
    if (ctx) {
      for (const key of Object.keys(ctx)) if (out[key] === undefined) out[key] = ctx[key]
    }
    if (!ast.encoding) return out
    ast = ast.encoding[ast.encoding.length - 1].to
  }
}

const representationId = (ast: SchemaAST.AST): string | undefined => {
  const rep = ast.annotations?.representation as { readonly id?: unknown } | undefined
  return typeof rep?.id === "string" ? rep.id : undefined
}

const isNullish = (ast: SchemaAST.AST) => ast._tag === "Null" || ast._tag === "Undefined" || ast._tag === "Void"

const isLiteral = (ast: SchemaAST.AST): ast is SchemaAST.Literal => ast._tag === "Literal"

const isInt64Scalar = (s: ScalarType) =>
  s === "int64" || s === "uint64" || s === "sint64" || s === "fixed64" || s === "sfixed64"

/** @internal */
export const isPackable = (type: ValueType): boolean =>
  (type._ === "scalar" && !type.wrapper && type.scalar !== "string" && type.scalar !== "bytes") ||
  type._ === "enum"

/** @internal */
export const wrapperTypeName = (scalar: ScalarType): string => {
  switch (scalar) {
    case "double":
      return "google.protobuf.DoubleValue"
    case "float":
      return "google.protobuf.FloatValue"
    case "int64":
      return "google.protobuf.Int64Value"
    case "uint64":
      return "google.protobuf.UInt64Value"
    case "int32":
      return "google.protobuf.Int32Value"
    case "uint32":
      return "google.protobuf.UInt32Value"
    case "bool":
      return "google.protobuf.BoolValue"
    case "string":
      return "google.protobuf.StringValue"
    case "bytes":
      return "google.protobuf.BytesValue"
    default:
      throw new LayoutError(`Protobuf: no wrapper type for scalar ${scalar}`)
  }
}

// -----------------------------------------------------------------------------
// compiler
// -----------------------------------------------------------------------------

const messageMemo = new WeakMap<SchemaAST.AST, MessageDesc>()
const rootMemo = new WeakMap<SchemaAST.AST, Root>()

/** @internal */
export const compileRoot = (ast: SchemaAST.AST): Root => {
  const cached = rootMemo.get(ast)
  if (cached) return cached
  const resolved = resolveEncoded(ast)
  let root: Root
  if (isNullish(resolved.ast)) {
    root = { _: "void" }
  } else if (resolved.ast._tag === "Objects" && resolved.ast.indexSignatures.length === 0) {
    root = { _: "message", desc: compileMessage(resolved.ast, resolved.identifier) }
  } else {
    throw new LayoutError(
      `Protobuf: the root schema must be a struct (message) or Void, got ${resolved.ast._tag}`
    )
  }
  rootMemo.set(ast, root)
  return root
}

const compileMessage = (ast: SchemaAST.Objects, identifier: string | undefined): MessageDesc => {
  const cached = messageMemo.get(ast)
  if (cached) {
    cached.typeName ??= identifier
    return cached
  }
  const desc: MessageDesc = {
    typeName: identifier,
    ast,
    entries: [],
    literals: [],
    byNumber: new Map(),
    sorted: [],
    byJsonName: new Map()
  }
  messageMemo.set(ast, desc)
  const where = () => identifier ?? "<anonymous struct>"
  if (ast.indexSignatures.length > 0) {
    throw new LayoutError(`Protobuf: ${where()} mixes properties and index signatures`)
  }
  for (const ps of ast.propertySignatures) {
    if (typeof ps.name !== "string") {
      throw new LayoutError(`Protobuf: ${where()} has a non-string property key`)
    }
    const entry = compileProperty(desc, ps.name, ps.type, where)
    if (entry !== undefined) desc.entries.push(entry)
  }
  const register = (number: number, slot: MessageDesc["sorted"][number]) => {
    if (desc.byNumber.has(number)) {
      throw new LayoutError(`Protobuf: duplicate field number ${number} in ${where()}`)
    }
    desc.byNumber.set(number, slot)
    desc.sorted.push(slot)
  }
  for (const entry of desc.entries) {
    if (entry._ === "field") {
      const slot = { entry }
      register(entry.number, slot)
      desc.byJsonName.set(entry.jsonName, slot)
      desc.byJsonName.set(entry.name, slot)
    } else {
      for (const c of entry.cases) {
        const slot = { entry, case: c }
        register(c.number, slot)
        desc.byJsonName.set(c.jsonName, slot)
        desc.byJsonName.set(c.name, slot)
      }
    }
  }
  desc.sorted.sort((a, b) => slotNumber(a) - slotNumber(b))
  return desc
}

const slotNumber = (slot: MessageDesc["sorted"][number]) => "case" in slot ? slot.case.number : slot.entry.number

const fieldAnnotation = (annotations: Record<string, unknown>): FieldAnnotation | undefined =>
  annotations[FieldKey] as FieldAnnotation | undefined

const compileProperty = (
  parent: MessageDesc,
  key: string,
  type: SchemaAST.AST,
  where: () => string
): FieldEntry | OneofEntry | undefined => {
  const keyAnn = keyAnnotations(type)
  const optionalKey = SchemaAST.isOptional(type)
  let resolved = resolveEncoded(type)
  let ast = resolved.ast

  // literal properties are constants and never go on the wire
  if (isLiteral(ast)) {
    parent.literals.push([key, ast.literal])
    return undefined
  }

  let absent: Absent | undefined = optionalKey ? "omit" : undefined

  // `Option<A>` fields use explicit presence
  if (ast._tag === "Declaration" && representationId(ast) === "effect/schema/Option") {
    absent = "none"
    resolved = resolveEncoded(ast.typeParameters[0])
    ast = resolved.ast
  }

  // nullable / undefined-able fields use explicit presence
  if (ast._tag === "Union") {
    const union = ast
    const members = union.types.map(resolveEncoded)
    const nullish = members.filter((m) => isNullish(m.ast))
    const rest = members.filter((m) => !isNullish(m.ast))
    if (nullish.length > 0) {
      absent ??= nullish.some((m) => m.ast._tag === "Null") ? "null" : "undefined"
      if (rest.length === 1) {
        resolved = rest[0]
        ast = resolved.ast
      }
    }
    // a non-nullable union with a single member (`Schema.Union([X])`) is a
    // oneof with one case
    if ((rest.length > 1 || nullish.length === 0) && !rest.every((m) => isLiteral(m.ast))) {
      return compileOneof(
        key,
        union.types.filter((t) => !isNullish(resolveEncoded(t).ast)),
        absent ?? "required",
        where
      )
    }
  }

  const ann = fieldAnnotation(keyAnn)
  if (ann === undefined) {
    throw new LayoutError(
      `Protobuf: property "${key}" of ${where()} has no field number; annotate it with Protobuf.field(n)`
    )
  }
  validateFieldNumber(ann.number, key, where)
  const name = ann.name ?? protoSnakeCase(key)
  const jsonName = ann.jsonName ?? protoCamelCase(name)

  const wkt = resolved.annotations[WktKey] as WktKind | undefined
  if (wkt !== undefined) {
    return {
      _: "field",
      key,
      name,
      jsonName,
      number: ann.number,
      card: "singular",
      type: { _: "wkt", wkt },
      mapKey: undefined,
      absent: absent ?? "required",
      packed: false
    }
  }

  // repeated
  if (ast._tag === "Arrays") {
    if (ast.elements.length > 0 || ast.rest.length === 0) {
      throw new LayoutError(`Protobuf: property "${key}" of ${where()} is a tuple; only arrays are supported`)
    }
    for (const r of ast.rest) {
      if (r !== ast.rest[0] && resolveEncoded(r).ast !== resolveEncoded(ast.rest[0]).ast) {
        throw new LayoutError(`Protobuf: property "${key}" of ${where()} is a non-uniform array`)
      }
    }
    const element = compileValue(ast.rest[0], () => `${where()}.${key}[]`)
    return {
      _: "field",
      key,
      name,
      jsonName,
      number: ann.number,
      card: "repeated",
      type: element,
      mapKey: undefined,
      absent: absent ?? "zero",
      packed: ann.packed ?? isPackable(element)
    }
  }

  // map
  if (ast._tag === "Objects" && ast.propertySignatures.length === 0 && ast.indexSignatures.length === 1) {
    const is = ast.indexSignatures[0]
    return {
      _: "field",
      key,
      name,
      jsonName,
      number: ann.number,
      card: "map",
      type: compileValue(is.type, () => `${where()}.${key}{}`),
      mapKey: mapKeyScalar(is.parameter, key, where),
      absent: absent ?? "zero",
      packed: false
    }
  }

  const value = compileValue(resolved.ast, () => `${where()}.${key}`, resolved)
  if (absent === undefined) {
    // messages always track presence; a required message field is left to the
    // schema to report when missing
    absent = value._ === "message" || value._ === "wkt" || (value._ === "scalar" && value.wrapper) ||
        value._ === "convert"
      ? "required"
      : "zero"
  }
  return {
    _: "field",
    key,
    name,
    jsonName,
    number: ann.number,
    card: "singular",
    type: value,
    mapKey: undefined,
    absent,
    packed: false
  }
}

const validateFieldNumber = (n: number, key: string, where: () => string) => {
  if (!Number.isInteger(n) || n < 1 || n > 536870911 || (n >= 19000 && n <= 19999)) {
    throw new LayoutError(`Protobuf: invalid field number ${n} for "${key}" of ${where()}`)
  }
}

const mapKeyScalar = (parameter: SchemaAST.AST, key: string, where: () => string): ScalarType => {
  const resolved = resolveEncoded(parameter)
  const scalar = resolved.annotations[ScalarKey] as ScalarType | undefined
  if (scalar !== undefined) {
    if (scalar === "double" || scalar === "float" || scalar === "bytes") {
      throw new LayoutError(`Protobuf: map key of "${key}" in ${where()} cannot be ${scalar}`)
    }
    return scalar
  }
  switch (resolved.ast._tag) {
    case "String":
    case "TemplateLiteral":
      return "string"
    case "Number":
      return "int32"
    default:
      throw new LayoutError(`Protobuf: unsupported map key for "${key}" in ${where()}: ${resolved.ast._tag}`)
  }
}

const compileOneof = (
  key: string,
  members: ReadonlyArray<SchemaAST.AST>,
  absent: Absent,
  where: () => string
): OneofEntry => {
  const cases: Array<OneofCase> = []
  for (const member of members) {
    const memberAnn = fieldAnnotation(keyAnnotations(member))
    const resolved = resolveEncoded(member)
    const guard = Schema.is(Schema.make(SchemaAST.toEncoded(member)))
    const discriminator = resolved.ast._tag === "Objects" ? discriminatorOf(resolved.ast) : undefined
    if (memberAnn !== undefined) {
      validateFieldNumber(memberAnn.number, key, where)
      const name = memberAnn.name ?? (discriminator !== undefined ? protoSnakeCase(discriminator) : undefined)
      if (name === undefined) {
        throw new LayoutError(
          `Protobuf: oneof member ${cases.length} of "${key}" in ${where()} needs a name: use Protobuf.field(n, { name })`
        )
      }
      cases.push({
        number: memberAnn.number,
        name,
        jsonName: memberAnn.jsonName ?? protoCamelCase(name),
        type: compileValue(member, () => `${where()}.${key}`),
        guard,
        unwrap: undefined
      })
      continue
    }
    if (resolved.ast._tag === "Objects") {
      const literals: Array<readonly [string, unknown]> = []
      const wire: Array<SchemaAST.PropertySignature> = []
      for (const ps of resolved.ast.propertySignatures) {
        const r = resolveEncoded(ps.type)
        if (isLiteral(r.ast)) literals.push([String(ps.name), r.ast.literal])
        else wire.push(ps)
      }
      if (wire.length === 1 && typeof wire[0].name === "string") {
        const ps = wire[0]
        const ann = fieldAnnotation(keyAnnotations(ps.type))
        if (ann !== undefined) {
          validateFieldNumber(ann.number, key, where)
          const name = ann.name ?? protoSnakeCase(discriminator ?? (ps.name as string))
          cases.push({
            number: ann.number,
            name,
            jsonName: ann.jsonName ?? protoCamelCase(name),
            type: compileValue(ps.type, () => `${where()}.${key}`),
            guard,
            unwrap: { key: ps.name as string, literals }
          })
          continue
        }
      }
    }
    throw new LayoutError(
      `Protobuf: member ${cases.length} of union "${key}" in ${where()} is not a oneof case; ` +
        `annotate the member with Protobuf.field(n), or make it a tagged struct with a single numbered field`
    )
  }
  return { _: "oneof", key, name: protoSnakeCase(key), absent, cases }
}

const discriminatorOf = (ast: SchemaAST.Objects): string | undefined => {
  for (const ps of ast.propertySignatures) {
    const r = resolveEncoded(ps.type)
    if (isLiteral(r.ast) && typeof r.ast.literal === "string") return r.ast.literal
  }
  return undefined
}

const compileValue = (ast: SchemaAST.AST, where: () => string, pre?: Resolved): ValueType => {
  const resolved = pre ?? resolveEncoded(ast)
  const node = resolved.ast
  const wkt = resolved.annotations[WktKey] as WktKind | undefined
  if (wkt !== undefined) return { _: "wkt", wkt }
  const scalarAnn = resolved.annotations[ScalarKey] as ScalarType | undefined
  const wrapper = resolved.annotations[WrapperKey] === true
  const scalar = (s: ScalarType, int64AsNumber = false): ScalarValue => ({
    _: "scalar",
    scalar: s,
    int64AsNumber,
    wrapper
  })
  switch (node._tag) {
    case "String":
    case "TemplateLiteral":
      return scalar("string")
    case "Boolean":
      return scalar("bool")
    case "Number": {
      const s = scalarAnn ?? "double"
      if (s === "string" || s === "bool" || s === "bytes") {
        throw new LayoutError(`Protobuf: ${where()} is a number but annotated as ${s}`)
      }
      return scalar(s, isInt64Scalar(s))
    }
    case "BigInt": {
      const s = scalarAnn ?? "int64"
      if (!isInt64Scalar(s)) throw new LayoutError(`Protobuf: ${where()} is a bigint but annotated as ${s}`)
      return scalar(s)
    }
    case "Enum":
      return { _: "enum", desc: enumFromEntries(resolved.identifier, node.enums, where) }
    case "Union": {
      const members = node.types.map((t) => resolveEncoded(t).ast)
      if (members.every(isLiteral)) {
        const mapping = resolved.annotations[EnumKey] as Record<string, number> | undefined
        const literals = members.map((m) => (m as SchemaAST.Literal).literal)
        if (mapping !== undefined) {
          return {
            _: "enum",
            desc: makeEnumDesc(
              resolved.identifier,
              literals.map((l) => {
                const n = mapping[String(l)]
                if (n === undefined) throw new LayoutError(`Protobuf: ${where()} has no enum number for ${String(l)}`)
                return { name: String(l), number: n, value: l }
              })
            )
          }
        }
        if (literals.every((l) => typeof l === "number")) {
          return {
            _: "enum",
            desc: makeEnumDesc(
              resolved.identifier,
              literals.map((l) => ({ name: `VALUE_${l}`, number: l as number, value: l }))
            )
          }
        }
        throw new LayoutError(
          `Protobuf: ${where()} is a union of literals; annotate it with Protobuf.enumNumbers({ ... })`
        )
      }
      throw new LayoutError(`Protobuf: ${where()} is a union; unions are only supported as oneof fields`)
    }
    case "Objects":
      if (node.indexSignatures.length > 0) {
        throw new LayoutError(`Protobuf: ${where()} is a record; records are only supported as map fields`)
      }
      return { _: "message", desc: compileMessage(node, resolved.identifier) }
    case "Arrays":
      throw new LayoutError(`Protobuf: ${where()} is a nested array; wrap the inner array in a message`)
    case "Declaration": {
      switch (representationId(node)) {
        case "effect/schema/DateTimeUtc":
          return { _: "wkt", wkt: "timestamp" }
        case "effect/schema/Date":
          return { _: "wkt", wkt: "timestampDate" }
        case "effect/schema/Duration":
          return { _: "wkt", wkt: "duration" }
        case "effect/schema/Uint8Array":
          return scalar("bytes")
        case "effect/schema/Json":
        case "effect/schema/MutableJson":
          return { _: "wkt", wkt: "value" }
        case "effect/schema/Option":
          throw new LayoutError(`Protobuf: ${where()} is an Option outside of a field position`)
      }
      if (typeof node.annotations?.toCodecJson === "function") {
        const codec = Schema.toCodecJson(Schema.make(node))
        const inner = compileValue(SchemaAST.toEncoded(codec.ast), where)
        return {
          _: "convert",
          inner,
          toWire: Schema.encodeUnknownSync(codec as any),
          fromWire: Schema.decodeUnknownSync(codec as any)
        }
      }
      throw new LayoutError(`Protobuf: ${where()} is a declaration without a protobuf mapping`)
    }
    case "Unknown":
    case "Any":
      return { _: "wkt", wkt: "value" }
    case "Literal":
      throw new LayoutError(`Protobuf: ${where()} is a literal outside of a struct property`)
    default:
      throw new LayoutError(`Protobuf: ${where()} has unsupported schema ${node._tag}`)
  }
}

const enumFromEntries = (
  identifier: string | undefined,
  enums: ReadonlyArray<readonly [string, string | number]>,
  where: () => string
): EnumDesc => {
  const values = enums.map(([name, value]) => {
    if (typeof value !== "number") {
      throw new LayoutError(`Protobuf: ${where()} enum member ${name} must have a numeric value`)
    }
    return { name, number: value, value }
  })
  return makeEnumDesc(identifier, values)
}

const makeEnumDesc = (
  typeName: string | undefined,
  values: ReadonlyArray<{ readonly name: string; readonly number: number; readonly value: unknown }>
): EnumDesc => ({
  typeName,
  values,
  byNumber: new Map(values.map((v) => [v.number, { name: v.name, value: v.value }])),
  byValue: new Map(values.map((v) => [v.value, { name: v.name, number: v.number }])),
  byName: new Map(values.map((v) => [v.name, { number: v.number, value: v.value }]))
})
