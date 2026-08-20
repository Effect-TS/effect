/**
 * A layout-compiled compact binary codec derived from the encoded-side Schema
 * AST. The payload is schema-required (not self-describing): both sides
 * compile a wire layout from the same schema, field names never appear on the
 * wire, unknown struct fields are skipped, missing optionals decode as
 * absent, and field reorder is compatible.
 *
 * @since 4.0.0
 */
import * as BigDecimal from "../../BigDecimal.ts"
import * as Cause from "../../Cause.ts"
import * as Chunk from "../../Chunk.ts"
import * as DateTime from "../../DateTime.ts"
import * as Duration from "../../Duration.ts"
import * as Effect from "../../Effect.ts"
import * as Exit from "../../Exit.ts"
import * as HashMap from "../../HashMap.ts"
import * as HashSet from "../../HashSet.ts"
import * as Option from "../../Option.ts"
import * as Predicate from "../../Predicate.ts"
import * as Redacted from "../../Redacted.ts"
import * as Result from "../../Result.ts"
import * as Schema from "../../Schema.ts"
import * as SchemaAST from "../../SchemaAST.ts"
import * as SchemaIssue from "../../SchemaIssue.ts"
import * as SchemaTransformation from "../../SchemaTransformation.ts"

const FIELD_ID_ANNOTATION_KEY = "~effect/encoding/SchemaBinary/fieldId"

const ENVELOPE = 0x10 // version nibble 1, flags 0

const MAX_SAFE_BIGINT = BigInt(Number.MAX_SAFE_INTEGER)
const BIGINT_ZERO = BigInt(0)
const BIGINT_ONE = BigInt(1)
const BIGINT_SEVEN = BigInt(7)
const BIGINT_VARINT_MASK = BigInt(0x7F)
const BIGINT_NANOS_PER_MILLI = BigInt(1_000_000)

const utf8Encode = new TextEncoder()
const utf8DecodeFatal = new TextDecoder("utf-8", { fatal: true })

// -----------------------------------------------------------------------------
// wire kinds
// -----------------------------------------------------------------------------

const K = {
  bool: 1,
  null: 2,
  undefined: 3,
  f64: 4,
  string: 5,
  bytes: 6,
  bigint: 7,
  int64: 8,
  struct: 9,
  variant: 10,
  array: 11,
  option: 12,
  result: 13,
  duration: 14,
  bigDecimal: 15,
  dateTimeZoned: 16,
  json: 17,
  exit: 18,
  cause: 19,
  causeReason: 20
} as const

// -----------------------------------------------------------------------------
// primitives
// -----------------------------------------------------------------------------

function fnv32(bytes: Uint8Array): number {
  let hash = 0x811C9DC5
  for (let i = 0; i < bytes.length; i++) {
    hash = Math.imul(hash ^ bytes[i], 0x01000193)
  }
  return hash >>> 0
}

function compareBytes(a: Uint8Array, b: Uint8Array): number {
  const len = Math.min(a.length, b.length)
  for (let i = 0; i < len; i++) {
    if (a[i] !== b[i]) return a[i] - b[i]
  }
  return a.length - b.length
}

class IssueError extends Error {
  readonly issue: SchemaIssue.Issue
  constructor(issue: SchemaIssue.Issue) {
    super("SchemaBinary failure")
    this.issue = issue
  }
}

function invalid(expected: string, input?: unknown, options?: SchemaAST.ParseOptions): never {
  throw new IssueError(new SchemaIssue.InvalidValue({ expected }, input, options))
}

function atKey<A>(key: PropertyKey, f: () => A): A {
  try {
    return f()
  } catch (e) {
    if (e instanceof IssueError) {
      throw new IssueError(new SchemaIssue.Pointer([key], e.issue))
    }
    throw e
  }
}

class Writer {
  buf = new Uint8Array(256)
  view = new DataView(this.buf.buffer)
  len = 0
  private ensure(n: number) {
    if (this.len + n > this.buf.length) {
      const next = new Uint8Array(Math.max(this.buf.length * 2, this.len + n))
      next.set(this.buf)
      this.buf = next
      this.view = new DataView(next.buffer)
    }
  }
  byte(b: number) {
    this.ensure(1)
    this.buf[this.len++] = b
  }
  bytes(b: Uint8Array) {
    this.ensure(b.length)
    this.buf.set(b, this.len)
    this.len += b.length
  }
  uvarint(n: number) {
    while (n > 0x7F) {
      this.byte((n & 0x7F) | 0x80)
      n = Math.floor(n / 128)
    }
    this.byte(n)
  }
  uvarintBig(n: bigint) {
    while (n > BIGINT_VARINT_MASK) {
      this.byte(Number(n & BIGINT_VARINT_MASK) | 0x80)
      n >>= BIGINT_SEVEN
    }
    this.byte(Number(n))
  }
  zigzag(n: bigint) {
    this.uvarintBig(n >= BIGINT_ZERO ? n << BIGINT_ONE : (-n << BIGINT_ONE) - BIGINT_ONE)
  }
  f64(n: number) {
    this.ensure(8)
    this.view.setFloat64(this.len, n, true)
    this.len += 8
  }
  i64(n: bigint) {
    this.ensure(8)
    this.view.setBigInt64(this.len, n, true)
    this.len += 8
  }
  u32le(n: number) {
    this.ensure(4)
    this.view.setUint32(this.len, n >>> 0, true)
    this.len += 4
  }
  i32le(n: number) {
    this.ensure(4)
    this.view.setInt32(this.len, n | 0, true)
    this.len += 4
  }
  out(): Uint8Array<ArrayBuffer> {
    return this.buf.slice(0, this.len) as Uint8Array<ArrayBuffer>
  }
}

class Reader {
  pos: number
  readonly buf: Uint8Array
  readonly view: DataView
  readonly end: number
  readonly options: SchemaAST.ParseOptions
  readonly indexSignatures: WeakMap<StructLayout, Map<string, ExtraSignature | undefined>>
  constructor(
    buf: Uint8Array,
    start: number,
    end: number,
    options: SchemaAST.ParseOptions,
    indexSignatures = new WeakMap<StructLayout, Map<string, ExtraSignature | undefined>>()
  ) {
    this.buf = buf
    this.view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
    this.pos = start
    this.end = end
    this.options = options
    this.indexSignatures = indexSignatures
  }
  get remaining(): number {
    return this.end - this.pos
  }
  byte(): number {
    if (this.pos >= this.end) invalid("complete value", undefined, this.options)
    return this.buf[this.pos++]
  }
  take(n: number): Uint8Array {
    if (this.pos + n > this.end) invalid("complete value", undefined, this.options)
    const out = this.buf.subarray(this.pos, this.pos + n)
    this.pos += n
    return out
  }
  sub(len: number): Reader {
    if (this.pos + len > this.end) invalid("complete value", undefined, this.options)
    const sub = new Reader(this.buf, this.pos, this.pos + len, this.options, this.indexSignatures)
    this.pos += len
    return sub
  }
  uvarint(): number {
    let value = 0
    let shift = 0
    for (let i = 0; i < 10; i++) {
      const b = this.byte()
      const chunk = (b & 0x7F) * 2 ** shift
      if (chunk > Number.MAX_SAFE_INTEGER - value) {
        invalid("safe integer length", undefined, this.options)
      }
      value += chunk
      if ((b & 0x80) === 0) {
        return value
      }
      shift += 7
    }
    invalid("uvarint", undefined, this.options)
  }
  uvarintBig(): bigint {
    let value = BIGINT_ZERO
    let shift = BIGINT_ZERO
    while (true) {
      const b = this.byte()
      value |= BigInt(b & 0x7F) << shift
      if ((b & 0x80) === 0) return value
      shift += BIGINT_SEVEN
    }
  }
  zigzag(): bigint {
    const u = this.uvarintBig()
    return (u & BIGINT_ONE) === BIGINT_ONE
      ? -((u + BIGINT_ONE) >> BIGINT_ONE)
      : u >> BIGINT_ONE
  }
  f64(): number {
    if (this.pos + 8 > this.end) invalid("complete value", undefined, this.options)
    const value = this.view.getFloat64(this.pos, true)
    this.pos += 8
    return value
  }
  i64(): bigint {
    if (this.pos + 8 > this.end) invalid("complete value", undefined, this.options)
    const value = this.view.getBigInt64(this.pos, true)
    this.pos += 8
    return value
  }
  u32le(): number {
    if (this.pos + 4 > this.end) invalid("complete value", undefined, this.options)
    const value = this.view.getUint32(this.pos, true)
    this.pos += 4
    return value
  }
  i32le(): number {
    if (this.pos + 4 > this.end) invalid("complete value", undefined, this.options)
    const value = this.view.getInt32(this.pos, true)
    this.pos += 4
    return value
  }
  utf8(bytes: Uint8Array): string {
    try {
      return utf8DecodeFatal.decode(bytes)
    } catch {
      invalid("utf-8", undefined, this.options)
    }
  }
}

// -----------------------------------------------------------------------------
// layouts
// -----------------------------------------------------------------------------

type LeafKind =
  | "bool"
  | "null"
  | "undefined"
  | "f64"
  | "string"
  | "symbol"
  | "bytes"
  | "bigint"
  | "json"
  | "duration"
  | "bigDecimal"
  | "dateTimeZoned"

type Layout =
  | { readonly _: LeafKind }
  | { readonly _: "int64"; readonly flavor: "date" | "utc" }
  | { readonly _: "never"; readonly ast: SchemaAST.AST }
  | StructLayout
  | ArrayLayout
  | UnionLayout
  | { readonly _: "option"; value: Layout }
  | { readonly _: "result"; success: Layout; failure: Layout }
  | { readonly _: "exit"; value: Layout; error: Layout; defect: Layout }
  | { readonly _: "cause"; error: Layout; defect: Layout }
  | { readonly _: "causeReason"; error: Layout; defect: Layout }

interface Field {
  readonly name: string
  readonly id: number
  readonly optional: boolean
  readonly annotations: Schema.Annotations.Key<unknown> | undefined
  layout: Layout
}

interface ExtraSignature {
  readonly parameter: SchemaAST.IndexSignature["parameter"]
  layout: Layout
}

interface StructLayout {
  readonly _: "struct"
  readonly ast: SchemaAST.AST
  readonly fields: Array<Field>
  readonly byId: Map<number, Field>
  readonly extra: Array<ExtraSignature>
}

interface Slot {
  readonly optional: boolean
  layout: Layout
}

interface ArrayLayout {
  readonly _: "array"
  readonly ast: SchemaAST.AST
  readonly elements: Array<Slot>
  readonly rest: Array<Layout>
  readonly hasCount: boolean
  readonly minCount: number
}

interface VariantRow {
  readonly tag: number
  readonly sentinels: ReadonlyArray<SchemaAST.Sentinel>
  readonly tuple: boolean
  payload: Layout
}

interface UnionLayout {
  readonly _: "union"
  readonly ast: SchemaAST.AST
  readonly variants: Array<VariantRow>
  readonly byTag: Map<number, VariantRow>
  readonly others: Array<Layout>
  readonly byKind: Map<number, Layout>
}

function kindByte(layout: Layout): number {
  switch (layout._) {
    case "bool":
      return K.bool
    case "null":
      return K.null
    case "undefined":
      return K.undefined
    case "f64":
      return K.f64
    case "string":
    case "symbol":
      return K.string
    case "bytes":
      return K.bytes
    case "bigint":
      return K.bigint
    case "int64":
      return K.int64
    case "struct":
      return K.struct
    case "array":
      return K.array
    case "option":
      return K.option
    case "result":
      return K.result
    case "duration":
      return K.duration
    case "bigDecimal":
      return K.bigDecimal
    case "dateTimeZoned":
      return K.dateTimeZoned
    case "json":
      return K.json
    case "exit":
      return K.exit
    case "cause":
      return K.cause
    case "causeReason":
      return K.causeReason
    case "union":
    case "never":
      throw new Error("Binary layout: union members are not uniquely identifiable")
  }
}

function packedSize(layout: Layout): number | undefined {
  switch (layout._) {
    case "bool":
      return 1
    case "f64":
    case "int64":
      return 8
    default:
      return undefined
  }
}

// -----------------------------------------------------------------------------
// declaration rewrite: attach `toCodecJson ?? toCodec` links to non-native
// declarations so the existing Schema machinery runs them at encode/decode time
// -----------------------------------------------------------------------------

const nativeKinds: Record<string, number> = {
  "effect/schema/Date": K.int64,
  "effect/schema/DateTimeUtc": K.int64,
  "effect/schema/DateTimeZoned": K.dateTimeZoned,
  "effect/schema/Duration": K.duration,
  "effect/schema/BigDecimal": K.bigDecimal,
  "effect/schema/Uint8Array": K.bytes,
  "effect/schema/Option": K.option,
  "effect/schema/Result": K.result,
  "effect/schema/Exit": K.exit,
  "effect/schema/Cause": K.cause,
  "effect/schema/CauseReason": K.causeReason
}

function representationId(ast: SchemaAST.AST): string | undefined {
  const representation = ast.annotations?.representation
  return Predicate.isObject(representation) && typeof (representation as { id?: unknown }).id === "string"
    ? (representation as { id: string }).id
    : undefined
}

const toBinaryAST = SchemaAST.applyToSelfOrLastLinkEncodingIdempotent((ast) => {
  const out = toBinaryASTStep(ast)
  const context = ast.context
  if (out === ast || context === undefined) return out
  return SchemaAST.replaceContextLastLink(
    out,
    new SchemaAST.Context(context.isOptional, context.isMutable, undefined, context.annotations)
  )
})

function toBinaryASTStep(ast: SchemaAST.AST): SchemaAST.AST {
  switch (ast._tag) {
    case "Declaration": {
      const id = representationId(ast)
      if (
        id !== undefined && (id in nativeKinds || id === "effect/schema/Json" || id === "effect/schema/MutableJson")
      ) {
        return ast.recur(toBinaryAST)
      }
      const getJson = ast.annotations?.toCodecJson
      const getLink = Predicate.isFunction(getJson) ? getJson : ast.annotations?.toCodec
      if (!Predicate.isFunction(getLink)) {
        return ast
      }
      const typeParameters = ast.typeParameters.map((tp) => Schema.make<Schema.Constraint>(SchemaAST.toEncoded(tp)))
      const link = getLink(typeParameters)
      return link === undefined ? ast : SchemaAST.replaceEncoding(ast, [SchemaAST.mapLink(link, toBinaryAST)])
    }
    case "Arrays":
    case "Objects":
    case "Union":
    case "Suspend":
      return ast.recur(toBinaryAST)
    default:
      return ast
  }
}

// -----------------------------------------------------------------------------
// layout compile (encoded-side AST -> layout)
// -----------------------------------------------------------------------------

function sentinelSetHash(sentinels: ReadonlyArray<SchemaAST.Sentinel>): number {
  const sorted = [...sentinels].sort((a, b) => {
    const an = typeof a.key === "number"
    const bn = typeof b.key === "number"
    if (an !== bn) return an ? -1 : 1
    if (an) return (a.key as number) - (b.key as number)
    return compareBytes(utf8Encode.encode(a.key as string), utf8Encode.encode(b.key as string))
  })
  let hash = 0x811C9DC5
  const mix = (bytes: Uint8Array) => {
    for (let i = 0; i < bytes.length; i++) hash = Math.imul(hash ^ bytes[i], 0x01000193)
  }
  const u32le = (n: number) => {
    mix(new Uint8Array([n & 0xFF, (n >>> 8) & 0xFF, (n >>> 16) & 0xFF, (n >>> 24) & 0xFF]))
  }
  for (const sentinel of sorted) {
    const keyBytes = utf8Encode.encode(String(sentinel.key))
    mix(new Uint8Array([typeof sentinel.key === "number" ? 0 : 1]))
    u32le(keyBytes.length)
    mix(keyBytes)
    const literal = sentinel.literal
    const valueKind = typeof literal === "string"
      ? 1
      : typeof literal === "number"
      ? 2
      : typeof literal === "boolean"
      ? 3
      : typeof literal === "bigint"
      ? 4
      : 5
    const valueBytes = utf8Encode.encode(sentinelLiteralString(literal))
    mix(new Uint8Array([valueKind]))
    u32le(valueBytes.length)
    mix(valueBytes)
  }
  return hash >>> 0
}

function sentinelLiteralString(literal: SchemaAST.LiteralValue | symbol): string {
  if (typeof literal === "symbol") {
    const key = globalThis.Symbol.keyFor(literal)
    if (key === undefined) {
      throw new Error("Binary layout: unregistered unique symbol (Symbol.keyFor)")
    }
    return key
  }
  return String(literal)
}

function parameterHasSymbol(parameter: SchemaAST.AST): boolean {
  switch (parameter._tag) {
    case "Symbol":
      return true
    case "Union":
      return parameter.types.some(parameterHasSymbol)
    default:
      return false
  }
}

function isJsonDeclaration(ast: SchemaAST.Declaration): boolean {
  const id = representationId(ast)
  if (id === "effect/schema/Json" || id === "effect/schema/MutableJson") return true
  // `toCodecJson` returning `undefined` means the encoded value is already JSON
  return Predicate.isFunction(ast.annotations?.toCodecJson)
}

function resolveSuspend(ast: SchemaAST.AST): SchemaAST.AST {
  while (ast._tag === "Suspend") {
    ast = ast.thunk()
  }
  return ast
}

function flattenMembers(union: SchemaAST.Union): Array<SchemaAST.AST> {
  const out: Array<SchemaAST.AST> = []
  const seen = new Set<SchemaAST.AST>()
  const go = (ast: SchemaAST.AST) => {
    const resolved = resolveSuspend(ast)
    if (seen.has(resolved)) return
    seen.add(resolved)
    switch (resolved._tag) {
      case "Never":
        return
      case "Union":
        resolved.types.forEach(go)
        return
      case "Enum":
        SchemaAST.enumsToLiterals(resolved).types.forEach(go)
        return
      default:
        out.push(resolved)
    }
  }
  union.types.forEach(go)
  return out
}

function literalKind(literal: SchemaAST.LiteralValue): LeafKind {
  switch (typeof literal) {
    case "string":
      return "string"
    case "number":
      return "f64"
    case "boolean":
      return "bool"
    default:
      return "bigint"
  }
}

// wire kind of an encoded-side AST node, used to classify union members
// without compiling them (so recursive members stay lazy)
function astKind(ast: SchemaAST.AST): number {
  switch (ast._tag) {
    case "String":
    case "TemplateLiteral":
    case "Symbol":
      return K.string
    case "UniqueSymbol":
      if (globalThis.Symbol.keyFor(ast.symbol) === undefined) {
        throw new Error("Binary layout: unregistered unique symbol (Symbol.keyFor)")
      }
      return K.string
    case "Boolean":
      return K.bool
    case "Null":
      return K.null
    case "Undefined":
    case "Void":
      return K.undefined
    case "Number":
      return K.f64
    case "BigInt":
      return K.bigint
    case "Literal":
      switch (typeof ast.literal) {
        case "string":
          return K.string
        case "number":
          return K.f64
        case "boolean":
          return K.bool
        default:
          return K.bigint
      }
    case "Unknown":
    case "Any":
    case "ObjectKeyword":
      return K.json
    case "Objects":
      return K.struct
    case "Arrays":
      return K.array
    case "Declaration": {
      const id = representationId(ast)
      if (id !== undefined && id in nativeKinds) return nativeKinds[id]
      if (isJsonDeclaration(ast)) return K.json
      throw new Error(`Binary layout: declaration ${id ?? "<anonymous>"} has no toCodecJson or toCodec`)
    }
    case "Suspend":
      return astKind(resolveSuspend(ast))
    default:
      throw new Error("Binary layout: union members are not uniquely identifiable")
  }
}

function compileLayout(root: SchemaAST.AST): Layout {
  const memo = new Map<SchemaAST.AST, Layout>()

  function compile(ast: SchemaAST.AST): Layout {
    const hit = memo.get(ast)
    if (hit !== undefined) return hit
    const layout = go(ast)
    memo.set(ast, layout)
    return layout
  }

  function go(ast: SchemaAST.AST): Layout {
    switch (ast._tag) {
      case "String":
      case "TemplateLiteral":
        return { _: "string" }
      case "Symbol":
      case "UniqueSymbol":
        return { _: "symbol" }
      case "Boolean":
        return { _: "bool" }
      case "Null":
        return { _: "null" }
      case "Undefined":
      case "Void":
        return { _: "undefined" }
      case "Number":
        return { _: "f64" }
      case "BigInt":
        return { _: "bigint" }
      case "Literal":
        return { _: literalKind(ast.literal) }
      case "Unknown":
      case "Any":
      case "ObjectKeyword":
        return { _: "json" }
      case "Never":
        return { _: "never", ast }
      case "Enum":
        return compileUnion(ast, flattenMembers(SchemaAST.enumsToLiterals(ast)))
      case "Suspend": {
        const layout = compile(ast.thunk())
        memo.set(ast, layout)
        return layout
      }
      case "Objects":
        return compileStruct(ast)
      case "Arrays":
        return compileArray(ast)
      case "Union":
        return compileUnion(ast, flattenMembers(ast))
      case "Declaration":
        return compileDeclaration(ast)
    }
  }

  function compileStruct(ast: SchemaAST.Objects): StructLayout {
    const fields: Array<Field> = []
    const types: Array<SchemaAST.AST> = []
    const idNames = new Map<number, Array<string>>()
    for (const ps of ast.propertySignatures) {
      if (typeof ps.name === "symbol") {
        throw new Error("Binary layout: symbol property names are illegal")
      }
      const name = String(ps.name)
      const annotations = ps.type.context?.annotations
      const explicit = annotations?.[FIELD_ID_ANNOTATION_KEY]
      const id = typeof explicit === "number" ? explicit : fnv32(utf8Encode.encode(name))
      if (!Number.isInteger(id) || id < 0 || id > 0xFFFFFFFF) {
        throw new Error(`Binary layout: illegal field id for ${name}`)
      }
      const names = idNames.get(id)
      if (names === undefined) idNames.set(id, [name])
      else names.push(name)
      fields.push({
        name,
        id,
        optional: ps.type.context?.isOptional === true,
        annotations,
        layout: undefined as unknown as Layout
      })
      types.push(ps.type)
    }
    for (const [id, names] of idNames) {
      if (id === 0 || names.length > 1) {
        throw new Error(`Binary layout field id collision: ${id} (${names.join(", ")})`)
      }
    }
    const extra: Array<ExtraSignature> = []
    for (const is of ast.indexSignatures) {
      if (parameterHasSymbol(is.parameter)) {
        throw new Error("Binary layout: symbol property names are illegal")
      }
      extra.push({ parameter: is.parameter, layout: undefined as unknown as Layout })
    }
    const layout: StructLayout = { _: "struct", ast, fields, byId: new Map(), extra }
    memo.set(ast, layout)
    for (let i = 0; i < fields.length; i++) {
      fields[i].layout = compile(types[i])
      layout.byId.set(fields[i].id, fields[i])
    }
    fields.sort((a, b) => a.id - b.id)
    for (let i = 0; i < extra.length; i++) {
      extra[i].layout = compile(ast.indexSignatures[i].type)
    }
    return layout
  }

  function compileArray(ast: SchemaAST.Arrays): ArrayLayout {
    const hasCount = ast.rest.length > 0 || ast.elements.some((e) => e.context?.isOptional === true)
    const requiredElements = ast.elements.filter((e) => e.context?.isOptional !== true).length
    const tailLen = Math.max(0, ast.rest.length - 1)
    const layout: ArrayLayout = {
      _: "array",
      ast,
      elements: [],
      rest: [],
      hasCount,
      minCount: requiredElements + tailLen
    }
    memo.set(ast, layout)
    for (const element of ast.elements) {
      layout.elements.push({
        optional: element.context?.isOptional === true,
        layout: compile(element)
      })
    }
    for (const rest of ast.rest) {
      layout.rest.push(compile(rest))
    }
    return layout
  }

  function compileDeclaration(ast: SchemaAST.Declaration): Layout {
    const id = representationId(ast)
    switch (id) {
      case "effect/schema/Date":
        return { _: "int64", flavor: "date" }
      case "effect/schema/DateTimeUtc":
        return { _: "int64", flavor: "utc" }
      case "effect/schema/DateTimeZoned":
        return { _: "dateTimeZoned" }
      case "effect/schema/Duration":
        return { _: "duration" }
      case "effect/schema/BigDecimal":
        return { _: "bigDecimal" }
      case "effect/schema/Uint8Array":
        return { _: "bytes" }
    }
    const tps = ast.typeParameters
    switch (id) {
      case "effect/schema/Option": {
        const layout = { _: "option" as const, value: undefined as unknown as Layout }
        memo.set(ast, layout)
        layout.value = compile(tps[0])
        return layout
      }
      case "effect/schema/Result": {
        const layout = {
          _: "result" as const,
          success: undefined as unknown as Layout,
          failure: undefined as unknown as Layout
        }
        memo.set(ast, layout)
        layout.success = compile(tps[0])
        layout.failure = compile(tps[1])
        return layout
      }
      case "effect/schema/Exit": {
        const layout = {
          _: "exit" as const,
          value: undefined as unknown as Layout,
          error: undefined as unknown as Layout,
          defect: undefined as unknown as Layout
        }
        memo.set(ast, layout)
        layout.value = compile(tps[0])
        layout.error = compile(tps[1])
        layout.defect = compile(tps[2])
        return layout
      }
      case "effect/schema/Cause":
      case "effect/schema/CauseReason": {
        const layout = {
          _: id === "effect/schema/Cause" ? "cause" as const : "causeReason" as const,
          error: undefined as unknown as Layout,
          defect: undefined as unknown as Layout
        }
        memo.set(ast, layout)
        layout.error = compile(tps[0])
        layout.defect = compile(tps[1])
        return layout
      }
    }
    if (isJsonDeclaration(ast)) return { _: "json" }
    throw new Error(`Binary layout: declaration ${id ?? "<anonymous>"} has no toCodecJson or toCodec`)
  }

  function compileUnion(ast: SchemaAST.AST, members: Array<SchemaAST.AST>): Layout {
    if (members.length === 0) return { _: "never", ast }
    const variantMembers: Array<{ member: SchemaAST.AST; sentinels: ReadonlyArray<SchemaAST.Sentinel> }> = []
    const rowMembers: Array<{ member: SchemaAST.AST; kind: number }> = []
    const literalRows = new Map<number, Layout>()
    const addLiteralRow = (kind: number, row: Layout) => {
      const existing = literalRows.get(kind)
      if (existing !== undefined && existing._ !== row._) {
        throw new Error("Binary layout: union members are not uniquely identifiable")
      }
      literalRows.set(kind, row)
    }
    for (const member of members) {
      if (member._tag === "Literal") {
        addLiteralRow(astKind(member), { _: literalKind(member.literal) })
        continue
      }
      if (member._tag === "UniqueSymbol") {
        astKind(member) // validates the symbol is registered
        addLiteralRow(K.string, { _: "symbol" })
        continue
      }
      if (member._tag === "Objects" || member._tag === "Arrays") {
        const sentinels = SchemaAST.collectSentinels(member)
        if (sentinels !== undefined && sentinels.length > 0) {
          for (const sentinel of sentinels) {
            if (typeof sentinel.key === "symbol") {
              throw new Error("Binary layout: symbol property names are illegal")
            }
          }
          variantMembers.push({ member, sentinels })
          continue
        }
      }
      rowMembers.push({ member, kind: astKind(member) })
    }
    // in-band: only literal members that share one wire kind
    if (variantMembers.length === 0 && rowMembers.length === 0 && literalRows.size === 1) {
      return literalRows.values().next().value!
    }
    const kinds = new Set<number>(literalRows.keys())
    for (const { kind } of rowMembers) {
      if (kinds.has(kind)) {
        throw new Error("Binary layout: union members are not uniquely identifiable")
      }
      kinds.add(kind)
    }
    // single untagged member unwraps
    if (variantMembers.length === 0 && literalRows.size === 0 && rowMembers.length === 1) {
      const layout = compile(rowMembers[0].member)
      memo.set(ast, layout)
      return layout
    }
    const tags = new Map<number, ReadonlyArray<SchemaAST.Sentinel>>()
    for (const { sentinels } of variantMembers) {
      const tag = sentinelSetHash(sentinels)
      if (tags.has(tag)) {
        throw new Error(`Binary layout sentinel collision: ${tag}`)
      }
      tags.set(tag, sentinels)
    }
    const layout: UnionLayout = { _: "union", ast, variants: [], byTag: new Map(), others: [], byKind: new Map() }
    memo.set(ast, layout)
    for (const { member, sentinels } of variantMembers) {
      const tag = sentinelSetHash(sentinels)
      const full = compile(member)
      let payload: Layout
      let tuple: boolean
      if (member._tag === "Objects") {
        const struct = full as StructLayout
        const sentinelNames = new Set(sentinels.map((s) => String(s.key)))
        const fields = struct.fields.filter((f) => !sentinelNames.has(f.name))
        payload = {
          _: "struct",
          ast: struct.ast,
          fields,
          byId: new Map(fields.map((f) => [f.id, f])),
          extra: struct.extra
        }
        tuple = false
      } else {
        payload = full
        tuple = true
      }
      const row: VariantRow = { tag, sentinels, tuple, payload }
      layout.variants.push(row)
      layout.byTag.set(tag, row)
    }
    for (const [kind, row] of literalRows) {
      layout.others.push(row)
      layout.byKind.set(kind, row)
    }
    for (const { kind, member } of rowMembers) {
      const row = compile(member)
      layout.others.push(row)
      layout.byKind.set(kind, row)
    }
    layout.others.sort((a, b) => matchRank(a) - matchRank(b))
    return layout
  }

  return compile(root)
}

// specific runtime guards first, `json` (which matches anything) last
function matchRank(layout: Layout): number {
  switch (layout._) {
    case "json":
      return 2
    case "struct":
      return 1
    default:
      return 0
  }
}

function matchesLayout(layout: Layout, value: unknown): boolean {
  switch (layout._) {
    case "bool":
      return typeof value === "boolean"
    case "null":
      return value === null
    case "undefined":
      return value === undefined
    case "f64":
      return typeof value === "number"
    case "string":
      return typeof value === "string"
    case "symbol":
      return typeof value === "symbol"
    case "bigint":
      return typeof value === "bigint"
    case "bytes":
      return value instanceof Uint8Array
    case "int64":
      return layout.flavor === "date"
        ? value instanceof Date
        : DateTime.isDateTime(value) && value._tag === "Utc"
    case "dateTimeZoned":
      return DateTime.isDateTime(value) && value._tag === "Zoned"
    case "duration":
      return Duration.isDuration(value)
    case "bigDecimal":
      return BigDecimal.isBigDecimal(value)
    case "option":
      return Option.isOption(value)
    case "result":
      return Result.isResult(value)
    case "exit":
      return Exit.isExit(value)
    case "cause":
      return Cause.isCause(value)
    case "causeReason":
      return Cause.isReason(value)
    case "array":
      return Array.isArray(value)
    case "struct":
      return Predicate.isObject(value) && !Array.isArray(value)
    case "json":
      return true
    case "union":
    case "never":
      return false
  }
}

// -----------------------------------------------------------------------------
// encode
// -----------------------------------------------------------------------------

interface EncodeContext {
  readonly cycle: WeakSet<object>
  readonly options: SchemaAST.ParseOptions
  readonly scratch: Array<Writer>
  scratchDepth: number
  readonly indexSignatures: WeakMap<StructLayout, Map<string, ExtraSignature | undefined>>
}

function encodeFail(expected: string, input: unknown, options: SchemaAST.ParseOptions): never {
  throw new IssueError(new SchemaIssue.InvalidValue({ expected }, input, options))
}

function isCyclic(value: unknown, stack = new Set<object>()): boolean {
  if (!Predicate.isObject(value)) return false
  if (
    value instanceof Date ||
    value instanceof Uint8Array ||
    DateTime.isDateTime(value) ||
    Duration.isDuration(value) ||
    BigDecimal.isBigDecimal(value)
  ) return false
  if (stack.has(value)) return true
  stack.add(value)
  try {
    if (Option.isOption(value)) {
      return Option.isSome(value) && isCyclic(value.value, stack)
    }
    if (Result.isResult(value)) {
      return isCyclic(Result.isSuccess(value) ? value.success : value.failure, stack)
    }
    if (Exit.isExit(value)) {
      return isCyclic(Exit.isSuccess(value) ? value.value : value.cause, stack)
    }
    if (Cause.isCause(value)) {
      return value.reasons.some((reason) => isCyclic(reason, stack))
    }
    if (Cause.isReason(value)) {
      switch (value._tag) {
        case "Fail":
          return isCyclic(value.error, stack)
        case "Die":
          return isCyclic(value.defect, stack)
        case "Interrupt":
          return false
      }
    }
    if (Chunk.isChunk(value)) {
      for (const item of value) {
        if (isCyclic(item, stack)) return true
      }
      return false
    }
    if (HashMap.isHashMap(value)) {
      for (const [key, item] of value) {
        if (isCyclic(key, stack) || isCyclic(item, stack)) return true
      }
      return false
    }
    if (HashSet.isHashSet(value)) {
      for (const item of value) {
        if (isCyclic(item, stack)) return true
      }
      return false
    }
    if (Redacted.isRedacted(value)) {
      return isCyclic(Redacted.value(value), stack)
    }
    for (const key of Object.keys(value)) {
      if (isCyclic((value as Record<string, unknown>)[key], stack)) return true
    }
  } finally {
    stack.delete(value)
  }
  return false
}

function withCycleCheck<A>(ctx: EncodeContext, value: unknown, f: () => A): A {
  if (Predicate.isObject(value)) {
    if (ctx.cycle.has(value)) encodeFail("acyclic value", value, ctx.options)
    ctx.cycle.add(value)
    try {
      return f()
    } finally {
      ctx.cycle.delete(value)
    }
  }
  return f()
}

function findIndexSignature(
  layout: StructLayout,
  key: string,
  options: SchemaAST.ParseOptions,
  cache: WeakMap<StructLayout, Map<string, ExtraSignature | undefined>>
): ExtraSignature | undefined {
  let entries = cache.get(layout)
  if (entries === undefined) {
    entries = new Map()
    cache.set(layout, entries)
  }
  if (entries.has(key)) return entries.get(key)
  const signature = layout.extra.find((s) =>
    SchemaAST.getIndexSignatureKeys({ [key]: null }, s.parameter, options).length > 0
  )
  entries.set(key, signature)
  return signature
}

function withScratch<A>(ctx: EncodeContext, f: (writer: Writer) => A): A {
  const index = ctx.scratchDepth++
  const writer = ctx.scratch[index] ?? (ctx.scratch[index] = new Writer())
  writer.len = 0
  try {
    return f(writer)
  } finally {
    ctx.scratchDepth--
  }
}

function writeSized(ctx: EncodeContext, w: Writer, encode: (writer: Writer) => void) {
  withScratch(ctx, (tmp) => {
    encode(tmp)
    w.uvarint(tmp.len)
    w.bytes(tmp.buf.subarray(0, tmp.len))
  })
}

function encodeSized(ctx: EncodeContext, layout: Layout, value: unknown, w: Writer) {
  writeSized(ctx, w, (tmp) => encodeValue(ctx, layout, value, tmp))
}

function encodeSymbol(ctx: EncodeContext, value: unknown, w: Writer) {
  const key = globalThis.Symbol.keyFor(value as symbol)
  if (key === undefined) encodeFail("registered symbol", value, ctx.options)
  w.bytes(utf8Encode.encode(key))
}

function encodeReason(ctx: EncodeContext, layout: { error: Layout; defect: Layout }, value: unknown, w: Writer) {
  const reason = value as Cause.Reason<unknown>
  switch (reason._tag) {
    case "Fail":
      w.byte(0)
      encodeValue(ctx, layout.error, reason.error, w)
      return
    case "Die":
      w.byte(1)
      encodeValue(ctx, layout.defect, reason.defect, w)
      return
    case "Interrupt":
      if (reason.fiberId === undefined) {
        w.byte(2)
      } else {
        w.byte(3)
        w.f64(reason.fiberId)
      }
  }
}

function encodeStructFields(ctx: EncodeContext, layout: StructLayout, value: object, w: Writer) {
  const obj = value as Record<string, unknown>
  if (layout.extra.length > 0) {
    const named = new Set(layout.fields.map((f) => f.name))
    const pairs: Array<[Uint8Array, string, ExtraSignature]> = []
    for (const key of Object.keys(obj)) {
      if (named.has(key)) continue
      const signature = findIndexSignature(layout, key, ctx.options, ctx.indexSignatures)
      if (signature === undefined) continue
      pairs.push([utf8Encode.encode(key), key, signature])
    }
    if (pairs.length > 0) {
      pairs.sort((a, b) => compareBytes(a[0], b[0]))
      w.uvarint(0)
      writeSized(ctx, w, (tmp) => {
        for (const [keyBytes, key, signature] of pairs) {
          tmp.uvarint(keyBytes.length)
          tmp.bytes(keyBytes)
          atKey(key, () => encodeSized(ctx, signature.layout, obj[key], tmp))
        }
      })
    }
  }
  for (const field of layout.fields) {
    if (!Object.hasOwn(obj, field.name)) {
      if (field.optional) continue
      throw new IssueError(new SchemaIssue.Pointer([field.name], new SchemaIssue.MissingKey(field.annotations)))
    }
    w.uvarint(field.id)
    atKey(field.name, () => encodeSized(ctx, field.layout, obj[field.name], w))
  }
}

function arraySlot(layout: ArrayLayout, index: number, count: number): Layout {
  const elementLen = layout.elements.length
  if (index < elementLen) return layout.elements[index].layout
  const tailLen = Math.max(0, layout.rest.length - 1)
  const tailThreshold = Math.max(elementLen, count - tailLen)
  return index >= tailThreshold ? layout.rest[index - tailThreshold + 1] : layout.rest[0]
}

function encodeArray(ctx: EncodeContext, layout: ArrayLayout, value: unknown, w: Writer) {
  const arr = value as ReadonlyArray<unknown>
  if (layout.rest.length === 0 && arr.length > layout.elements.length) {
    throw new IssueError(
      new SchemaIssue.Pointer(
        [layout.elements.length],
        new SchemaIssue.UnexpectedKey(layout.ast, arr[layout.elements.length], ctx.options)
      )
    )
  }
  if (arr.length < layout.minCount) {
    throw new IssueError(new SchemaIssue.Pointer([arr.length], new SchemaIssue.MissingKey(undefined)))
  }
  if (layout.hasCount) w.uvarint(arr.length)
  for (let i = 0; i < arr.length; i++) {
    const slot = arraySlot(layout, i, arr.length)
    atKey(i, () => {
      if (packedSize(slot) !== undefined || slot._ === "null" || slot._ === "undefined") {
        encodeValue(ctx, slot, arr[i], w)
      } else {
        encodeSized(ctx, slot, arr[i], w)
      }
    })
  }
}

function encodeUnion(ctx: EncodeContext, layout: UnionLayout, value: unknown, w: Writer) {
  for (const variant of layout.variants) {
    const matches = variant.tuple
      ? Array.isArray(value) && variant.sentinels.every((s) => value[s.key as number] === s.literal)
      : Predicate.isObject(value) && !Array.isArray(value) &&
        variant.sentinels.every((s) => (value as Record<PropertyKey, unknown>)[s.key] === s.literal)
    if (matches) {
      w.byte(K.variant)
      w.u32le(variant.tag)
      encodeValue(ctx, variant.payload, value, w)
      return
    }
  }
  for (const member of layout.others) {
    if (matchesLayout(member, value)) {
      w.byte(kindByte(member))
      encodeValue(ctx, member, value, w)
      return
    }
  }
  throw new IssueError(new SchemaIssue.InvalidType(layout.ast, value, ctx.options))
}

function encodeValue(ctx: EncodeContext, layout: Layout, value: unknown, w: Writer): void {
  switch (layout._) {
    case "bool":
      w.byte(value === true ? 1 : 0)
      return
    case "null":
    case "undefined":
      return
    case "f64":
      w.f64(value as number)
      return
    case "string":
      w.bytes(utf8Encode.encode(value as string))
      return
    case "symbol":
      encodeSymbol(ctx, value, w)
      return
    case "bytes":
      w.bytes(value as Uint8Array)
      return
    case "bigint":
      w.zigzag(value as bigint)
      return
    case "int64": {
      const millis = layout.flavor === "date" ? (value as Date).getTime() : (value as DateTime.Utc).epochMilliseconds
      if (Number.isNaN(millis)) encodeFail("a valid Date", value, ctx.options)
      w.i64(BigInt(millis))
      return
    }
    case "dateTimeZoned": {
      const zoned = value as DateTime.Zoned
      w.i64(BigInt(zoned.epochMilliseconds))
      if (zoned.zone._tag === "Offset") {
        w.byte(0)
        w.i32le(zoned.zone.offset)
      } else {
        w.byte(1)
        w.bytes(utf8Encode.encode(zoned.zone.id))
      }
      return
    }
    case "duration": {
      const duration = (value as Duration.Duration).value
      switch (duration._tag) {
        case "Infinity":
          w.byte(1)
          return
        case "NegativeInfinity":
          w.byte(2)
          return
        case "Nanos":
          w.byte(0)
          w.zigzag(duration.nanos)
          return
        case "Millis":
          w.byte(0)
          w.zigzag(BigInt(duration.millis) * BIGINT_NANOS_PER_MILLI)
          return
      }
      return
    }
    case "bigDecimal": {
      const normalized = BigDecimal.normalize(value as BigDecimal.BigDecimal)
      w.zigzag(normalized.value)
      w.zigzag(BigInt(normalized.scale))
      return
    }
    case "json": {
      let text: string | undefined
      try {
        text = JSON.stringify(value)
      } catch {
        text = undefined
      }
      if (text === undefined) {
        if (isCyclic(value)) encodeFail("acyclic value", value, ctx.options)
        encodeFail("a JSON-serializable value", value, ctx.options)
      }
      w.bytes(utf8Encode.encode(text))
      return
    }
    case "option": {
      const option = value as Option.Option<unknown>
      if (option._tag === "None") {
        w.byte(0)
      } else {
        w.byte(1)
        withCycleCheck(ctx, option, () => encodeValue(ctx, layout.value, option.value, w))
      }
      return
    }
    case "result": {
      const result = value as Result.Result<unknown, unknown>
      withCycleCheck(ctx, result, () => {
        if (result._tag === "Success") {
          w.byte(0)
          encodeValue(ctx, layout.success, result.success, w)
        } else {
          w.byte(1)
          encodeValue(ctx, layout.failure, result.failure, w)
        }
      })
      return
    }
    case "exit": {
      const exit = value as Exit.Exit<unknown, unknown>
      withCycleCheck(ctx, exit, () => {
        if (exit._tag === "Success") {
          w.byte(0)
          encodeValue(ctx, layout.value, exit.value, w)
        } else {
          w.byte(1)
          encodeValue(ctx, { _: "cause", error: layout.error, defect: layout.defect }, exit.cause, w)
        }
      })
      return
    }
    case "cause": {
      const reasons = (value as Cause.Cause<unknown>).reasons
      withCycleCheck(ctx, value, () => {
        w.uvarint(reasons.length)
        for (const reason of reasons) {
          writeSized(ctx, w, (tmp) => encodeReason(ctx, layout, reason, tmp))
        }
      })
      return
    }
    case "causeReason":
      withCycleCheck(ctx, value, () => encodeReason(ctx, layout, value, w))
      return
    case "struct":
      withCycleCheck(ctx, value, () => encodeStructFields(ctx, layout, value as object, w))
      return
    case "array":
      withCycleCheck(ctx, value, () => encodeArray(ctx, layout, value, w))
      return
    case "union":
      encodeUnion(ctx, layout, value, w)
      return
    case "never":
      throw new IssueError(new SchemaIssue.InvalidType(layout.ast, value, ctx.options))
  }
}

function encodeFrame(layout: Layout, value: unknown, options: SchemaAST.ParseOptions): Uint8Array<ArrayBuffer> {
  const ctx: EncodeContext = {
    cycle: new WeakSet(),
    options,
    scratch: [],
    scratchDepth: 0,
    indexSignatures: new WeakMap()
  }
  const body = new Writer()
  body.byte(ENVELOPE)
  encodeValue(ctx, layout, value, body)
  const frame = new Writer()
  frame.uvarint(body.len)
  frame.bytes(body.buf.subarray(0, body.len))
  return frame.out()
}

// -----------------------------------------------------------------------------
// decode
// -----------------------------------------------------------------------------

// unknown union member skipped; only a struct field or a top-level union may
// resolve to "absent"
const ABSENT = globalThis.Symbol.for("~effect/encoding/SchemaBinary/absent")

function decodeChecked(layout: Layout, r: Reader): unknown {
  const value = decodeValue(layout, r)
  if (value !== ABSENT && r.pos !== r.end) invalid("no leftover bytes", undefined, r.options)
  return value
}

function decodeStruct(layout: StructLayout, r: Reader): unknown {
  const out: Record<string, unknown> = {}
  const seen = new Set<number>()
  while (r.pos < r.end) {
    const id = r.uvarint()
    const len = r.uvarint()
    if (seen.has(id)) invalid("unique field ids", undefined, r.options)
    seen.add(id)
    const sub = r.sub(len)
    if (id === 0) {
      decodeExtraPairs(layout, sub, out)
      continue
    }
    const field = layout.byId.get(id)
    if (field === undefined) continue
    const value = atKey(field.name, () => decodeChecked(field.layout, sub))
    if (value !== ABSENT) out[field.name] = value
  }
  const issues: Array<SchemaIssue.Issue> = []
  for (const field of layout.fields) {
    if (!field.optional && !Object.hasOwn(out, field.name)) {
      issues.push(new SchemaIssue.Pointer([field.name], new SchemaIssue.MissingKey(field.annotations)))
      if (r.options.errors !== "all") break
    }
  }
  if (issues.length > 0) {
    throw new IssueError(
      new SchemaIssue.Composite(layout.ast, issues as [SchemaIssue.Issue, ...Array<SchemaIssue.Issue>])
    )
  }
  return out
}

function decodeExtraPairs(layout: StructLayout, r: Reader, out: Record<string, unknown>) {
  const seen = new Set<string>()
  while (r.pos < r.end) {
    const keyLen = r.uvarint()
    const key = r.utf8(r.take(keyLen))
    if (seen.has(key)) invalid("unique extra keys", undefined, r.options)
    seen.add(key)
    const valueLen = r.uvarint()
    const sub = r.sub(valueLen)
    const signature = findIndexSignature(layout, key, r.options, r.indexSignatures)
    if (signature === undefined) continue
    const value = atKey(key, () => decodeChecked(signature.layout, sub))
    if (value !== ABSENT) out[key] = value
  }
}

function decodeArray(layout: ArrayLayout, r: Reader): unknown {
  const elementLen = layout.elements.length
  const count = layout.hasCount ? r.uvarint() : elementLen
  // Counts normally pay for at least one byte per slot. Zero-width null and
  // undefined slots are the exception, so cap their amplification explicitly.
  if (layout.hasCount && count > r.remaining + 1_048_576) {
    invalid("array count within allocation limit", count, r.options)
  }
  if (layout.rest.length === 0 && count > elementLen) {
    throw new IssueError(
      new SchemaIssue.Pointer([elementLen], new SchemaIssue.UnexpectedKey(layout.ast, undefined, r.options))
    )
  }
  if (count < layout.minCount) {
    throw new IssueError(new SchemaIssue.Pointer([count], new SchemaIssue.MissingKey(undefined)))
  }
  const out: Array<unknown> = []
  for (let i = 0; i < count; i++) {
    const slot = arraySlot(layout, i, count)
    const optional = i < elementLen && layout.elements[i].optional
    if (!layout.hasCount && r.remaining === 0 && !optional && slot._ !== "null" && slot._ !== "undefined") {
      throw new IssueError(new SchemaIssue.Pointer([i], new SchemaIssue.MissingKey(undefined)))
    }
    atKey(i, () => {
      const size = packedSize(slot)
      let value: unknown
      if (size !== undefined) {
        value = decodeChecked(slot, r.sub(size))
      } else if (slot._ === "null" || slot._ === "undefined") {
        value = decodeChecked(slot, r.sub(0))
      } else {
        value = decodeChecked(slot, r.sub(r.uvarint()))
      }
      if (value === ABSENT) {
        if (optional) invalid("known union member", undefined, r.options)
        throw new IssueError(new SchemaIssue.MissingKey(undefined))
      }
      out.push(value)
    })
  }
  if (!layout.hasCount && r.pos < r.end) {
    throw new IssueError(
      new SchemaIssue.Pointer([elementLen], new SchemaIssue.UnexpectedKey(layout.ast, undefined, r.options))
    )
  }
  return out
}

function decodeUnion(layout: UnionLayout, r: Reader): unknown {
  const kind = r.byte()
  if (kind === K.variant) {
    const tag = r.u32le()
    const variant = layout.byTag.get(tag)
    if (variant === undefined) {
      r.take(r.remaining)
      return ABSENT
    }
    const payload = decodeChecked(variant.payload, r)
    if (payload === ABSENT) return ABSENT
    if (!variant.tuple) {
      for (const sentinel of variant.sentinels) {
        ;(payload as Record<PropertyKey, unknown>)[sentinel.key] = sentinel.literal
      }
    }
    return payload
  }
  const member = layout.byKind.get(kind)
  if (member === undefined) {
    r.take(r.remaining)
    return ABSENT
  }
  return decodeChecked(member, r)
}

function decodeReason(layout: { error: Layout; defect: Layout }, r: Reader): unknown {
  const tag = r.byte()
  switch (tag) {
    case 0:
      return Cause.makeFailReason(requirePresent(decodeChecked(layout.error, r)))
    case 1:
      return Cause.makeDieReason(requirePresent(decodeChecked(layout.defect, r)))
    case 2:
      if (r.remaining !== 0) invalid("empty", undefined, r.options)
      return Cause.makeInterruptReason()
    case 3: {
      if (r.remaining !== 8) invalid("f64", undefined, r.options)
      return Cause.makeInterruptReason(r.f64())
    }
    default:
      // an unknown reason tag was added by a newer writer
      r.take(r.remaining)
      return ABSENT
  }
}

function requirePresent(value: unknown): unknown {
  if (value === ABSENT) throw new IssueError(new SchemaIssue.MissingKey(undefined))
  return value
}

function decodeValue(layout: Layout, r: Reader): unknown {
  switch (layout._) {
    case "bool": {
      if (r.remaining !== 1) invalid("bool", undefined, r.options)
      const b = r.byte()
      if (b > 1) invalid("bool", undefined, r.options)
      return b === 1
    }
    case "null":
      if (r.remaining !== 0) invalid("empty", undefined, r.options)
      return null
    case "undefined":
      if (r.remaining !== 0) invalid("empty", undefined, r.options)
      return undefined
    case "f64":
      if (r.remaining !== 8) invalid("f64", undefined, r.options)
      return r.f64()
    case "string":
      return r.utf8(r.take(r.remaining))
    case "symbol":
      return globalThis.Symbol.for(r.utf8(r.take(r.remaining)))
    case "bytes":
      return r.take(r.remaining).slice()
    case "bigint":
      return r.zigzag()
    case "int64": {
      if (r.remaining !== 8) invalid("int64", undefined, r.options)
      const millis = Number(r.i64())
      return layout.flavor === "date" ? new Date(millis) : DateTime.makeUnsafe(millis)
    }
    case "dateTimeZoned": {
      const millis = Number(r.i64())
      const tag = r.byte()
      let timeZone: number | string
      if (tag === 0) {
        if (r.remaining !== 4) invalid("time zone", undefined, r.options)
        timeZone = r.i32le()
      } else if (tag === 1) {
        timeZone = r.utf8(r.take(r.remaining))
      } else {
        return invalid("time zone", undefined, r.options)
      }
      try {
        return DateTime.makeZonedUnsafe(millis, { timeZone })
      } catch {
        return invalid("time zone", undefined, r.options)
      }
    }
    case "duration": {
      const tag = r.byte()
      switch (tag) {
        case 0:
          return Duration.nanos(r.zigzag())
        case 1:
          return Duration.infinity
        case 2:
          return Duration.negativeInfinity
        default:
          return invalid("duration", undefined, r.options)
      }
    }
    case "bigDecimal": {
      const value = r.zigzag()
      const scale = r.zigzag()
      if (scale > MAX_SAFE_BIGINT || -scale > MAX_SAFE_BIGINT) invalid("safe integer length", undefined, r.options)
      return BigDecimal.make(value, Number(scale))
    }
    case "json": {
      const text = r.utf8(r.take(r.remaining))
      try {
        return JSON.parse(text)
      } catch {
        return invalid("json", undefined, r.options)
      }
    }
    case "option": {
      const tag = r.byte()
      if (tag === 0) {
        if (r.remaining !== 0) invalid("empty", undefined, r.options)
        return Option.none()
      }
      if (tag !== 1) invalid("bool", undefined, r.options)
      return Option.some(requirePresent(decodeChecked(layout.value, r)))
    }
    case "result": {
      const tag = r.byte()
      if (tag === 0) return Result.succeed(requirePresent(decodeChecked(layout.success, r)))
      if (tag !== 1) invalid("bool", undefined, r.options)
      return Result.fail(requirePresent(decodeChecked(layout.failure, r)))
    }
    case "exit": {
      const tag = r.byte()
      if (tag === 0) return Exit.succeed(requirePresent(decodeChecked(layout.value, r)))
      if (tag !== 1) invalid("bool", undefined, r.options)
      const cause = decodeValue({ _: "cause", error: layout.error, defect: layout.defect }, r)
      return Exit.failCause(cause as Cause.Cause<unknown>)
    }
    case "cause": {
      const count = r.uvarint()
      const reasons: Array<Cause.Reason<unknown>> = []
      for (let i = 0; i < count; i++) {
        const reason = atKey(i, () => decodeReason(layout, r.sub(r.uvarint())))
        // unknown reason tags from newer writers are dropped
        if (reason !== ABSENT) reasons.push(reason as Cause.Reason<unknown>)
      }
      if (r.pos !== r.end) invalid("no leftover bytes", undefined, r.options)
      return Cause.fromReasons(reasons)
    }
    case "causeReason":
      return decodeReason(layout, r)
    case "struct":
      return decodeStruct(layout, r)
    case "array":
      return decodeArray(layout, r)
    case "union":
      return decodeUnion(layout, r)
    case "never":
      throw new IssueError(new SchemaIssue.InvalidType(layout.ast, undefined, r.options))
  }
}

function decodeFrameBody(layout: Layout, r: Reader): unknown {
  const envelope = r.byte()
  if (envelope !== ENVELOPE) invalid("version 1 envelope, flags 0", envelope, r.options)
  const value = decodeChecked(layout, r)
  if (value === ABSENT) throw new IssueError(new SchemaIssue.MissingKey(undefined))
  return value
}

function decodeOneShot(layout: Layout, bytes: Uint8Array, options: SchemaAST.ParseOptions): unknown {
  const r = new Reader(bytes, 0, bytes.length, options)
  const n = r.uvarint()
  if (n === 0) invalid("nonzero frame length", undefined, options)
  const body = r.sub(n)
  const value = decodeFrameBody(layout, body)
  if (r.pos !== bytes.length) invalid("no leftover bytes", undefined, options)
  return value
}

// -----------------------------------------------------------------------------
// user API
// -----------------------------------------------------------------------------

function makeTransformation(layout: Layout): SchemaTransformation.Transformation<unknown, Uint8Array<ArrayBuffer>> {
  return SchemaTransformation.transformOrFail({
    decode: (bytes: Uint8Array<ArrayBuffer>, options) =>
      Effect.suspend(() => {
        try {
          return Effect.succeed(decodeOneShot(layout, bytes, options))
        } catch (e) {
          if (e instanceof IssueError) return Effect.fail(e.issue)
          throw e
        }
      }),
    encode: (value: unknown, options) =>
      Effect.suspend(() => {
        try {
          return Effect.succeed(encodeFrame(layout, value, options))
        } catch (e) {
          if (e instanceof IssueError) return Effect.fail(e.issue)
          throw e
        }
      })
  })
}

function compileTarget(schema: Schema.Constraint): { target: Schema.Constraint; layout: Layout } {
  const target = Schema.make<Schema.Constraint>(toBinaryAST(schema.ast))
  const layout = compileLayout(SchemaAST.toEncoded(target.ast))
  return { target, layout }
}

function withCycleGuard(target: Schema.Constraint): Schema.Constraint {
  const isTarget = Schema.is(target)
  const guard = Schema.declare(
    (value: unknown): value is unknown => !isCyclic(value) && isTarget(value),
    { identifier: "acyclic value" }
  )
  return Schema.decodeTo(
    guard,
    SchemaTransformation.passthrough()
  )(target)
}

/**
 * The codec type returned by {@link toCodec}.
 *
 * @category models
 * @since 4.0.0
 */
export interface toCodec<S extends Schema.Constraint> extends
  Schema.Codec<
    S["Type"],
    Uint8Array<ArrayBuffer>,
    S["DecodingServices"],
    S["EncodingServices"]
  >
{}

/**
 * Derives a compact binary codec from a schema.
 *
 * The wire layout is compiled from the encoded-side AST at construction and
 * schema-author bugs (field-id collisions, symbol property names, unannotated
 * declarations, unions whose members are not uniquely identifiable) throw an
 * `Error` immediately.
 *
 * One-shot encode/decode reuse the existing runners: exactly one frame,
 * leftover bytes are malformed. Use {@link parser} for concatenated frames.
 *
 * **Example**
 *
 * ```ts
 * import { Schema } from "effect"
 * import { SchemaBinary } from "effect/unstable/encoding"
 *
 * const Person = Schema.Struct({ name: Schema.String, age: Schema.Number })
 * const codec = SchemaBinary.toCodec(Person)
 *
 * const bytes = Schema.encodeUnknownSync(codec)({ name: "Ada", age: 36 })
 * const person = Schema.decodeUnknownSync(codec)(bytes)
 * ```
 *
 * @category constructors
 * @since 4.0.0
 */
export function toCodec<S extends Schema.Constraint>(schema: S): toCodec<S> {
  const { layout, target } = compileTarget(schema)
  return (Schema.Uint8Array as Schema.instanceOf<Uint8Array<ArrayBuffer>>).pipe(
    Schema.decodeTo(withCycleGuard(target), makeTransformation(layout))
  ) as unknown as toCodec<S>
}

/**
 * A stateful frame parser for concatenated {@link toCodec} outputs.
 *
 * @category models
 * @since 4.0.0
 */
export interface Parser<T> {
  /**
   * @since 4.0.0
   */
  feed(chunk: Uint8Array): Effect.Effect<ReadonlyArray<T>, Schema.SchemaError>
  /**
   * @since 4.0.0
   */
  feedSync(chunk: Uint8Array): ReadonlyArray<T>
  /**
   * @since 4.0.0
   */
  end(): Effect.Effect<void, Schema.SchemaError>
  /**
   * @since 4.0.0
   */
  endSync(): void
}

/**
 * Creates a stateful parser for a stream of concatenated frames.
 *
 * The sync surface is the real parser: `feed` / `end` are `Effect.suspend`
 * wrappers around `feedSync` / `endSync`. Values completed before a failure
 * stay observable; after a failure the parser is spent and rejects further
 * calls.
 *
 * @category constructors
 * @since 4.0.0
 */
export function parser<S extends Schema.Constraint>(
  schema: S,
  options?: SchemaAST.ParseOptions & { readonly maxFrameSize?: number | undefined }
): Parser<S["Type"]> {
  const { layout, target } = compileTarget(schema)
  const parseOptions: SchemaAST.ParseOptions = options ?? {}
  const maxFrameSize = options?.maxFrameSize
  const decodeEncoded = Schema.decodeUnknownSync(target as Schema.ConstraintDecoder<unknown>, parseOptions)
  let buffer = new Uint8Array(0)
  let bufferStart = 0
  let bufferEnd = 0
  let stashed: Schema.SchemaError | undefined
  let spent = false

  const failSync = (expected: string, input?: unknown): never => {
    throw new Schema.SchemaError(new SchemaIssue.InvalidValue({ expected }, input, parseOptions))
  }

  const takeStashed = (): never => {
    const error = stashed!
    stashed = undefined
    throw error
  }

  const self: Parser<S["Type"]> = {
    feedSync(chunk) {
      if (stashed !== undefined) return takeStashed()
      if (spent) return failSync("parser is spent")
      if (chunk.length > 0) {
        const remaining = bufferEnd - bufferStart
        const required = remaining + chunk.length
        if (required > buffer.length) {
          const next = new Uint8Array(Math.max(256, buffer.length * 2, required))
          next.set(buffer.subarray(bufferStart, bufferEnd))
          buffer = next
          bufferStart = 0
          bufferEnd = remaining
        } else if (bufferStart > 0) {
          buffer.copyWithin(0, bufferStart, bufferEnd)
          bufferStart = 0
          bufferEnd = remaining
        }
        buffer.set(chunk, bufferEnd)
        bufferEnd += chunk.length
      }
      const out: Array<S["Type"]> = []
      const fail = (expected: string, input?: unknown): Array<S["Type"]> => {
        spent = true
        const error = new Schema.SchemaError(new SchemaIssue.InvalidValue({ expected }, input, parseOptions))
        if (out.length === 0) throw error
        stashed = error
        buffer = new Uint8Array(0)
        bufferStart = bufferEnd = 0
        return out
      }
      while (true) {
        // frame length varint: fewer than 10 bytes without a terminator waits,
        // 10 continuation bytes is malformed immediately
        let n = BIGINT_ZERO
        let headerLen = -1
        const buffered = bufferEnd - bufferStart
        for (let i = 0; i < Math.min(10, buffered); i++) {
          const b = buffer[bufferStart + i]
          n |= BigInt(b & 0x7F) << BigInt(i * 7)
          if ((b & 0x80) === 0) {
            headerLen = i + 1
            break
          }
        }
        if (headerLen === -1) {
          if (buffered >= 10) return fail("uvarint", buffer.subarray(bufferStart, bufferStart + 10))
          return out
        }
        if (n > MAX_SAFE_BIGINT) return fail("safe integer length", n)
        const frameLen = Number(n)
        if (frameLen === 0) return fail("nonzero frame length", frameLen)
        if (maxFrameSize !== undefined && frameLen > maxFrameSize) {
          return fail("frame within maxFrameSize", frameLen)
        }
        if (headerLen + frameLen > buffered) return out
        try {
          const bodyStart = bufferStart + headerLen
          const body = new Reader(buffer, bodyStart, bodyStart + frameLen, parseOptions)
          out.push(decodeEncoded(decodeFrameBody(layout, body)))
        } catch (e) {
          spent = true
          const error = e instanceof IssueError
            ? new Schema.SchemaError(e.issue)
            : Schema.isSchemaError(e)
            ? e
            : (() => {
              throw e
            })()
          if (out.length === 0) throw error
          stashed = error
          buffer = new Uint8Array(0)
          bufferStart = bufferEnd = 0
          return out
        }
        bufferStart += headerLen + frameLen
        if (bufferStart === bufferEnd) bufferStart = bufferEnd = 0
      }
    },
    endSync() {
      if (stashed !== undefined) return takeStashed()
      if (spent) return failSync("parser is spent")
      spent = true
      if (bufferStart < bufferEnd) return failSync("complete value", buffer.subarray(bufferStart, bufferEnd))
    },
    feed: (chunk) =>
      Effect.suspend(() => {
        try {
          return Effect.succeed(self.feedSync(chunk))
        } catch (e) {
          if (Schema.isSchemaError(e)) return Effect.fail(e)
          throw e
        }
      }),
    end: () =>
      Effect.suspend(() => {
        try {
          self.endSync()
          return Effect.void
        } catch (e) {
          if (Schema.isSchemaError(e)) return Effect.fail(e)
          throw e
        }
      })
  }
  return self
}

/**
 * Assigns an explicit wire field id to a struct property.
 *
 * By default a field's wire id is the 32-bit FNV-1a hash of its property
 * name. An explicit id overrides that hash, which allows renaming a field
 * without breaking the wire format, or resolving a hash collision.
 *
 * `0` is reserved for the extra-keys map and non-integers are invalid; both
 * throw immediately.
 *
 * **Example**
 *
 * ```ts
 * import { Schema } from "effect"
 * import { SchemaBinary } from "effect/unstable/encoding"
 *
 * const Person = Schema.Struct({
 *   id: Schema.String.pipe(SchemaBinary.fieldId(1))
 * })
 * ```
 *
 * @category annotations
 * @since 4.0.0
 */
export function fieldId(id: number) {
  if (!Number.isInteger(id) || id <= 0 || id > 0xFFFFFFFF) {
    throw new Error(`Binary layout field id must be an integer in [1, 4294967295], got ${id}`)
  }
  const annotations = { [FIELD_ID_ANNOTATION_KEY]: id }
  const annotateLastLink = SchemaAST.applyToLastLink((ast) => SchemaAST.annotateKey(ast, annotations))
  return <S extends Schema.Top>(self: S): S["Rebuild"] =>
    self.rebuild(annotateLastLink(SchemaAST.annotateKey(self.ast, annotations)))
}
