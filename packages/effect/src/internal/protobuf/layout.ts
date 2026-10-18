// Compiles a schema into a layout: the messages, field numbers, and presence
// rules that the codec writes and reads. This is the only part of the codec
// that reads the schema AST.

import * as Predicate from "../../Predicate.ts"
import * as Schema from "../../Schema.ts"
import * as SchemaAST from "../../SchemaAST.ts"
import { isInt32, WIRE_I32, WIRE_I64, WIRE_LEN, WIRE_VARINT } from "./wire.ts"

/** @internal */
export const FIELD_KEY = "~effect/encoding/Protobuf/field"
/** @internal */
export const SCALAR_KEY = "~effect/encoding/Protobuf/scalar"
/** @internal */
export const MAP_KEY_KEY = "~effect/encoding/Protobuf/mapKey"
const WRAPPER_KEY = "~effect/encoding/Protobuf/wrapper"
/** @internal */
export const ENUM_KEY = "~effect/encoding/Protobuf/enum"
/** @internal */
export const WKT_KEY = "~effect/encoding/Protobuf/wkt"
/** @internal */
export const UNKNOWN_KEY = "~effect/encoding/Protobuf/unknown"

/** @internal */
export const WRAPPER_ANNOTATIONS = { [WRAPPER_KEY]: true }

/** @internal */
export const MAX_FIELD_NUMBER = 536_870_911 // 2 ** 29 - 1

/** @internal */
export interface FieldAnnotation {
  readonly number: number
  readonly packed: boolean | undefined
  readonly presence: "always" | undefined
  readonly encoding: "delimited" | undefined
}

/** @internal */
export type ScalarName =
  | "double"
  | "float"
  | "int32"
  | "uint32"
  | "sint32"
  | "fixed32"
  | "sfixed32"
  | "int64"
  | "uint64"
  | "sint64"
  | "fixed64"
  | "sfixed64"
  | "bool"
  | "string"
  | "bytes"

/** @internal */
export type WktName = "timestamp" | "date" | "duration" | "value" | "struct" | "listValue"

/** @internal */
export function isUnsigned(scalar: ScalarName): boolean {
  return scalar === "uint32" || scalar === "fixed32" || scalar === "uint64" || scalar === "fixed64"
}

/** @internal */
export function is64Bit(scalar: ScalarName): boolean {
  return scalar === "int64" || scalar === "uint64" || scalar === "sint64" || scalar === "fixed64" ||
    scalar === "sfixed64"
}

// `annotate` on a checked schema lands on its last check, so protobuf
// annotations are looked up on the node and then on its checks.
function getAnnotation(ast: SchemaAST.AST, key: string): unknown {
  const own = ast.annotations?.[key]
  if (own !== undefined) return own
  const checks = ast.checks
  if (checks === undefined) return undefined
  for (let i = checks.length - 1; i >= 0; i--) {
    const found = getCheckAnnotation(checks[i], key)
    if (found !== undefined) return found
  }
  return undefined
}

function getCheckAnnotation(check: SchemaAST.Check<any>, key: string): unknown {
  const own = check.annotations?.[key]
  if (own !== undefined || check._tag !== "FilterGroup") return own
  for (const inner of check.checks) {
    const found = getCheckAnnotation(inner, key)
    if (found !== undefined) return found
  }
  return undefined
}

function representationId(ast: SchemaAST.AST): string | undefined {
  const representation = ast.annotations?.representation
  return Predicate.isObject(representation) && typeof (representation as { id?: unknown }).id === "string"
    ? (representation as { id: string }).id
    : undefined
}

// Declarations with a native protobuf mapping. Any other declaration is
// replaced by its JSON encoding (or its codec) before the layout is compiled.
const NATIVE_DECLARATIONS = new Set([
  "effect/schema/Date",
  "effect/schema/DateTimeUtc",
  "effect/schema/Duration",
  "effect/schema/Uint8Array",
  "effect/schema/Option",
  "effect/schema/Json",
  "effect/schema/MutableJson"
])

/** @internal */
export const toProtobufAST = SchemaAST.applyToSelfOrLastLinkEncodingIdempotent((ast) => {
  const out = toProtobufASTStep(ast)
  const context = ast.context
  if (out === ast || context === undefined) return out
  return SchemaAST.replaceContextLastLink(
    out,
    new SchemaAST.Context(context.isOptional, context.isMutable, undefined, context.annotations)
  )
})

function toProtobufASTStep(ast: SchemaAST.AST): SchemaAST.AST {
  switch (ast._tag) {
    case "Declaration": {
      const id = representationId(ast)
      if (id !== undefined && NATIVE_DECLARATIONS.has(id)) return ast.recur(toProtobufAST)
      const getJson = ast.annotations?.toCodecJson
      const getCodec = ast.annotations?.toCodec
      if (!Predicate.isFunction(getJson) && !Predicate.isFunction(getCodec)) return ast
      const typeParameters = ast.typeParameters.map((tp) => Schema.make<Schema.Constraint>(SchemaAST.toEncoded(tp)))
      const link = (Predicate.isFunction(getJson) ? getJson(typeParameters) : undefined) ??
        (Predicate.isFunction(getCodec) ? getCodec(typeParameters) : undefined)
      return link === undefined ? ast : SchemaAST.replaceEncoding(ast, [SchemaAST.mapLink(link, toProtobufAST)])
    }
    case "Arrays":
    case "Objects":
    case "Union":
    case "Suspend":
      return ast.recur(toProtobufAST)
    default:
      return ast
  }
}

/** @internal */
export interface ScalarLayout {
  readonly _tag: "Scalar"
  readonly scalar: ScalarName
  readonly wireType: number
  // A 64-bit integer represented as a JavaScript `number`.
  readonly asNumber: boolean
}

// A registered symbol, written as its `Symbol.keyFor` key.
interface SymbolLayout {
  readonly _tag: "Symbol"
  readonly wireType: typeof WIRE_LEN
}

interface WrapperLayout {
  readonly _tag: "Wrapper"
  readonly wireType: typeof WIRE_LEN
  readonly scalar: ScalarLayout
}

/** @internal */
export interface EnumLayout {
  readonly _tag: "Enum"
  readonly wireType: typeof WIRE_VARINT
  // `undefined` when values are their own enum numbers.
  readonly toNumber: ReadonlyMap<unknown, number> | undefined
  readonly fromNumber: ReadonlyMap<number, unknown> | undefined
}

/** @internal */
export interface MessageLayout {
  readonly _tag: "Message"
  readonly wireType: typeof WIRE_LEN
  readonly message: Message
}

interface WktLayout {
  readonly _tag: "Wkt"
  readonly wireType: typeof WIRE_LEN
  readonly wkt: WktName
}

// An empty message standing for a constant: a literal oneof case.
interface ConstantLayout {
  readonly _tag: "Constant"
  readonly wireType: typeof WIRE_LEN
  readonly value: unknown
}

/** @internal */
export type ValueLayout =
  | ScalarLayout
  | SymbolLayout
  | WrapperLayout
  | EnumLayout
  | MessageLayout
  | WktLayout
  | ConstantLayout

/**
 * How a slot is represented when its field is absent on the wire:
 *
 * - `"zero"`: implicit presence, the zero value
 * - `"omit"`: the key is left out
 * - `"null"` / `"undefined"`: that value
 * - `"none"`: `Option.none()`
 * - `"required"`: left out, for the schema to report
 * - `"constant"`: the field's constant
 *
 * @internal
 */
export type Absent = "zero" | "omit" | "null" | "undefined" | "none" | "required" | "constant"

/** @internal */
export interface Field {
  readonly _tag: "Field"
  readonly key: PropertyKey
  readonly number: number
  // `rest`: the entries of an index signature, spread into the struct.
  readonly kind: "singular" | "repeated" | "map" | "rest"
  readonly type: ValueLayout
  readonly mapKey: ScalarLayout | undefined
  // The keys of an object that a `rest` field's index signature selects.
  readonly keysOf: ((obj: Record<PropertyKey, unknown>) => ReadonlyArray<PropertyKey>) | undefined
  // Map entries whose value is `undefined` are left out (optional values).
  readonly optionalValues: boolean
  readonly absent: Absent
  // `null` is absent: the schema is a union with `Null`.
  readonly nullAbsent: boolean
  readonly constant: unknown
  // Writes the zero value of an implicit-presence field.
  readonly always: boolean
  readonly packed: boolean
  readonly delimited: boolean
}

/** @internal */
export interface Oneof {
  readonly key: PropertyKey
  readonly index: number
  readonly absent: Absent
  readonly nullAbsent: boolean
  readonly cases: Array<Case>
  // Set when every case is a tagged struct: the tag selects the case.
  discriminator: { readonly key: string; readonly cases: ReadonlyMap<unknown, Case> } | undefined
}

/** @internal */
export interface Case {
  readonly _tag: "Case"
  readonly oneof: Oneof
  readonly number: number
  readonly type: ValueLayout
  // Set when the member is a tagged struct: the case value is the property at
  // `key`, and the literals are restored on decode.
  readonly unwrap: { readonly key: string; readonly literals: ReadonlyArray<readonly [string, unknown]> } | undefined
  readonly guard: (value: unknown) => boolean
  readonly delimited: boolean
}

/** @internal */
export type Slot = Field | Case

/** @internal */
export interface Message {
  readonly name: string
  // - `struct`: an object with a slot per property
  // - `tuple`: an array, element `i` at field `i + 1` and the rest after them
  // - `box`: a synthesized message whose single slot holds the value itself
  readonly shape: "struct" | "tuple" | "box"
  readonly elements: number
  readonly fields: Array<Field>
  readonly rest: Array<Field>
  readonly oneofs: Array<Oneof>
  readonly literals: Array<readonly [PropertyKey, unknown]>
  readonly declared: Set<PropertyKey>
  unknown: { readonly key: PropertyKey; readonly optional: boolean } | undefined
  readonly byNumber: Map<number, Slot>
  // Field-number order, the order fields are written in.
  readonly sorted: Array<Slot>
}

// The slot keys of synthesized messages, never part of an issue path.
/** @internal */
export const BOX_VALUE = Symbol("Protobuf/box")
/** @internal */
export const TUPLE_REST = Symbol("Protobuf/rest")

/** @internal */
export type Root = MessageLayout | WktLayout | WrapperLayout | VoidLayout

// A nullish root: an empty message.
interface VoidLayout {
  readonly _tag: "Void"
  readonly value: null | undefined
}

interface Resolved {
  readonly ast: SchemaAST.AST
  // The first identifier on the encoding chain.
  readonly identifier: string | undefined
  // Protobuf annotations of the encoding chain; the outermost wins.
  readonly annotations: Readonly<Record<string, unknown>>
}

const RESOLVED_KEYS = [SCALAR_KEY, MAP_KEY_KEY, WRAPPER_KEY, ENUM_KEY, WKT_KEY, UNKNOWN_KEY]

// Follows the encoding chain of a node to its encoded side, collecting the
// identifier and protobuf annotations of the nodes along the way.
function resolveEncoded(ast: SchemaAST.AST): Resolved {
  let identifier: string | undefined
  let annotations: Record<string, unknown> | undefined
  while (true) {
    if (identifier === undefined && typeof ast.annotations?.identifier === "string") {
      identifier = ast.annotations.identifier
    }
    for (const key of RESOLVED_KEYS) {
      if (annotations?.[key] !== undefined) continue
      const value = getAnnotation(ast, key)
      if (value !== undefined) (annotations ??= {})[key] = value
    }
    if (ast.encoding !== undefined) {
      ast = ast.encoding[ast.encoding.length - 1].to
    } else if (ast._tag === "Suspend") {
      ast = ast.thunk()
    } else {
      return { ast, identifier, annotations: annotations ?? {} }
    }
  }
}

// Key annotations live on the outer node of a property, or on a link of its
// encoding chain.
function getFieldAnnotation(ast: SchemaAST.AST): FieldAnnotation | undefined {
  while (true) {
    const found = ast.context?.annotations?.[FIELD_KEY]
    if (found !== undefined) return found as FieldAnnotation
    if (ast.encoding === undefined) return undefined
    ast = ast.encoding[ast.encoding.length - 1].to
  }
}

function isNullish(ast: SchemaAST.AST): boolean {
  return ast._tag === "Null" || ast._tag === "Undefined" || ast._tag === "Void"
}

function isLiteral(ast: SchemaAST.AST): boolean {
  return resolveEncoded(ast).ast._tag === "Literal"
}

// The value of a unit schema: a literal, a unique symbol, or a nullish keyword.
function constantOf(ast: SchemaAST.AST): { readonly value: unknown } | undefined {
  switch (ast._tag) {
    case "Literal":
      return { value: ast.literal }
    case "UniqueSymbol":
      return { value: ast.symbol }
    case "Null":
      return { value: null }
    case "Undefined":
    case "Void":
      return { value: undefined }
    default:
      return undefined
  }
}

// Members of a union, with unnumbered nested unions expanded. Unions of
// literals stay whole, since their annotations decide the enum numbers.
function flattenUnion(ast: SchemaAST.Union): Array<SchemaAST.AST> {
  const out: Array<SchemaAST.AST> = []
  for (const member of ast.types) {
    const inner = resolveEncoded(member).ast
    if (inner._tag === "Union" && getFieldAnnotation(member) === undefined && !inner.types.every(isLiteral)) {
      out.push(...flattenUnion(inner))
    } else {
      out.push(member)
    }
  }
  return out
}

// The value schema of an optional record value: its `undefined` entries are
// left out, so they need no representation.
function withoutUndefined(ast: SchemaAST.AST): SchemaAST.AST {
  const resolved = resolveEncoded(ast).ast
  if (resolved._tag !== "Union") return ast
  const rest = resolved.types.filter((member) => resolveEncoded(member).ast._tag !== "Undefined")
  return rest.length === 1 ? rest[0] : ast
}

// An array whose elements all share one schema, written as a repeated field.
function isUniformArray(ast: SchemaAST.Arrays): boolean {
  if (ast.rest.length !== 1) return false
  const element = ast.rest[0]
  return ast.elements.every((item) =>
    item === element ||
    SchemaAST.getContextOwner(resolveEncoded(item).ast) === SchemaAST.getContextOwner(resolveEncoded(element).ast)
  )
}

function scalarLayout(scalar: ScalarName, asNumber = false): ScalarLayout {
  return { _tag: "Scalar", scalar, wireType: scalarWireType(scalar), asNumber }
}

function scalarWireType(scalar: ScalarName): number {
  switch (scalar) {
    case "double":
    case "fixed64":
    case "sfixed64":
      return WIRE_I64
    case "float":
    case "fixed32":
    case "sfixed32":
      return WIRE_I32
    case "string":
    case "bytes":
      return WIRE_LEN
    default:
      return WIRE_VARINT
  }
}

/** @internal */
export function isPackable(type: ValueLayout): boolean {
  return type._tag === "Enum" || (type._tag === "Scalar" && type.wireType !== WIRE_LEN)
}

const SYMBOL_LAYOUT: SymbolLayout = { _tag: "Symbol", wireType: WIRE_LEN }

const WRAPPED_SCALARS = new Set<ScalarName>([
  "double",
  "float",
  "int64",
  "uint64",
  "int32",
  "uint32",
  "bool",
  "string",
  "bytes"
])

function layoutError(message: string): Error {
  return new Error(`Protobuf layout: ${message}`)
}

function describeKey(key: PropertyKey): string {
  if (key === BOX_VALUE) return "value"
  if (key === TUPLE_REST) return "rest"
  return typeof key === "string" ? `"${key}"` : String(key)
}

// The wire type of a single literal: the scalar it is a value of.
function literalScalar(literal: SchemaAST.LiteralValue): ScalarLayout {
  switch (typeof literal) {
    case "string":
      return scalarLayout("string")
    case "boolean":
      return scalarLayout("bool")
    case "bigint":
      return scalarLayout("int64")
    default:
      return scalarLayout(isInt32(literal) ? "int32" : "double")
  }
}

/** @internal */
export function compileRoot(ast: SchemaAST.AST): Root {
  // Messages by the body they are compiled from, so that a message used at
  // several positions, or recursively, is compiled once.
  const structs = new Map<SchemaAST.AST, Message>()
  const tuples = new Map<SchemaAST.AST, Message>()
  const boxes = new Map<SchemaAST.AST, Message>()

  function makeMessage(name: string, shape: Message["shape"], elements = 0): Message {
    return {
      name,
      shape,
      elements,
      fields: [],
      rest: [],
      oneofs: [],
      literals: [],
      declared: new Set(),
      unknown: undefined,
      byNumber: new Map(),
      sorted: []
    }
  }

  function addSlot(message: Message, entry: Field | Oneof | undefined): void {
    if (entry === undefined) return
    const register = (number: number, slot: Slot) => {
      if (message.byNumber.has(number)) {
        throw layoutError(`duplicate field number ${number} in ${message.name} (${describeKey(entry.key)})`)
      }
      message.byNumber.set(number, slot)
      message.sorted.push(slot)
    }
    if ("_tag" in entry) {
      if (entry.kind === "rest") message.rest.push(entry)
      else message.fields.push(entry)
      register(entry.number, entry)
    } else {
      message.oneofs.push(entry)
      for (const c of entry.cases) register(c.number, c)
    }
  }

  function done(message: Message): Message {
    message.sorted.sort((a, b) => a.number - b.number)
    return message
  }

  function compileStruct(ast: SchemaAST.Objects, identifier: string | undefined): Message {
    const owner = SchemaAST.getContextOwner(ast)
    const cached = structs.get(owner)
    if (cached !== undefined) return cached
    const message = makeMessage(identifier ?? "message", "struct")
    structs.set(owner, message)
    for (const ps of ast.propertySignatures) {
      message.declared.add(ps.name)
      const where = `property ${describeKey(ps.name)} of ${message.name}`
      addSlot(message, compileSlot(message, ps.name, ps.type, where, undefined, true))
    }
    for (const signature of ast.indexSignatures) {
      const where = `index signature of ${message.name}`
      const annotation = getFieldAnnotation(signature.type)
      if (annotation === undefined) {
        throw layoutError(`${where} has no field number; annotate the record value with Protobuf.field(n)`)
      }
      checkOptions(annotation, "map", where)
      addSlot(message, {
        ...mapField(signature, where),
        key: TUPLE_REST,
        number: annotation.number,
        kind: "rest",
        absent: "zero",
        nullAbsent: false,
        keysOf: (obj) => SchemaAST.getIndexSignatureKeys(obj, signature.parameter)
      })
    }
    return done(message)
  }

  function compileTuple(ast: SchemaAST.Arrays, where: string): Message {
    const owner = SchemaAST.getContextOwner(ast)
    const cached = tuples.get(owner)
    if (cached !== undefined) return cached
    const message = makeMessage(where, "tuple", ast.elements.length)
    tuples.set(owner, message)
    ast.elements.forEach((element, i) => {
      const annotation: FieldAnnotation = {
        number: i + 1,
        packed: undefined,
        presence: SchemaAST.isOptional(element) ? undefined : "always",
        encoding: undefined
      }
      addSlot(message, compileSlot(message, i, element, `element ${i} of ${where}`, annotation, false))
    })
    if (ast.rest.length > 1) throw layoutError(`${where} has elements after its rest element`)
    if (ast.rest.length === 1) {
      const element = compileValue(resolveEncoded(ast.rest[0]), `rest element of ${where}`)
      addSlot(message, repeatedField(TUPLE_REST, ast.elements.length + 1, element, "zero", false, undefined))
    }
    return done(message)
  }

  // A synthesized message `{ value = 1 }` for a value that cannot be a field
  // on its own: a collection, a union, or an optional value in an element,
  // map value, oneof case, or root position.
  function compileBox(ast: SchemaAST.AST, where: string): Message {
    const owner = SchemaAST.getContextOwner(ast)
    const cached = boxes.get(owner)
    if (cached !== undefined) return cached
    const message = makeMessage(where, "box")
    boxes.set(owner, message)
    const annotation: FieldAnnotation = { number: 1, packed: undefined, presence: undefined, encoding: undefined }
    addSlot(message, compileSlot(message, BOX_VALUE, ast, where, annotation, true))
    return done(message)
  }

  function repeatedField(
    key: PropertyKey,
    number: number,
    element: ValueLayout,
    absent: Absent,
    nullAbsent: boolean,
    annotation: FieldAnnotation | undefined
  ): Field {
    return {
      _tag: "Field",
      key,
      number,
      kind: "repeated",
      type: element,
      mapKey: undefined,
      keysOf: undefined,
      optionalValues: false,
      absent,
      nullAbsent,
      constant: undefined,
      always: false,
      packed: annotation?.packed ?? isPackable(element),
      delimited: annotation?.encoding === "delimited"
    }
  }

  function mapField(
    signature: SchemaAST.IndexSignature,
    where: string
  ): Omit<Field, "key" | "number" | "absent" | "nullAbsent"> {
    const optionalValues = SchemaAST.isOptional(signature.type)
    return {
      _tag: "Field",
      kind: "map",
      type: compileValue(
        resolveEncoded(optionalValues ? withoutUndefined(signature.type) : signature.type),
        `${where} (map value)`
      ),
      mapKey: compileMapKey(resolveEncoded(signature.parameter), where),
      keysOf: undefined,
      optionalValues,
      constant: undefined,
      always: false,
      packed: false,
      delimited: false
    }
  }

  // Compiles a struct property, a tuple element, or the value of a box. A
  // union becomes a oneof of `message` when `oneofs` is set, and a boxed oneof
  // otherwise.
  function compileSlot(
    message: Message,
    key: PropertyKey,
    type: SchemaAST.AST,
    where: string,
    fixed: FieldAnnotation | undefined,
    oneofs: boolean
  ): Field | Oneof | undefined {
    let annotation = fixed ?? getFieldAnnotation(type)
    let resolved = resolveEncoded(type)
    let ast = resolved.ast

    if (resolved.annotations[UNKNOWN_KEY] === true && message.shape === "struct") {
      if (annotation !== undefined) throw layoutError(`${where} holds unknown fields and takes no field number`)
      if (message.unknown !== undefined) throw layoutError(`${message.name} has several UnknownFields properties`)
      message.unknown = { key, optional: SchemaAST.isOptional(type) }
      return undefined
    }

    const constant = constantOf(ast)
    if (constant !== undefined) {
      // A tuple element is numbered by its position, so a nullish one stays a
      // constant too.
      if (annotation === undefined || (fixed !== undefined && isNullish(ast))) {
        message.literals.push([key, constant.value])
        return undefined
      }
      if (isNullish(ast)) throw layoutError(`${where} is ${ast._tag}, which has no wire representation`)
      checkOptions(annotation, "singular", where)
      return {
        _tag: "Field",
        key,
        number: annotation.number,
        kind: "singular",
        type: ast._tag === "Literal" ? literalScalar(ast.literal) : SYMBOL_LAYOUT,
        mapKey: undefined,
        keysOf: undefined,
        optionalValues: false,
        absent: "constant",
        nullAbsent: false,
        constant: constant.value,
        always: true,
        packed: false,
        delimited: false
      }
    }

    let absent: Absent | undefined = SchemaAST.isOptional(type) ? "omit" : undefined
    let nullAbsent = false
    // Nullish members and `Option` make the field explicit-presence. The other
    // members of a union are a oneof, unless they are literals.
    let literals: ReadonlyArray<SchemaAST.AST> | undefined
    if (oneofs) {
      if (ast._tag === "Declaration" && representationId(ast) === "effect/schema/Option") {
        absent = "none"
        resolved = resolveEncoded(ast.typeParameters[0])
        ast = resolved.ast
      }
      while (ast._tag === "Union") {
        const types = flattenUnion(ast)
        const rest = types.filter((member) => !isNullish(resolveEncoded(member).ast))
        for (const member of types) {
          if (!rest.includes(member) && getFieldAnnotation(member) !== undefined) {
            throw layoutError(`${where} has a numbered nullish member; it makes the field optional and takes no number`)
          }
        }
        if (rest.length < types.length) {
          const hasNull = types.some((member) => resolveEncoded(member).ast._tag === "Null")
          nullAbsent ||= hasNull
          absent ??= hasNull ? "null" : "undefined"
          if (rest.length === 1) {
            if (fixed === undefined) annotation ??= getFieldAnnotation(rest[0])
            const inner = resolveEncoded(rest[0])
            resolved = { ...inner, annotations: { ...inner.annotations, ...resolved.annotations } }
            ast = resolved.ast
            continue
          }
        }
        if (rest.length === 0) throw layoutError(`${where} has no protobuf mapping for a nullish union`)
        if (rest.every(isLiteral)) {
          literals = rest
          break
        }
        if (annotation !== undefined && fixed === undefined) {
          throw layoutError(`${where} is a oneof; number its members instead of the property`)
        }
        return compileOneof(message, key, rest, absent ?? "required", nullAbsent, where)
      }
    }

    if (annotation === undefined) {
      throw layoutError(`${where} has no field number; annotate it with Protobuf.field(n)`)
    }
    const number = annotation.number
    const wkt = resolved.annotations[WKT_KEY]
    // The fixed annotations of tuple elements apply to any element.
    const options = fixed === undefined ? annotation : undefined

    if (wkt === undefined && ast._tag === "Arrays" && isUniformArray(ast)) {
      const element = compileValue(resolveEncoded(ast.rest[0]), `${where} (element)`)
      if (options !== undefined) checkOptions(options, "repeated", where)
      if (annotation.packed === true && !isPackable(element)) throw layoutError(`${where} cannot be packed`)
      checkDelimited(annotation, element, where)
      return repeatedField(key, number, element, absent ?? "zero", nullAbsent, annotation)
    }
    if (
      wkt === undefined && ast._tag === "Objects" && ast.propertySignatures.length === 0 &&
      ast.indexSignatures.length === 1
    ) {
      if (options !== undefined) checkOptions(options, "map", where)
      return { ...mapField(ast.indexSignatures[0], where), key, number, absent: absent ?? "zero", nullAbsent }
    }

    const value = literals === undefined ? compileValue(resolved, where) : literalValue(literals, resolved, where)
    if (options !== undefined) checkOptions(options, "singular", where)
    checkDelimited(annotation, value, where)
    return {
      _tag: "Field",
      key,
      number,
      kind: "singular",
      type: value,
      mapKey: undefined,
      keysOf: undefined,
      optionalValues: false,
      absent: absent ?? (value._tag === "Scalar" || value._tag === "Enum" ? "zero" : "required"),
      nullAbsent,
      constant: undefined,
      always: annotation.presence === "always",
      packed: false,
      delimited: annotation.encoding === "delimited"
    }
  }

  // Options that do not apply to a field are rejected rather than ignored.
  function checkOptions(annotation: FieldAnnotation, kind: "singular" | "repeated" | "map" | "case", where: string) {
    if (annotation.packed !== undefined && kind !== "repeated") {
      throw layoutError(`${where} is not a repeated field; only repeated fields can be packed`)
    }
    if (annotation.presence !== undefined && kind !== "singular") {
      throw layoutError(`${where} is not a singular field; only singular fields take presence "always"`)
    }
  }

  function checkDelimited(annotation: FieldAnnotation, type: ValueLayout, where: string): void {
    if (annotation.encoding === "delimited" && type._tag !== "Message") {
      throw layoutError(`${where} is not a message; only messages can use the delimited encoding`)
    }
  }

  function compileOneof(
    message: Message,
    key: PropertyKey,
    members: ReadonlyArray<SchemaAST.AST>,
    absent: Absent,
    nullAbsent: boolean,
    where: string
  ): Oneof {
    const oneof: Oneof = {
      key,
      index: message.oneofs.length,
      absent,
      nullAbsent,
      cases: [],
      discriminator: undefined
    }
    for (const member of members) {
      const resolved = resolveEncoded(member)
      const annotation = getFieldAnnotation(member)
      if (annotation !== undefined) {
        const type = compileCaseValue(resolved, where)
        checkOptions(annotation, "case", where)
        checkDelimited(annotation, type, where)
        oneof.cases.push({
          _tag: "Case",
          oneof,
          number: annotation.number,
          type,
          unwrap: undefined,
          guard: Schema.is(Schema.make(SchemaAST.toEncoded(member))),
          delimited: annotation.encoding === "delimited"
        })
        continue
      }
      const ast = resolved.ast
      if (ast._tag === "Objects" && ast.indexSignatures.length === 0) {
        const literals: Array<readonly [string, unknown]> = []
        const wire: Array<SchemaAST.PropertySignature> = []
        for (const ps of ast.propertySignatures) {
          const inner = resolveEncoded(ps.type).ast
          if (inner._tag === "Literal" && typeof ps.name === "string") literals.push([ps.name, inner.literal])
          else wire.push(ps)
        }
        const annotation = wire.length === 1 ? getFieldAnnotation(wire[0].type) : undefined
        if (annotation !== undefined && typeof wire[0].name === "string") {
          const type = compileCaseValue(resolveEncoded(wire[0].type), where)
          checkOptions(annotation, "case", where)
          checkDelimited(annotation, type, where)
          oneof.cases.push({
            _tag: "Case",
            oneof,
            number: annotation.number,
            type,
            unwrap: { key: wire[0].name, literals },
            guard: Schema.is(Schema.make(SchemaAST.toEncoded(member))),
            delimited: annotation.encoding === "delimited"
          })
          continue
        }
      }
      throw layoutError(
        `member ${oneof.cases.length} of ${where} is not a oneof case; annotate it with Protobuf.field(n), ` +
          `or make it a tagged struct with a single numbered property`
      )
    }
    oneof.discriminator = findDiscriminator(oneof.cases)
    return oneof
  }

  // A literal case is an empty message: its presence is the value.
  function compileCaseValue(resolved: Resolved, where: string): ValueLayout {
    const constant = constantOf(resolved.ast)
    if (constant !== undefined) return { _tag: "Constant", wireType: WIRE_LEN, value: constant.value }
    return compileValue(resolved, where)
  }

  function compileValue(resolved: Resolved, where: string): ValueLayout {
    const ast = resolved.ast
    const wkt = resolved.annotations[WKT_KEY] as WktName | undefined
    if (wkt !== undefined) return { _tag: "Wkt", wireType: WIRE_LEN, wkt }
    const value = compileBareValue(resolved, where)
    if (resolved.annotations[WRAPPER_KEY] !== true) return value
    if (value._tag !== "Scalar" || !WRAPPED_SCALARS.has(value.scalar)) {
      throw layoutError(`${where} has no google.protobuf wrapper type for ${describe(value, ast)}`)
    }
    return { _tag: "Wrapper", wireType: WIRE_LEN, scalar: value }
  }

  function compileBareValue(resolved: Resolved, where: string): ValueLayout {
    const ast = resolved.ast
    const scalar = resolved.annotations[SCALAR_KEY] as ScalarName | undefined
    switch (ast._tag) {
      case "String":
      case "TemplateLiteral":
        return scalarLayout("string")
      case "Boolean":
        return scalarLayout("bool")
      case "Number": {
        const s = scalar ?? "double"
        if (s === "bool" || s === "string" || s === "bytes") throw layoutError(`${where} is a number, not ${s}`)
        return scalarLayout(s, is64Bit(s))
      }
      case "BigInt": {
        const s = scalar ?? "int64"
        if (!is64Bit(s)) throw layoutError(`${where} is a bigint, not ${s}`)
        return scalarLayout(s)
      }
      case "Literal":
        return literalScalar(ast.literal)
      case "Symbol":
      case "UniqueSymbol":
        return SYMBOL_LAYOUT
      case "Enum": {
        for (const [name, value] of ast.enums) {
          if (typeof value !== "number" || !isInt32(value)) {
            throw layoutError(`${where} has enum member ${name} without a 32-bit integer value`)
          }
        }
        return { _tag: "Enum", wireType: WIRE_VARINT, toNumber: undefined, fromNumber: undefined }
      }
      case "Union": {
        const members = flattenUnion(ast)
        if (members.every(isLiteral)) return literalValue(members, resolved, where)
        return box(ast, where)
      }
      case "Objects":
        if (ast.propertySignatures.length === 0 && ast.indexSignatures.length === 1) return box(ast, where)
        return { _tag: "Message", wireType: WIRE_LEN, message: compileStruct(ast, resolved.identifier) }
      case "Arrays":
        if (isUniformArray(ast)) return box(ast, where)
        return { _tag: "Message", wireType: WIRE_LEN, message: compileTuple(ast, where) }
      case "Declaration":
        switch (representationId(ast)) {
          case "effect/schema/DateTimeUtc":
            return { _tag: "Wkt", wireType: WIRE_LEN, wkt: "timestamp" }
          case "effect/schema/Date":
            return { _tag: "Wkt", wireType: WIRE_LEN, wkt: "date" }
          case "effect/schema/Duration":
            return { _tag: "Wkt", wireType: WIRE_LEN, wkt: "duration" }
          case "effect/schema/Uint8Array":
            return scalarLayout("bytes")
          case "effect/schema/Json":
          case "effect/schema/MutableJson":
            return { _tag: "Wkt", wireType: WIRE_LEN, wkt: "value" }
          case "effect/schema/Option":
            return box(ast, where)
        }
        throw layoutError(`${where} is a declaration without a protobuf mapping or codec annotation`)
      case "Unknown":
      case "Any":
      case "ObjectKeyword":
        return { _tag: "Wkt", wireType: WIRE_LEN, wkt: "value" }
      default:
        throw layoutError(`${where} has no protobuf mapping for ${ast._tag}`)
    }
  }

  function box(ast: SchemaAST.AST, where: string): MessageLayout {
    return { _tag: "Message", wireType: WIRE_LEN, message: compileBox(ast, where) }
  }

  // Unions of literals: an enum with `enumNumbers` or numeric members, and
  // otherwise the scalar the literals share.
  function literalValue(members: ReadonlyArray<SchemaAST.AST>, resolved: Resolved, where: string): ValueLayout {
    const literals = members.map((member) => (resolveEncoded(member).ast as SchemaAST.Literal).literal)
    const mapping = resolved.annotations[ENUM_KEY] as Readonly<Record<string, number>> | undefined
    if (mapping === undefined) {
      if (literals.every((literal) => typeof literal === "number" && isInt32(literal))) {
        return { _tag: "Enum", wireType: WIRE_VARINT, toNumber: undefined, fromNumber: undefined }
      }
      const kind = typeof literals[0]
      if (literals.every((literal) => typeof literal === kind)) {
        // Numbers that are not all 32-bit integers share `double`.
        return kind === "number" ? scalarLayout("double") : literalScalar(literals[0])
      }
      throw layoutError(`${where} is a union of literals of different types; annotate it with Protobuf.enumNumbers`)
    }
    const toNumber = new Map<unknown, number>()
    const fromNumber = new Map<number, unknown>()
    for (const literal of literals) {
      const number = mapping[String(literal)]
      if (number === undefined || !isInt32(number)) {
        throw layoutError(`${where} has no 32-bit enum number for ${String(literal)}`)
      }
      toNumber.set(literal, number)
      if (!fromNumber.has(number)) fromNumber.set(number, literal)
    }
    return { _tag: "Enum", wireType: WIRE_VARINT, toNumber, fromNumber }
  }

  function compileMapKey(resolved: Resolved, where: string): ScalarLayout {
    const declared = (resolved.annotations[MAP_KEY_KEY] ?? resolved.annotations[SCALAR_KEY]) as ScalarName | undefined
    switch (resolved.ast._tag) {
      case "String":
      case "TemplateLiteral":
        if (declared === undefined) return scalarLayout("string")
        if (declared === "bool" || is64Bit(declared)) return scalarLayout(declared)
        break
      case "Number": {
        const s = declared ?? "int32"
        if (s !== "bool" && s !== "string" && s !== "bytes") return scalarLayout(s, is64Bit(s))
        break
      }
    }
    throw layoutError(
      `${where} has an unsupported map key; use String, Number, Int32 (and friends), or Protobuf.mapKey`
    )
  }

  const resolved = resolveEncoded(ast)
  const node = resolved.ast
  if (isNullish(node)) return { _tag: "Void", value: node._tag === "Null" ? null : undefined }
  // A record whose values are numbered is a message of maps.
  if (
    node._tag === "Objects" && node.indexSignatures.length > 0 && resolved.annotations[WKT_KEY] === undefined &&
    node.indexSignatures.every((signature) => getFieldAnnotation(signature.type) !== undefined)
  ) {
    return { _tag: "Message", wireType: WIRE_LEN, message: compileStruct(node, resolved.identifier) }
  }
  const root = compileValue(resolved, "the root schema")
  if (root._tag === "Message" || root._tag === "Wkt" || root._tag === "Wrapper") return root
  // Any other root is the value of a box, like the google.protobuf wrappers.
  return box(ast, "the root schema")
}

function describe(layout: ValueLayout, ast: SchemaAST.AST): string {
  return layout._tag === "Scalar" ? layout.scalar : ast._tag
}

function findDiscriminator(cases: ReadonlyArray<Case>): Oneof["discriminator"] {
  const first = cases[0]?.unwrap
  if (first === undefined || cases.some((c) => c.unwrap === undefined)) return undefined
  for (const [key] of first.literals) {
    const byLiteral = new Map<unknown, Case>()
    for (const c of cases) {
      const literal = c.unwrap!.literals.find(([k]) => k === key)
      if (literal === undefined || byLiteral.has(literal[1])) break
      byLiteral.set(literal[1], c)
    }
    if (byLiteral.size === cases.length) return { key, cases: byLiteral }
  }
  return undefined
}
