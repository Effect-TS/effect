// Compiles a schema AST into its layout, and rejects schemas without a protobuf
// mapping. It maps the encoded side of each node through a fixed table and the
// protobuf annotations, and infers nothing else.

import * as SchemaAST from "../../SchemaAST.ts"
import * as L from "./layout.ts"
import * as ProtobufSchema from "./schema.ts"

// Messages by the AST body they are compiled from, so that a message used at
// several positions, or recursively, is compiled once.
interface Compiler {
  readonly structs: Map<SchemaAST.AST, L.Message>
  readonly extensions: ExtensionsOf | undefined
}

/**
 * The extensions of a message, by its full name, that decoding checks.
 *
 * @internal
 */
export type ExtensionsOf = (
  message: string
) => ReadonlyArray<{ readonly ast: SchemaAST.AST; readonly annotation: ProtobufSchema.FieldAnnotation }> | undefined

/** @internal */
export const compile = (ast: SchemaAST.AST, extensions?: ExtensionsOf): L.Root => {
  const c: Compiler = { structs: new Map(), extensions }
  const root = compileValue(c, ProtobufSchema.resolveEncoded(ast), "the root schema", true)
  if (root._tag === "Message" || root._tag === "Converted") return root
  throw L.layoutError("the root schema is not a message; use Protobuf.Message")
}

/**
 * Compiles a value as field `number` of a wrapper message, which is how
 * extensions are read from and written to unknown fields.
 *
 * @internal
 */
export const compileField = (
  ast: SchemaAST.AST,
  annotation: ProtobufSchema.FieldAnnotation,
  where: string
): L.MessageType => {
  return compileExtension({ structs: new Map(), extensions: undefined }, ast, annotation, where)
}

const compileExtension = (
  c: Compiler,
  ast: SchemaAST.AST,
  annotation: ProtobufSchema.FieldAnnotation,
  where: string
): L.MessageType => {
  if (annotation.required === true) throw L.layoutError(`${where} is an extension, which cannot be required`)
  const message = L.makeMessage(where, "wrapper")
  message.order.push(L.WRAPPED)
  // An extension has explicit presence, like an optional field.
  L.addSlot(message, compileSlot(c, L.WRAPPED, ProtobufSchema.resolveEncoded(ast), annotation, true, where))
  return L.messageType(L.finishMessage(message))
}

const compileStruct = (
  c: Compiler,
  ast: SchemaAST.Objects,
  resolved: ProtobufSchema.Resolved,
  where: string
): L.Message => {
  const owner = SchemaAST.getContextOwner(ast)
  const cached = c.structs.get(owner)
  if (cached !== undefined) return cached
  if (ast.indexSignatures.length > 0) {
    throw L.layoutError(`${where} is a struct with index signatures, which has no protobuf mapping`)
  }
  const name = resolved.annotations[ProtobufSchema.MESSAGE] as string | undefined
  if (name === undefined) throw L.layoutError(`${where} is a struct; use Protobuf.Message`)
  const message = L.makeMessage(name, "struct", { synthetic: false })
  c.structs.set(owner, message)
  for (const ps of ast.propertySignatures) {
    message.order.push(ps.name)
    const slot = compileProperty(c, message, ps.name, ps.type, `property ${L.describeKey(ps.name)} of ${name}`)
    if (slot !== undefined) L.addSlot(message, slot)
  }
  // The items of a MessageSet are checked when an extension is read.
  const messageSet = resolved.annotations[ProtobufSchema.MESSAGE_SET] === true
  const extensions = messageSet || c.extensions === undefined ? undefined : c.extensions(name)
  for (const extension of extensions ?? []) {
    if (message.byNumber.has(extension.annotation.number)) continue
    message.extensions.push(
      compileExtension(c, extension.ast, extension.annotation, `extension ${extension.annotation.number} of ${name}`)
    )
  }
  return L.finishMessage(message)
}

// Compiles a struct property: a slot, or the unknown fields of a message.
const compileProperty = (
  c: Compiler,
  message: L.Message,
  key: PropertyKey,
  type: SchemaAST.AST,
  where: string
): L.Slot | undefined => {
  const annotation = ProtobufSchema.getFieldAnnotation(type)
  const resolved = ProtobufSchema.resolveEncoded(type)

  // The `[Protobuf.unknown]` property of a `Protobuf.Message`.
  if (resolved.annotations[ProtobufSchema.UNKNOWN] === true) {
    message.unknown = key
    return undefined
  }
  const ast = resolved.ast

  if (resolved.annotations[ProtobufSchema.ONEOF] === true && ast._tag === "Union") {
    if (annotation !== undefined) throw L.layoutError(`${where} is a oneof; number its cases instead of the property`)
    return compileOneof(c, key, ast, where)
  }
  if (ast._tag === "Union" && resolved.annotations[ProtobufSchema.ENUM] === undefined) {
    throw L.layoutError(
      ast.types.some(isNullish)
        ? `${where} is nullable; use Schema.optionalKey for an optional field`
        : `${where} is a union; use Protobuf.Oneof`
    )
  }

  if (annotation === undefined) {
    throw L.layoutError(`${where} has no field number; annotate it with Protobuf.field(n)`)
  }
  return compileSlot(c, key, resolved, annotation, SchemaAST.isOptional(type), where)
}

// A numbered field: a repeated field, a map, or a singular field, which has
// explicit presence when it is `optional`.
const compileSlot = (
  c: Compiler,
  key: PropertyKey,
  resolved: ProtobufSchema.Resolved,
  annotation: ProtobufSchema.FieldAnnotation,
  optional: boolean,
  where: string
): L.Singular | L.Repeated | L.MapField => {
  const ast = resolved.ast
  const presence = { key, guarded: isGuarded(key) }
  const absent: L.Absent | undefined = optional ? "omit" : undefined
  const utf8 = annotation.validateUtf8 ?? true

  if (!isMessageLike(resolved) && ast._tag === "Arrays") {
    checkOptions(annotation, "repeated", where)
    const element = compileValue(c, ProtobufSchema.resolveEncoded(arrayElement(ast, where)), `${where} (element)`, utf8)
    if (annotation.packed === true && !L.isPackable(element)) throw L.layoutError(`${where} cannot be packed`)
    checkDelimited(annotation, element, where)
    return checkUtf8(annotation, {
      _tag: "Repeated",
      ...presence,
      number: annotation.number,
      element,
      absent: absent ?? "zero",
      packed: annotation.packed ?? L.isPackable(element),
      delimited: annotation.delimited === true
    }, where)
  }
  if (!isMessageLike(resolved) && ast._tag === "Objects" && isRecord(ast)) {
    checkOptions(annotation, "map", where)
    return checkUtf8(annotation, {
      _tag: "Map",
      ...presence,
      number: annotation.number,
      absent: absent ?? "zero",
      ...compileMap(c, ast.indexSignatures[0], resolved, where, utf8)
    }, where)
  }

  const value = compileValue(c, resolved, where, utf8)
  checkOptions(annotation, "singular", where)
  checkDelimited(annotation, value, where)
  const scalar = value._tag === "Scalar" || value._tag === "Enum"
  if (annotation.default !== undefined && !scalar) {
    throw L.layoutError(`${where} is not a scalar or enum; only those have a default`)
  }
  // A proto2 `required` scalar is always written, and fails to decode when it
  // is missing, like a required message.
  const required = annotation.required === true
  if (required && (optional || !scalar)) {
    throw L.layoutError(`${where} is not a required scalar or enum; only those can be required`)
  }
  const slotAbsent = absent ?? (required || !scalar ? "required" : "zero")
  if (slotAbsent === "zero") checkEnumZero(value, where)
  return checkUtf8(annotation, {
    _tag: "Singular",
    ...presence,
    number: annotation.number,
    type: value,
    absent: slotAbsent,
    delimited: annotation.delimited === true
  }, where)
}

// A `Protobuf.Map`, whose key schema names the protobuf type of its keys.
const compileMap = (
  c: Compiler,
  signature: SchemaAST.IndexSignature,
  resolved: ProtobufSchema.Resolved,
  where: string,
  utf8: boolean
): Pick<L.MapField, "keyType" | "wireKey" | "value"> => {
  if (resolved.annotations[ProtobufSchema.MAP] !== true) {
    throw L.layoutError(`${where} is a record; use Protobuf.Map`)
  }
  if (SchemaAST.isOptional(signature.type)) throw L.layoutError(`${where} has optional map values`)
  const value = compileValue(c, ProtobufSchema.resolveEncoded(signature.type), `${where} (map value)`, utf8)
  const keyType = compileMapKey(ProtobufSchema.resolveEncoded(signature.parameter), where, utf8)
  return { keyType, wireKey: mapKey(signature.parameter, keyType), value }
}

// `Schema.String`, a 32-bit integer scalar, a 64-bit integer scalar as a
// string, or `Protobuf.BoolKey`.
const compileMapKey = (resolved: ProtobufSchema.Resolved, where: string, utf8: boolean): L.Scalar => {
  const declared = resolved.annotations[ProtobufSchema.SCALAR] as ProtobufSchema.ScalarName | undefined
  switch (resolved.ast._tag) {
    case "String":
      if (declared === undefined) return L.scalar("string", "bigint", utf8)
      if (declared === "bool" || ProtobufSchema.is64Bit(declared)) return L.scalar(declared)
      break
    case "Number":
      if (
        declared !== undefined && !ProtobufSchema.is64Bit(declared) && declared !== "double" && declared !== "float"
      ) {
        return L.scalar(declared)
      }
      break
  }
  throw L.layoutError(
    `${where} has an unsupported map key; use Schema.String, Protobuf.Int32, …, Protobuf.Int64String, …, or Protobuf.BoolKey`
  )
}

// The keys that `Schema.Record` keeps, matched like `SchemaAST.getIndexSignatureKeys`
// with the checks of the key schema, as the values the wire layer writes.
const mapKey = (parameter: SchemaAST.AST, keyType: L.Scalar): (key: string) => unknown => {
  const ast = SchemaAST.parameterFromPropertyKey(SchemaAST.toEncoded(parameter))
  const options = SchemaAST.defaultParseOptions
  if (ast._tag === "Number") return (key) => ast.matchKey(key, options)
  if (ast._tag !== "String") throw new Error(`unexpected map key ${ast._tag}`)
  switch (keyType.scalar) {
    case "string":
      return (key) => ast.matchPart(key, options)
    case "bool":
      return (key) => ast.matchPart(key, options) === undefined ? undefined : key === "true"
    default:
      return (key) => ast.matchPart(key, options) === undefined ? undefined : BigInt(key)
  }
}

// The members of a oneof are the tagged structs `{ _tag, value }` of
// `Protobuf.Oneof`, each with a numbered `value`.
const compileOneof = (c: Compiler, key: PropertyKey, ast: SchemaAST.Union, where: string): L.Oneof => {
  const cases: Array<L.Case> = []
  const byTag = new Map<unknown, L.Case>()
  const oneof: L.Oneof = {
    _tag: "Oneof",
    key,
    guarded: isGuarded(key),
    absent: "omit",
    cases,
    select: (value) => typeof value === "object" && value !== null ? byTag.get((value as any)._tag) : undefined
  }
  ast.types.forEach((member, i) => {
    const struct = ProtobufSchema.resolveEncoded(member).ast
    const tag = struct._tag === "Objects" ? struct.propertySignatures.find((ps) => ps.name === "_tag") : undefined
    const value = struct._tag === "Objects" ? struct.propertySignatures.find((ps) => ps.name === "value") : undefined
    const literal = tag === undefined ? undefined : ProtobufSchema.resolveEncoded(tag.type).ast
    const annotation = value === undefined ? undefined : ProtobufSchema.getFieldAnnotation(value.type)
    if (
      struct._tag !== "Objects" || struct.propertySignatures.length !== 2 || literal?._tag !== "Literal" ||
      typeof literal.literal !== "string" || annotation === undefined
    ) {
      throw L.layoutError(`member ${i} of ${where} is not a case of Protobuf.Oneof`)
    }
    if (SchemaAST.isOptional(value!.type)) throw L.layoutError(`case ${literal.literal} of ${where} is optional`)
    const caseWhere = `case ${literal.literal} of ${where}`
    const type = compileValue(c, ProtobufSchema.resolveEncoded(value!.type), caseWhere, annotation.validateUtf8 ?? true)
    checkOptions(annotation, "case", caseWhere)
    checkDelimited(annotation, type, caseWhere)
    if (annotation.validateUtf8 !== undefined && !isString(type)) {
      throw L.layoutError(`${caseWhere} is not a string; only strings take validateUtf8`)
    }
    const field: L.Case = {
      _tag: "Case",
      oneof,
      number: annotation.number,
      type,
      delimited: annotation.delimited === true,
      tag: literal.literal
    }
    cases.push(field)
    byTag.set(literal.literal, field)
  })
  return oneof
}

// A value: a scalar, an enum, a message, or a well-known type, whose schema
// carries its layout. Collections and oneofs are fields of their own.
const compileValue = (c: Compiler, resolved: ProtobufSchema.Resolved, where: string, utf8: boolean): L.Type => {
  const wellKnown = resolved.annotations[ProtobufSchema.WKT] as ProtobufSchema.WellKnown | undefined
  if (wellKnown !== undefined) return wellKnown
  const enumType = resolved.annotations[ProtobufSchema.ENUM] as L.Enum | undefined
  if (enumType !== undefined) return enumType
  const node = resolved.ast
  const declared = resolved.annotations[ProtobufSchema.SCALAR] as ProtobufSchema.ScalarName | undefined
  switch (node._tag) {
    case "String":
      // A 64-bit integer held in a decimal string, like `[jstype = JS_STRING]`.
      if (declared !== undefined && ProtobufSchema.is64Bit(declared)) return L.scalar(declared, "string")
      return L.scalar("string", "bigint", utf8)
    case "Boolean":
      return L.scalar("bool")
    case "Number":
      if (declared === undefined) throw L.layoutError(`${where} is a number; use Protobuf.Double, Protobuf.Int32, …`)
      return L.scalar(declared, ProtobufSchema.is64Bit(declared) ? "number" : "bigint")
    case "BigInt":
      if (declared === undefined) throw L.layoutError(`${where} is a bigint; use Protobuf.Int64, Protobuf.UInt64, …`)
      return L.scalar(declared)
    case "Literal":
      throw L.layoutError(`${where} is a literal; use Protobuf.Enum`)
    case "Union":
      throw L.layoutError(
        resolved.annotations[ProtobufSchema.ONEOF] === true
          ? `${where} is a oneof, which is a property of its own`
          : `${where} is a union; use Protobuf.Oneof`
      )
    case "Objects":
      if (isRecord(node)) throw L.layoutError(`${where} is a map, which is a field of its own`)
      return L.messageType(compileStruct(c, node, resolved, where))
    case "Arrays":
      throw L.layoutError(
        node.elements.length > 0
          ? `${where} is a tuple, which has no protobuf mapping`
          : `${where} is a repeated value, which is a field of its own`
      )
    case "Declaration":
      if (ProtobufSchema.representationId(node) === "effect/schema/Uint8Array") return L.scalar("bytes")
      throw L.layoutError(`${where} is a declaration without a protobuf mapping`)
    default:
      throw L.layoutError(`${where} has no protobuf mapping for ${node._tag}`)
  }
}

// -----------------------------------------------------------------------------
// checks
// -----------------------------------------------------------------------------

// An implicit-presence enum field skips 0 when writing, so a closed enum needs a
// value for it.
const checkEnumZero = (type: L.Type, where: string): void => {
  if (type._tag === "Enum" && !type.open && !type.fromNumber.has(0)) {
    throw L.layoutError(`${where} is a closed enum without a value for 0, which implicit presence needs`)
  }
}

// Options that do not apply to a field are rejected rather than ignored.
const checkOptions = (
  annotation: ProtobufSchema.FieldOptions,
  kind: "singular" | "repeated" | "map" | "case",
  where: string
) => {
  if (annotation.packed !== undefined && kind !== "repeated") {
    throw L.layoutError(`${where} is not a repeated field; only repeated fields can be packed`)
  }
  if (annotation.required === true && kind !== "singular") {
    throw L.layoutError(`${where} is not a singular field; only singular fields can be required`)
  }
  if (annotation.delimited === true && kind === "map") {
    throw L.layoutError(`${where} is a map; only messages can use the delimited encoding`)
  }
  if (annotation.default !== undefined && kind !== "singular") {
    throw L.layoutError(`${where} is not a singular field; only scalars and enums have a default`)
  }
}

const checkDelimited = (annotation: ProtobufSchema.FieldOptions, type: L.Type, where: string): void => {
  if (annotation.delimited === true && type._tag !== "Message" && type._tag !== "Converted") {
    throw L.layoutError(`${where} is not a message; only messages can use the delimited encoding`)
  }
}

const checkUtf8 = <A extends L.Singular | L.Repeated | L.MapField>(
  annotation: ProtobufSchema.FieldOptions,
  slot: A,
  where: string
): A => {
  if (annotation.validateUtf8 === undefined) return slot
  const strings = slot._tag === "Singular"
    ? isString(slot.type)
    : slot._tag === "Repeated"
    ? isString(slot.element)
    : isString(slot.keyType) || isString(slot.value)
  if (!strings) throw L.layoutError(`${where} holds no strings; only strings take validateUtf8`)
  return slot
}

// -----------------------------------------------------------------------------
// helpers
// -----------------------------------------------------------------------------

const isString = (type: L.Type): boolean => {
  return type._tag === "Scalar" && type.scalar === "string"
}

const isRecord = (ast: SchemaAST.Objects): boolean => {
  return ast.propertySignatures.length === 0 && ast.indexSignatures.length === 1
}

// A well-known type that is a collection on the encoded side is a message.
const isMessageLike = (resolved: ProtobufSchema.Resolved): boolean => {
  return resolved.annotations[ProtobufSchema.WKT] !== undefined
}

const arrayElement = (ast: SchemaAST.Arrays, where: string): SchemaAST.AST => {
  if (ast.elements.length > 0 || ast.rest.length !== 1) {
    throw L.layoutError(`${where} is a tuple, which has no protobuf mapping`)
  }
  return ast.rest[0]
}

const isNull = (ast: SchemaAST.AST): boolean => {
  return ProtobufSchema.resolveEncoded(ast).ast._tag === "Null"
}

const isUndefined = (ast: SchemaAST.AST): boolean => {
  const resolved = ProtobufSchema.resolveEncoded(ast).ast
  return resolved._tag === "Undefined" || resolved._tag === "Void"
}

const isNullish = (ast: SchemaAST.AST): boolean => {
  return isNull(ast) || isUndefined(ast)
}

const isGuarded = (key: PropertyKey): boolean => {
  return typeof key === "string" && key in Object.prototype
}
