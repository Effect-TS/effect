/**
 * A compact binary codec derived from the encoded side of a Schema.
 *
 * The default wire format supports compatible schema evolution. Fingerprint
 * mode uses positional layouts and rejects mismatches for smaller frames.
 * Encoded results are arena-backed views; see {@link toCodec} for ownership
 * details.
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
import * as InternalRecord from "../../internal/record.ts"
import * as Option from "../../Option.ts"
import * as Predicate from "../../Predicate.ts"
import * as Redacted from "../../Redacted.ts"
import * as Result from "../../Result.ts"
import * as Schema from "../../Schema.ts"
import * as SchemaAST from "../../SchemaAST.ts"
import * as SchemaIssue from "../../SchemaIssue.ts"
import * as SchemaParser from "../../SchemaParser.ts"
import * as SchemaTransformation from "../../SchemaTransformation.ts"

const FIELD_ID_ANNOTATION_KEY = "~effect/encoding/SchemaBinary/fieldId"

// Bit 0 selects fingerprint mode; all other flag bits are reserved.
const ENVELOPE = 0x10 // version nibble 1, flags 0
const ENVELOPE_FINGERPRINT = 0x11 // version nibble 1, flag bit 0

const MAX_SAFE_BIGINT = BigInt(Number.MAX_SAFE_INTEGER)
const BIGINT_ZERO = BigInt(0)
const BIGINT_ONE = BigInt(1)
const BIGINT_TWO = BigInt(2)
const BIGINT_SEVEN = BigInt(7)
const BIGINT_VARINT_MASK = BigInt(0x7F)
const BIGINT_NANOS_PER_MILLI = BigInt(1_000_000)
const BIGINT_BYTE_MASK = BigInt(0xFF)
const BIGINT_U32_MASK = BigInt(0xFFFFFFFF)
const BIGINT_THIRTY_TWO = BigInt(32)

const utf8Encode = new TextEncoder()
const utf8DecodeFatal = new TextDecoder("utf-8", { fatal: true })

// General numbers use up to seven varint bytes or an eight-byte f64.
const NUMBER_VARINT_MAX_BYTES = 7

const NUMBER_VARINT_MAX_MAGNITUDE = 281_474_976_710_655 // 2 ** 48 - 1

// Above this magnitude, build the sign-magnitude code with bigint.
const EXACT_MAGNITUDE_MAX = 4_503_599_627_370_495 // 2 ** 52 - 1

const NUMBER_RUN_F64 = 0
const NUMBER_RUN_VARINT = 1

function isVarintNumber(value: unknown): boolean {
  return typeof value === "number" && Number.isInteger(value) &&
    value >= -NUMBER_VARINT_MAX_MAGNITUDE && value <= NUMBER_VARINT_MAX_MAGNITUDE
}

// Sign-magnitude preserves `-0`, unlike zigzag.
function decodeSignMagnitude(code: number): number {
  const magnitude = Math.floor(code / 2)
  return code % 2 === 1 ? -magnitude : magnitude
}

const K = {
  bool: 1,
  null: 2,
  undefined: 3,
  number: 4,
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

function fnv32(bytes: ArrayLike<number>): number {
  let hash = 0x811C9DC5
  for (let i = 0; i < bytes.length; i++) {
    hash = Math.imul(hash ^ bytes[i], 0x01000193)
  }
  return hash >>> 0
}

const FNV64_OFFSET_BASIS = BigInt("14695981039346656037")
const FNV64_PRIME = BigInt("1099511628211")
const FNV64_MASK = BigInt("18446744073709551615")

function fnv64(bytes: ArrayLike<number>): bigint {
  let hash = FNV64_OFFSET_BASIS
  for (let i = 0; i < bytes.length; i++) {
    hash = ((hash ^ BigInt(bytes[i])) * FNV64_PRIME) & FNV64_MASK
  }
  return hash
}

function pushBytes(out: Array<number>, bytes: ArrayLike<number>) {
  for (let i = 0; i < bytes.length; i++) out.push(bytes[i])
}

function pushUvarint(out: Array<number>, n: number) {
  while (n > 0x7F) {
    out.push((n & 0x7F) | 0x80)
    n = Math.floor(n / 128)
  }
  out.push(n)
}

function pushU32(out: Array<number>, n: number) {
  out.push(n & 0xFF, (n >>> 8) & 0xFF, (n >>> 16) & 0xFF, (n >>> 24) & 0xFF)
}

function pushU64(out: Array<number>, n: bigint) {
  for (let i = 0; i < 8; i++) {
    out.push(Number((n >> BigInt(i * 8)) & BIGINT_BYTE_MASK))
  }
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
  throw issueError(new SchemaIssue.InvalidValue({ expected }, input, options))
}

// Materialize the ambient path only when raising an issue.
const issuePath: Array<PropertyKey> = []
let issuePathLen = 0

function issueError(issue: SchemaIssue.Issue): IssueError {
  return new IssueError(
    issuePathLen === 0 ? issue : new SchemaIssue.Pointer(issuePath.slice(0, issuePathLen), issue)
  )
}

function uvarintBytes(n: number): Uint8Array {
  const out = new Uint8Array(uvarintSize(n))
  let p = 0
  while (n > 0x7F) {
    out[p++] = (n & 0x7F) | 0x80
    n = Math.floor(n / 128)
  }
  out[p] = n
  return out
}

function uvarintSize(n: number): number {
  let size = 1
  while (n > 0x7F) {
    n = Math.floor(n / 128)
    size++
  }
  return size
}

// Avoid TextDecoder's fixed cost for short strings.
const UTF8_INLINE_LIMIT = 32

function decodeUtf8(
  buf: Uint8Array,
  start: number,
  end: number,
  options: SchemaAST.ParseOptions | undefined
): string {
  const len = end - start
  if (len === 0) return ""
  if (len <= UTF8_INLINE_LIMIT) {
    let ascii = true
    for (let i = start; i < end; i++) {
      if (buf[i] > 0x7F) {
        ascii = false
        break
      }
    }
    if (ascii) {
      let out = ""
      let i = start
      for (; i + 4 <= end; i += 4) out += String.fromCharCode(buf[i], buf[i + 1], buf[i + 2], buf[i + 3])
      for (; i < end; i++) out += String.fromCharCode(buf[i])
      return out
    }
  }
  try {
    return utf8DecodeFatal.decode(buf.subarray(start, end))
  } catch {
    invalid("utf-8", undefined, options)
  }
}

const OUTPUT_ARENA_SIZE = 8 * 1024

// Bound attacker-controlled keys retained between parser feeds.
const PARSER_INDEX_SIGNATURE_CACHE_SIZE = 256

interface OutputArena {
  readonly buf: Uint8Array<ArrayBuffer>
  readonly view: DataView<ArrayBuffer>
  offset: number
  writing: boolean
}

function makeOutputArena(size: number): OutputArena {
  const buf: Uint8Array<ArrayBuffer> = new Uint8Array(size)
  return { buf, view: new DataView(buf.buffer), offset: 0, writing: false }
}

let outputArena = makeOutputArena(OUTPUT_ARENA_SIZE)

class Writer {
  buf: Uint8Array<ArrayBuffer> = new Uint8Array(0)
  view = new DataView(this.buf.buffer)
  arena: OutputArena | undefined
  start = 0
  len = 0
  reset() {
    let arena = outputArena
    // Nested codecs cannot share the active arena tail.
    if (arena.writing || arena.offset >= arena.buf.length) {
      arena = outputArena = makeOutputArena(OUTPUT_ARENA_SIZE)
    }
    arena.writing = true
    this.arena = arena
    this.buf = arena.buf
    this.view = arena.view
    this.start = arena.offset
    this.len = 0
  }
  ensure(n: number) {
    if (this.start + this.len + n > this.buf.length) {
      const previous = this.arena!
      const required = this.len + n
      let size = OUTPUT_ARENA_SIZE
      while (size < required) size *= 2
      const next = makeOutputArena(size)
      next.writing = true
      next.buf.set(this.buf.subarray(this.start, this.start + this.len))
      previous.writing = false
      this.arena = outputArena = next
      this.buf = next.buf
      this.view = next.view
      this.start = 0
    }
  }
  byte(b: number) {
    this.ensure(1)
    this.buf[this.start + this.len++] = b
  }
  bytes(b: Uint8Array) {
    this.ensure(b.length)
    this.buf.set(b, this.start + this.len)
    this.len += b.length
  }
  uvarint(n: number) {
    this.ensure(10)
    const buf = this.buf
    let p = this.start + this.len
    while (n > 0x7F) {
      buf[p++] = (n & 0x7F) | 0x80
      n = n < 0x80000000 ? n >>> 7 : Math.floor(n / 128)
    }
    buf[p++] = n
    this.len = p - this.start
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
  numberVarint(n: number) {
    const negative = n < 0 || (n === 0 && 1 / n < 0)
    const magnitude = negative ? -n : n
    if (magnitude <= EXACT_MAGNITUDE_MAX) {
      this.uvarint(magnitude * 2 + (negative ? 1 : 0))
    } else {
      this.uvarintBig(BigInt(magnitude) * BIGINT_TWO + (negative ? BIGINT_ONE : BIGINT_ZERO))
    }
  }
  f64(n: number) {
    this.ensure(8)
    this.view.setFloat64(this.start + this.len, n, true)
    this.len += 8
  }
  i64(n: bigint) {
    this.ensure(8)
    this.view.setBigInt64(this.start + this.len, n, true)
    this.len += 8
  }
  u32le(n: number) {
    this.ensure(4)
    this.view.setUint32(this.start + this.len, n >>> 0, true)
    this.len += 4
  }
  i32le(n: number) {
    this.ensure(4)
    this.view.setInt32(this.start + this.len, n | 0, true)
    this.len += 4
  }
  // Writes a field id and reserves its length byte under one bounds check.
  idAndMark(idBytes: Uint8Array): number {
    const n = idBytes.length
    this.ensure(n + 1)
    const buf = this.buf
    let p = this.start + this.len
    for (let i = 0; i < n; i++) buf[p++] = idBytes[i]
    const mark = p - this.start
    this.len = mark + 1
    return mark
  }
  // Reserve one byte, then expand and backfill the length prefix if needed.
  beginSized(): number {
    this.ensure(1)
    return this.len++
  }
  endSized(mark: number) {
    const payload = this.len - mark - 1
    if (payload < 0x80) {
      this.buf[this.start + mark] = payload
      return
    }
    const size = uvarintSize(payload)
    const extra = size - 1
    this.ensure(extra)
    const absoluteMark = this.start + mark
    this.buf.copyWithin(absoluteMark + size, absoluteMark + 1, this.start + this.len)
    this.len += extra
    let n = payload
    let p = absoluteMark
    while (n > 0x7F) {
      this.buf[p++] = (n & 0x7F) | 0x80
      n = Math.floor(n / 128)
    }
    this.buf[p] = n
  }
  string(s: string) {
    const n = s.length
    if (n === 0) return
    this.ensure(n * 3)
    const buf = this.buf
    let p = this.start + this.len
    for (let i = 0; i < n; i++) {
      const c = s.charCodeAt(i)
      if (c > 0x7F) {
        this.len += utf8Encode.encodeInto(s, buf.subarray(this.start + this.len)).written
        return
      }
      buf[p++] = c
    }
    this.len = p - this.start
  }
  out(): Uint8Array<ArrayBuffer> {
    const arena = this.arena!
    const out = new Uint8Array(arena.buf.buffer, this.start, this.len)
    if (arena === outputArena) arena.offset = this.start + this.len
    arena.writing = false
    this.arena = undefined
    return out
  }
  abort() {
    const arena = this.arena
    if (arena === undefined) return
    if (arena === outputArena) arena.offset = this.start
    arena.writing = false
    this.arena = undefined
  }
}

// Index-signature predicates are not part of the fingerprint, so unmatched
// keys are dropped in both modes.
// A plain string parameter accepts every key without running the matcher.
function matchesEveryKey(parameter: SchemaAST.AST): boolean {
  const ast = SchemaAST.toEncoded(parameter)
  return ast._tag === "String" && ast.checks === undefined
}

function matchIndexSignature(
  layout: StructLayout,
  key: string,
  options: SchemaAST.ParseOptions
): ExtraSignature | undefined {
  return layout.extra.find((s) => SchemaAST.getIndexSignatureKeys({ [key]: null }, s.parameter, options).length > 0)
}

class IndexSignatureCache {
  entries = new WeakMap<StructLayout, Map<string, ExtraSignature | undefined>>()
  readonly orderLayouts: Array<StructLayout | undefined> | undefined
  readonly orderKeys: Array<string | undefined> | undefined
  readonly options: SchemaAST.ParseOptions
  size = 0
  next = 0
  replace = false
  // Only the parser cache outlives one operation, and it is always bounded.
  constructor(options: SchemaAST.ParseOptions, capacity?: number) {
    this.options = options
    this.orderLayouts = capacity === undefined ? undefined : new Array(capacity)
    this.orderKeys = capacity === undefined ? undefined : new Array(capacity)
  }
  beginFrame() {
    this.replace = true
  }
  find(layout: StructLayout, key: string): ExtraSignature | undefined {
    let entries = this.entries.get(layout)
    if (entries === undefined) {
      entries = new Map()
      this.entries.set(layout, entries)
    }
    if (entries.has(key)) return entries.get(key)
    const signature = matchIndexSignature(layout, key, this.options)
    const orderLayouts = this.orderLayouts
    if (orderLayouts === undefined) {
      entries.set(key, signature)
      return signature
    }
    const orderKeys = this.orderKeys!
    if (this.size < orderLayouts.length) {
      orderLayouts[this.size] = layout
      orderKeys[this.size] = key
      this.size++
      entries.set(key, signature)
    } else if (this.replace) {
      this.replace = false
      const evictedLayout = orderLayouts[this.next]!
      const evictedEntries = evictedLayout === layout ? entries : this.entries.get(evictedLayout)
      evictedEntries?.delete(orderKeys[this.next]!)
      orderLayouts[this.next] = layout
      orderKeys[this.next] = key
      this.next = (this.next + 1) % orderLayouts.length
      entries.set(key, signature)
    }
    return signature
  }
  clear() {
    this.entries = new WeakMap()
    this.orderLayouts?.fill(undefined)
    this.orderKeys?.fill(undefined)
    this.size = this.next = 0
    this.replace = false
  }
}

// A named buffer preserves the build's pure annotation for these placeholders.
const EMPTY_READER_ARRAY_BUFFER = new ArrayBuffer(0)
const EMPTY_READER_BUFFER = new Uint8Array(EMPTY_READER_ARRAY_BUFFER)
const EMPTY_READER_VIEW = new DataView(EMPTY_READER_ARRAY_BUFFER)
const EMPTY_PARSE_OPTIONS: SchemaAST.ParseOptions = {}

class Reader {
  pos = 0
  buf: Uint8Array = EMPTY_READER_BUFFER
  // Frames of varints and strings never need a view, so it is built on demand
  // and reused while the reader stays on one buffer.
  view: DataView | undefined
  viewCache: DataView = EMPTY_READER_VIEW
  viewBuffer: ArrayBufferLike = EMPTY_READER_ARRAY_BUFFER
  viewOffset = 0
  viewLength = 0
  end = 0
  options: SchemaAST.ParseOptions = EMPTY_PARSE_OPTIONS
  indexSignatures: IndexSignatureCache | undefined
  positional = false
  reset(
    buf: Uint8Array,
    start: number,
    end: number,
    options: SchemaAST.ParseOptions,
    indexSignatures: IndexSignatureCache | undefined,
    positional: boolean
  ) {
    this.view = undefined
    this.buf = buf
    this.pos = start
    this.end = end
    this.options = options
    this.indexSignatures = indexSignatures
    this.positional = positional
  }
  release() {
    this.pos = this.end = 0
    this.buf = EMPTY_READER_BUFFER
    this.view = undefined
    this.viewCache = EMPTY_READER_VIEW
    this.viewBuffer = EMPTY_READER_ARRAY_BUFFER
    this.viewOffset = this.viewLength = 0
    this.options = EMPTY_PARSE_OPTIONS
    this.indexSignatures = undefined
    this.positional = false
  }
  get remaining(): number {
    return this.end - this.pos
  }
  dataView(): DataView {
    const buf = this.buf
    if (
      buf.buffer !== this.viewBuffer || buf.byteOffset !== this.viewOffset || buf.byteLength !== this.viewLength
    ) {
      this.viewBuffer = buf.buffer
      this.viewOffset = buf.byteOffset
      this.viewLength = buf.byteLength
      this.viewCache = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
    }
    return this.view = this.viewCache
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
  // Decode a bounded child value without allocating another reader.
  enter(len: number): number {
    if (this.pos + len > this.end) invalid("complete value", undefined, this.options)
    const saved = this.end
    this.end = this.pos + len
    return saved
  }
  exit(saved: number) {
    this.pos = this.end
    this.end = saved
  }
  readUtf8(n: number): string {
    if (this.pos + n > this.end) invalid("complete value", undefined, this.options)
    const start = this.pos
    this.pos += n
    return decodeUtf8(this.buf, start, start + n, this.options)
  }
  // Use bitwise arithmetic for the first four varint groups.
  uvarint(): number {
    const buf = this.buf
    const end = this.end
    let pos = this.pos
    if (pos >= end) invalid("complete value", undefined, this.options)
    let b = buf[pos++]
    if (b < 0x80) {
      this.pos = pos
      return b
    }
    let value = b & 0x7F
    if (pos >= end) invalid("complete value", undefined, this.options)
    b = buf[pos++]
    value |= (b & 0x7F) << 7
    if (b < 0x80) {
      this.pos = pos
      return value
    }
    if (pos >= end) invalid("complete value", undefined, this.options)
    b = buf[pos++]
    value |= (b & 0x7F) << 14
    if (b < 0x80) {
      this.pos = pos
      return value
    }
    if (pos >= end) invalid("complete value", undefined, this.options)
    b = buf[pos++]
    value |= (b & 0x7F) << 21
    if (b < 0x80) {
      this.pos = pos
      return value
    }
    let scale = 268435456 // 2 ** 28
    for (let i = 4; i < 10; i++) {
      if (pos >= end) {
        this.pos = pos
        invalid("complete value", undefined, this.options)
      }
      b = buf[pos++]
      const chunk = (b & 0x7F) * scale
      if (chunk > Number.MAX_SAFE_INTEGER - value) {
        this.pos = pos
        invalid("safe integer length", undefined, this.options)
      }
      value += chunk
      if (b < 0x80) {
        this.pos = pos
        return value
      }
      scale *= 128
    }
    this.pos = pos
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
  // Wider schema-proven integers switch to bigint arithmetic.
  numberVarint(): number {
    const buf = this.buf
    const end = this.end
    let pos = this.pos
    let value = 0
    let scale = 1
    for (let i = 0; i < NUMBER_VARINT_MAX_BYTES; i++) {
      if (pos >= end) {
        this.pos = pos
        invalid("complete value", undefined, this.options)
      }
      const b = buf[pos++]
      value += (b & 0x7F) * scale
      if (b < 0x80) {
        this.pos = pos
        return decodeSignMagnitude(value)
      }
      scale *= 128
    }
    const code = this.uvarintBig()
    const magnitude = Number(code >> BIGINT_ONE)
    if (!Number.isFinite(magnitude)) invalid("safe integer length", undefined, this.options)
    return (code & BIGINT_ONE) === BIGINT_ONE ? -magnitude : magnitude
  }
  zigzag(): bigint {
    const u = this.uvarintBig()
    return (u & BIGINT_ONE) === BIGINT_ONE
      ? -((u + BIGINT_ONE) >> BIGINT_ONE)
      : u >> BIGINT_ONE
  }
  f64(): number {
    if (this.pos + 8 > this.end) invalid("complete value", undefined, this.options)
    const value = (this.view ?? this.dataView()).getFloat64(this.pos, true)
    this.pos += 8
    return value
  }
  i64(): bigint {
    if (this.pos + 8 > this.end) invalid("complete value", undefined, this.options)
    const value = (this.view ?? this.dataView()).getBigInt64(this.pos, true)
    this.pos += 8
    return value
  }
  u32le(): number {
    if (this.pos + 4 > this.end) invalid("complete value", undefined, this.options)
    const value = (this.view ?? this.dataView()).getUint32(this.pos, true)
    this.pos += 4
    return value
  }
  i32le(): number {
    if (this.pos + 4 > this.end) invalid("complete value", undefined, this.options)
    const value = (this.view ?? this.dataView()).getInt32(this.pos, true)
    this.pos += 4
    return value
  }
}

type LeafKind =
  | "bool"
  | "null"
  | "undefined"
  | "number"
  | "int"
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
  | LiteralLayout
  | { readonly _: "int64"; readonly flavor: "date" | "utc" }
  | { readonly _: "never"; readonly ast: SchemaAST.AST }
  | StructLayout
  | ArrayLayout
  | UnionLayout
  | { readonly _: "option"; value: Layout }
  | { readonly _: "result"; success: Layout; failure: Layout }
  | { readonly _: "exit"; value: Layout; cause: ReasonLayout }
  | ReasonLayout

// Literal values are validated here rather than by a downstream schema pass.
interface LiteralLayout {
  readonly _: "literal"
  readonly leaf: Layout
  readonly values: ReadonlyArray<SchemaAST.LiteralValue>
}

function hasLiteral(layout: LiteralLayout, value: unknown): boolean {
  const values = layout.values
  return values.length === 1 ? value === values[0] : values.includes(value as SchemaAST.LiteralValue)
}

function literalExpected(layout: LiteralLayout): string {
  return layout.values.map((value) => typeof value === "string" ? JSON.stringify(value) : String(value)).join(" | ")
}

interface ReasonLayout {
  readonly _: "cause" | "causeReason"
  error: Layout
  defect: Layout
}

interface Field {
  readonly name: string
  readonly id: number
  readonly idBytes: Uint8Array
  index: number
  readonly optional: boolean
  readonly annotations: Schema.Annotations.Key<unknown> | undefined
  layout: Layout
  inline: boolean
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
  // The lone signature every key matches, so lookups skip the cache.
  readonly extraAll: ExtraSignature | undefined
  readonly names: Set<string>
  optionalCount: number
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
  // Shared layout for `Schema.Array(S)`.
  uniform: Layout | undefined
  uniformInline: boolean
  uniformPacked: number | undefined
  uniformNumbers: boolean
}

interface VariantRow {
  readonly tag: number
  readonly sentinels: ReadonlyArray<SchemaAST.Sentinel>
  readonly tuple: boolean
  payload: Layout
  position: number
}

interface UnionMember {
  readonly kind: number
  readonly layout: Layout
  position: number
}

interface UnionPosition {
  readonly variant: VariantRow | undefined
  readonly layout: Layout
}

interface UnionLayout {
  readonly _: "union"
  readonly ast: SchemaAST.AST
  readonly variants: Array<VariantRow>
  readonly byTag: Map<number, VariantRow>
  readonly others: Array<UnionMember>
  readonly byKind: Map<number, Layout>
  // Canonical order used by fingerprint mode.
  readonly byPos: Array<UnionPosition>
}

function isSelfDelimiting(layout: Layout): boolean {
  return layout._ === "literal" ? isSelfDelimiting(layout.leaf) : layout._ === "int"
}

function packedSize(layout: Layout): number | undefined {
  switch (layout._) {
    case "literal":
      return packedSize(layout.leaf)
    case "bool":
      return 1
    case "int64":
      return 8
    default:
      return undefined
  }
}

function isInlineSlot(layout: Layout): boolean {
  return packedSize(layout) !== undefined || isSelfDelimiting(layout) ||
    layout._ === "null" || layout._ === "undefined"
}

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
      const getCodec = ast.annotations?.toCodec
      if (!Predicate.isFunction(getJson) && !Predicate.isFunction(getCodec)) {
        return ast
      }
      const typeParameters = ast.typeParameters.map((tp) => Schema.make<Schema.Constraint>(SchemaAST.toEncoded(tp)))
      const link = (Predicate.isFunction(getJson) ? getJson(typeParameters) : undefined) ??
        (Predicate.isFunction(getCodec) ? getCodec(typeParameters) : undefined)
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

function sentinelSetHash(sentinels: ReadonlyArray<SchemaAST.Sentinel>): number {
  const sorted = [...sentinels].sort((a, b) => {
    const an = typeof a.key === "number"
    const bn = typeof b.key === "number"
    if (an !== bn) return an ? -1 : 1
    if (an) return (a.key as number) - (b.key as number)
    return compareBytes(utf8Encode.encode(a.key as string), utf8Encode.encode(b.key as string))
  })
  const out: Array<number> = []
  for (const sentinel of sorted) {
    const keyBytes = utf8Encode.encode(String(sentinel.key))
    out.push(typeof sentinel.key === "number" ? 0 : 1)
    pushU32(out, keyBytes.length)
    pushBytes(out, keyBytes)
    const literal = sentinel.literal
    const valueBytes = utf8Encode.encode(sentinelLiteralString(literal))
    out.push(sentinelLiteralKind(literal))
    pushU32(out, valueBytes.length)
    pushBytes(out, valueBytes)
  }
  return fnv32(out)
}

function sentinelLiteralKind(literal: SchemaAST.LiteralValue | symbol): number {
  switch (typeof literal) {
    case "string":
      return 1
    case "number":
      return 2
    case "boolean":
      return 3
    case "bigint":
      return 4
    default:
      return 5
  }
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
  return Predicate.isFunction(ast.annotations?.toCodecJson)
}

// Detect integer checks nested inside filter groups.
function provesInteger(ast: SchemaAST.AST): boolean {
  const checks = ast.checks
  if (checks === undefined) return false
  const go = (check: SchemaAST.Check<never>): boolean => {
    const id = check.annotations?.representation?.id
    if (id === "effect/schema/isInt") return true
    return check._tag === "FilterGroup" && check.checks.some(go)
  }
  return checks.some(go)
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
      return "number"
    case "boolean":
      return "bool"
    default:
      return "bigint"
  }
}

// Classify union members without eagerly compiling recursive members.
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
      return K.number
    case "BigInt":
      return K.bigint
    case "Literal":
      switch (typeof ast.literal) {
        case "string":
          return K.string
        case "number":
          return K.number
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

interface CompiledLayout {
  readonly layout: Layout
  readonly recursive: boolean
  readonly exact: boolean
}

function compileLayout(root: SchemaAST.AST): CompiledLayout {
  const exact = isExact(root)
  root = SchemaAST.toEncoded(root)
  const memo = new Map<SchemaAST.AST, Layout>()
  let recursive = false

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
        return provesInteger(ast) ? { _: "int" } : { _: "number" }
      case "BigInt":
        return { _: "bigint" }
      case "Literal":
        return { _: "literal", leaf: { _: literalKind(ast.literal) }, values: [ast.literal] }
      case "Unknown":
      case "Any":
      case "ObjectKeyword":
        return { _: "json" }
      case "Never":
        return { _: "never", ast }
      case "Enum":
        return compileUnion(ast, flattenMembers(SchemaAST.enumsToLiterals(ast)))
      case "Suspend": {
        recursive = true
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
        idBytes: uvarintBytes(id),
        index: 0,
        optional: ps.type.context?.isOptional === true,
        annotations,
        layout: undefined as unknown as Layout,
        inline: false
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
    const layout: StructLayout = {
      _: "struct",
      ast,
      fields,
      byId: new Map(),
      extra,
      extraAll: extra.length === 1 && matchesEveryKey(extra[0].parameter) ? extra[0] : undefined,
      names: new Set(fields.map((f) => f.name)),
      optionalCount: 0
    }
    memo.set(ast, layout)
    for (let i = 0; i < fields.length; i++) {
      const field = fields[i]
      field.layout = compile(types[i])
      // Recursive placeholders already have the discriminant used here.
      field.inline = isInlineSlot(field.layout)
      if (field.optional) layout.optionalCount++
      layout.byId.set(field.id, field)
    }
    fields.sort((a, b) => a.id - b.id)
    for (let i = 0; i < fields.length; i++) fields[i].index = i
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
      minCount: requiredElements + tailLen,
      uniform: undefined,
      uniformInline: false,
      uniformPacked: undefined,
      uniformNumbers: false
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
    if (layout.elements.length === 0 && layout.rest.length === 1) {
      const slot = layout.rest[0]
      layout.uniform = slot
      layout.uniformPacked = packedSize(slot)
      layout.uniformNumbers = slot._ === "number"
      layout.uniformInline = isInlineSlot(slot)
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
        const cause: ReasonLayout = {
          _: "cause",
          error: undefined as unknown as Layout,
          defect: undefined as unknown as Layout
        }
        const layout = { _: "exit" as const, value: undefined as unknown as Layout, cause }
        memo.set(ast, layout)
        layout.value = compile(tps[0])
        cause.error = compile(tps[1])
        cause.defect = compile(tps[2])
        return layout
      }
      case "effect/schema/Cause":
      case "effect/schema/CauseReason": {
        const layout: ReasonLayout = {
          _: id === "effect/schema/Cause" ? "cause" : "causeReason",
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
    const literalValues = new Map<number, Array<SchemaAST.LiteralValue>>()
    const addLiteralRow = (kind: number, row: Layout) => {
      const existing = literalRows.get(kind)
      if (existing !== undefined && existing._ !== row._) {
        throw new Error("Binary layout: union members are not uniquely identifiable")
      }
      literalRows.set(kind, row)
    }
    for (const member of members) {
      if (member._tag === "Literal") {
        const kind = astKind(member)
        const values = literalValues.get(kind)
        if (values === undefined) {
          literalValues.set(kind, [member.literal])
        } else if (!values.includes(member.literal)) {
          values.push(member.literal)
        }
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
    for (const [kind, values] of literalValues) {
      addLiteralRow(kind, { _: "literal", leaf: { _: literalKind(values[0]) }, values })
    }
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
    const layout: UnionLayout = {
      _: "union",
      ast,
      variants: [],
      byTag: new Map(),
      others: [],
      byKind: new Map(),
      byPos: []
    }
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
          extra: struct.extra,
          extraAll: struct.extraAll,
          names: struct.names,
          optionalCount: fields.reduce((count, f) => f.optional ? count + 1 : count, 0)
        }
        tuple = false
      } else {
        payload = full
        tuple = true
      }
      const row: VariantRow = { tag, sentinels, tuple, payload, position: 0 }
      layout.variants.push(row)
      layout.byTag.set(tag, row)
    }
    for (const [kind, row] of literalRows) {
      layout.others.push({ kind, layout: row, position: 0 })
      layout.byKind.set(kind, row)
    }
    for (const { kind, member } of rowMembers) {
      const row = compile(member)
      layout.others.push({ kind, layout: row, position: 0 })
      layout.byKind.set(kind, row)
    }
    // Fingerprint positions are independent of declaration order.
    for (const row of [...layout.variants].sort((a, b) => a.tag - b.tag)) {
      row.position = layout.byPos.length
      layout.byPos.push({ variant: row, layout: row.payload })
    }
    for (const member of [...layout.others].sort((a, b) => a.kind - b.kind)) {
      member.position = layout.byPos.length
      layout.byPos.push({ variant: undefined, layout: member.layout })
    }
    // Probe specific runtime guards before `json`, which matches anything.
    layout.others.sort((a, b) => matchRank(a.layout) - matchRank(b.layout))
    return layout
  }

  const layout = compile(root)
  return { layout, recursive, exact }
}

// The parser may return the binary decoder's value directly only when that
// decoder proves every predicate and no Schema parser behavior can change it.
// Schemas whose decoded values the binary layer already produces and validates
// on its own, so the schema pass around it would only repeat work. Constructor
// defaults are ignored because they only run during construction.
function isExact(root: SchemaAST.AST): boolean {
  const exact = (ast: SchemaAST.AST): boolean => {
    if (
      ast.encoding !== undefined || ast.checks !== undefined ||
      (ast as { readonly encodingChecks?: SchemaAST.Checks }).encodingChecks !== undefined ||
      ast.annotations?.parseOptions !== undefined
    ) {
      return false
    }
    switch (ast._tag) {
      case "String":
      case "Symbol":
      case "Boolean":
      case "Null":
      case "Undefined":
      case "Void":
      case "Number":
      case "BigInt":
      case "Literal":
        return true
      case "Arrays":
        return ast.elements.every(exact) && ast.rest.every(exact)
      case "Objects":
        return ast.propertySignatures.every((property) => exact(property.type)) &&
          ast.indexSignatures.every((signature) =>
            signature.parameter._tag === "String" && exact(signature.parameter) && exact(signature.type)
          )
      case "Union":
        return ast.mode === "anyOf" && ast.types.every(exact)
      case "Declaration": {
        const id = representationId(ast)
        return id === "effect/schema/Uint8Array" || id === "effect/schema/Date"
      }
      default:
        return false
    }
  }
  return exact(root)
}

// Layouts sharing a wire kind can still require different fingerprints.
const F = {
  backEdge: 0,
  bool: 1,
  null: 2,
  undefined: 3,
  number: 4,
  int: 5,
  string: 6,
  symbol: 7,
  bytes: 8,
  bigint: 9,
  json: 10,
  duration: 11,
  bigDecimal: 12,
  dateTimeZoned: 13,
  date: 14,
  dateTimeUtc: 15,
  never: 16,
  struct: 17,
  array: 18,
  union: 19,
  option: 20,
  result: 21,
  exit: 22,
  cause: 23,
  causeReason: 24,
  literal: 25
} as const

// Hash the compiled layout graph, including cycle back-edge distances.
function layoutFingerprint(root: Layout): bigint {
  const cache = new Map<Layout, bigint>()
  const stack: Array<Layout> = []
  // Cache only subtrees that do not escape above their own root.
  let escape = Number.MAX_SAFE_INTEGER

  function go(layout: Layout): bigint {
    const at = stack.lastIndexOf(layout)
    if (at >= 0) {
      if (at < escape) escape = at
      const out: Array<number> = [F.backEdge]
      pushUvarint(out, stack.length - at)
      return fnv64(out)
    }
    const cached = cache.get(layout)
    if (cached !== undefined) return cached
    const self = stack.length
    const outerEscape = escape
    escape = Number.MAX_SAFE_INTEGER
    stack.push(layout)
    const hash = fnv64(structure(layout))
    stack.pop()
    const closed = escape >= self
    if (closed) cache.set(layout, hash)
    escape = closed ? outerEscape : Math.min(outerEscape, escape)
    return hash
  }

  function structure(layout: Layout): Array<number> {
    const out: Array<number> = []
    switch (layout._) {
      case "bool":
      case "null":
      case "undefined":
      case "number":
      case "int":
      case "string":
      case "symbol":
      case "bytes":
      case "bigint":
      case "json":
      case "duration":
      case "bigDecimal":
      case "dateTimeZoned":
        out.push(F[layout._])
        return out
      case "literal": {
        out.push(F.literal)
        pushBytes(out, structure(layout.leaf))
        pushUvarint(out, layout.values.length)
        for (const value of layout.values) {
          out.push(sentinelLiteralKind(value))
          const bytes = utf8Encode.encode(sentinelLiteralString(value))
          pushUvarint(out, bytes.length)
          pushBytes(out, bytes)
        }
        return out
      }
      case "int64":
        out.push(layout.flavor === "date" ? F.date : F.dateTimeUtc)
        return out
      case "never":
        out.push(F.never)
        return out
      case "struct": {
        out.push(F.struct)
        pushUvarint(out, layout.fields.length)
        for (const field of layout.fields) {
          pushU32(out, field.id)
          out.push(field.optional ? 1 : 0)
          pushU64(out, go(field.layout))
        }
        pushUvarint(out, layout.extra.length)
        for (const signature of layout.extra) pushU64(out, go(signature.layout))
        return out
      }
      case "array": {
        out.push(F.array)
        pushUvarint(out, layout.elements.length)
        for (const slot of layout.elements) {
          out.push(slot.optional ? 1 : 0)
          pushU64(out, go(slot.layout))
        }
        pushUvarint(out, layout.rest.length)
        for (const rest of layout.rest) pushU64(out, go(rest))
        return out
      }
      case "union": {
        out.push(F.union)
        pushUvarint(out, layout.byPos.length)
        for (const position of layout.byPos) {
          const variant = position.variant
          if (variant === undefined) out.push(0)
          else {
            out.push(1, variant.tuple ? 1 : 0)
            pushU32(out, variant.tag)
          }
          pushU64(out, go(position.layout))
        }
        return out
      }
      case "option":
        out.push(F.option)
        pushU64(out, go(layout.value))
        return out
      case "result":
        out.push(F.result)
        pushU64(out, go(layout.success))
        pushU64(out, go(layout.failure))
        return out
      case "exit":
        out.push(F.exit)
        pushU64(out, go(layout.value))
        pushU64(out, go(layout.cause.error))
        pushU64(out, go(layout.cause.defect))
        return out
      case "cause":
      case "causeReason":
        out.push(layout._ === "cause" ? F.cause : F.causeReason)
        pushU64(out, go(layout.error))
        pushU64(out, go(layout.defect))
        return out
    }
  }

  return go(root)
}

// A frame header the decoder can compare byte by byte, so frames that hold no
// wide numbers never build a DataView.
function fingerprintBytes(lo: number, hi: number): Uint8Array {
  const out = new Uint8Array(8)
  for (let i = 0; i < 4; i++) {
    out[i] = (lo >>> (i * 8)) & 0xFF
    out[i + 4] = (hi >>> (i * 8)) & 0xFF
  }
  return out
}

interface Mode {
  readonly positional: boolean
  readonly envelope: number
  readonly expectedEnvelope: string
  readonly fingerprintLo: number
  readonly fingerprintHi: number
  readonly fingerprint: Uint8Array
}

const defaultMode: Mode = {
  positional: false,
  envelope: ENVELOPE,
  expectedEnvelope: "version 1 envelope, flags 0",
  fingerprintLo: 0,
  fingerprintHi: 0,
  fingerprint: new Uint8Array(8)
}

function fingerprintMode(layout: Layout): Mode {
  const fingerprint = layoutFingerprint(layout)
  const lo = Number(fingerprint & BIGINT_U32_MASK)
  const hi = Number((fingerprint >> BIGINT_THIRTY_TWO) & BIGINT_U32_MASK)
  return {
    positional: true,
    envelope: ENVELOPE_FINGERPRINT,
    expectedEnvelope: "version 1 envelope, flags 1",
    fingerprintLo: lo,
    fingerprintHi: hi,
    fingerprint: fingerprintBytes(lo, hi)
  }
}

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
    case "literal":
      return hasLiteral(layout, value)
    case "bool":
      return typeof value === "boolean"
    case "null":
      return value === null
    case "undefined":
      return value === undefined
    case "number":
    case "int":
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

interface EncodeContext {
  readonly options: SchemaAST.ParseOptions
  readonly positional: boolean
  indexSignatures: IndexSignatureCache | undefined
  // Records of one shape repeat within a frame, so the last one is reused.
  extraShape: ExtraShape | undefined
}

function encodeFail(expected: string, input: unknown, options: SchemaAST.ParseOptions): never {
  throw issueError(new SchemaIssue.InvalidValue({ expected }, input, options))
}

function isCyclic(value: unknown, stack = new Set<object>()): boolean {
  if (!Predicate.isObjectOrArray(value)) return false
  const isArray = Array.isArray(value)
  const prototype = Object.getPrototypeOf(value)
  if (isArray || prototype === Object.prototype || prototype === null) {
    if (stack.has(value)) return true
    stack.add(value)
    try {
      if (isArray) {
        for (let i = 0; i < value.length; i++) {
          if (isCyclic(value[i], stack)) return true
        }
      } else {
        for (const key of Object.keys(value)) {
          if (isCyclic((value as Record<string, unknown>)[key], stack)) return true
        }
      }
    } finally {
      stack.delete(value)
    }
    return false
  }
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

function encodeSized(ctx: EncodeContext, layout: Layout, value: unknown, w: Writer) {
  const mark = w.beginSized()
  encodeValue(ctx, layout, value, w)
  w.endSized(mark)
}

function encodeSymbol(ctx: EncodeContext, value: unknown, w: Writer) {
  const key = globalThis.Symbol.keyFor(value as symbol)
  if (key === undefined) encodeFail("registered symbol", value, ctx.options)
  w.string(key)
}

function encodeReason(ctx: EncodeContext, layout: ReasonLayout, value: unknown, w: Writer) {
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

// `keyBytes` stays undefined while every key is ASCII, where code unit order
// and length already match raw UTF-8.
type ExtraPair = [key: string, signature: ExtraSignature, keyBytes: Uint8Array | undefined]

function isAscii(key: string): boolean {
  for (let i = 0; i < key.length; i++) {
    if (key.charCodeAt(i) > 0x7F) return false
  }
  return true
}

interface ExtraShape {
  readonly layout: StructLayout
  readonly keys: ReadonlyArray<string>
  readonly pairs: Array<ExtraPair>
}

function sameShape(shape: ExtraShape, layout: StructLayout, keys: ReadonlyArray<string>): boolean {
  if (shape.layout !== layout || shape.keys.length !== keys.length) return false
  for (let i = 0; i < keys.length; i++) {
    if (shape.keys[i] !== keys[i]) return false
  }
  return true
}

// Sort extra keys by raw UTF-8 for deterministic output.
function extraPairs(ctx: EncodeContext, layout: StructLayout, obj: Record<string, unknown>): Array<ExtraPair> {
  const keys = Object.keys(obj)
  const shape = ctx.extraShape
  if (shape !== undefined && sameShape(shape, layout, keys)) return shape.pairs
  const named = layout.names
  const every = layout.extraAll
  const pairs: Array<ExtraPair> = []
  let ascii = true
  for (const key of keys) {
    if (named.has(key)) continue
    const signature = every ?? (ctx.indexSignatures ??= new IndexSignatureCache(ctx.options)).find(layout, key)
    if (signature === undefined) continue
    if (ascii && !isAscii(key)) ascii = false
    pairs.push([key, signature, undefined])
  }
  if (ascii) {
    pairs.sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)
  } else {
    for (const pair of pairs) pair[2] = utf8Encode.encode(pair[0])
    pairs.sort((a, b) => compareBytes(a[2]!, b[2]!))
  }
  ctx.extraShape = { layout, keys, pairs }
  return pairs
}

function encodeExtraPairs(
  ctx: EncodeContext,
  pairs: Array<ExtraPair>,
  obj: Record<string, unknown>,
  w: Writer
) {
  for (const [key, signature, keyBytes] of pairs) {
    if (keyBytes === undefined) {
      w.uvarint(key.length)
      w.string(key)
    } else {
      w.uvarint(keyBytes.length)
      w.bytes(keyBytes)
    }
    issuePath[issuePathLen++] = key
    encodeSized(ctx, signature.layout, obj[key], w)
    issuePathLen--
  }
}

function encodeStructFields(ctx: EncodeContext, layout: StructLayout, value: object, w: Writer) {
  const obj = value as Record<string, unknown>
  if (layout.extra.length > 0) {
    const pairs = extraPairs(ctx, layout, obj)
    if (pairs.length > 0) {
      w.uvarint(0)
      const mark = w.beginSized()
      encodeExtraPairs(ctx, pairs, obj, w)
      w.endSized(mark)
    }
  }
  const fields = layout.fields
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i]
    const name = field.name
    if (!Object.hasOwn(obj, name)) {
      if (field.optional) continue
      issuePath[issuePathLen++] = name
      throw issueError(new SchemaIssue.MissingKey(field.annotations))
    }
    const mark = w.idAndMark(field.idBytes)
    issuePath[issuePathLen++] = name
    encodeValue(ctx, field.layout, obj[name], w)
    w.endSized(mark)
    issuePathLen--
  }
}

// Fingerprint structs use a presence bitmap followed by positional fields.
function encodeStructPositional(ctx: EncodeContext, layout: StructLayout, value: object, w: Writer) {
  const obj = value as Record<string, unknown>
  const bitmapBytes = (layout.optionalCount + 7) >> 3
  let bitmap = 0
  if (bitmapBytes > 0) {
    bitmap = w.len
    for (let i = 0; i < bitmapBytes; i++) w.byte(0)
  }
  const fields = layout.fields
  let optionalIndex = 0
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i]
    const name = field.name
    const present = Object.hasOwn(obj, name)
    if (field.optional) {
      // Resolve the bitmap address again after any arena growth.
      if (present) w.buf[w.start + bitmap + (optionalIndex >> 3)] |= 1 << (optionalIndex & 7)
      optionalIndex++
      if (!present) continue
    } else if (!present) {
      issuePath[issuePathLen++] = name
      throw issueError(new SchemaIssue.MissingKey(field.annotations))
    }
    issuePath[issuePathLen++] = name
    if (field.inline) encodeValue(ctx, field.layout, obj[name], w)
    else encodeSized(ctx, field.layout, obj[name], w)
    issuePathLen--
  }
  if (layout.extra.length > 0) {
    const pairs = extraPairs(ctx, layout, obj)
    w.uvarint(pairs.length)
    encodeExtraPairs(ctx, pairs, obj, w)
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
  const count = arr.length
  if (layout.rest.length === 0 && count > layout.elements.length) {
    issuePath[issuePathLen++] = layout.elements.length
    throw issueError(
      new SchemaIssue.UnexpectedKey(layout.ast, arr[layout.elements.length], ctx.options)
    )
  }
  if (count < layout.minCount) {
    issuePath[issuePathLen++] = count
    throw issueError(new SchemaIssue.MissingKey(undefined))
  }
  if (layout.hasCount) w.uvarint(count)
  const uniform = layout.uniform
  if (uniform !== undefined) {
    if (layout.uniformNumbers) {
      encodeNumberRun(arr, count, w)
      return
    }
    const inline = layout.uniformInline
    for (let i = 0; i < count; i++) {
      issuePath[issuePathLen++] = i
      if (inline) encodeValue(ctx, uniform, arr[i], w)
      else encodeSized(ctx, uniform, arr[i], w)
      issuePathLen--
    }
    return
  }
  for (let i = 0; i < count; i++) {
    const slot = arraySlot(layout, i, count)
    issuePath[issuePathLen++] = i
    if (isInlineSlot(slot)) {
      encodeValue(ctx, slot, arr[i], w)
    } else {
      encodeSized(ctx, slot, arr[i], w)
    }
    issuePathLen--
  }
}

// Uniform number arrays share one varint-or-f64 mode byte.
function encodeNumberRun(arr: ReadonlyArray<unknown>, count: number, w: Writer) {
  let varint = true
  for (let i = 0; i < count; i++) {
    if (!isVarintNumber(arr[i])) {
      varint = false
      break
    }
  }
  if (varint) {
    w.byte(NUMBER_RUN_VARINT)
    for (let i = 0; i < count; i++) w.numberVarint(arr[i] as number)
  } else {
    w.byte(NUMBER_RUN_F64)
    for (let i = 0; i < count; i++) w.f64(arr[i] as number)
  }
}

function matchesVariant(variant: VariantRow, value: unknown): boolean {
  return variant.tuple
    ? Array.isArray(value) && variant.sentinels.every((s) => value[s.key as number] === s.literal)
    : Predicate.isObject(value) && !Array.isArray(value) &&
      variant.sentinels.every((s) => (value as Record<PropertyKey, unknown>)[s.key] === s.literal)
}

function encodeUnion(ctx: EncodeContext, layout: UnionLayout, value: unknown, w: Writer) {
  for (const variant of layout.variants) {
    if (matchesVariant(variant, value)) {
      if (ctx.positional) {
        w.uvarint(variant.position)
      } else {
        w.byte(K.variant)
        w.u32le(variant.tag)
      }
      encodeValue(ctx, variant.payload, value, w)
      return
    }
  }
  for (const member of layout.others) {
    if (matchesLayout(member.layout, value)) {
      if (ctx.positional) w.uvarint(member.position)
      else w.byte(member.kind)
      encodeValue(ctx, member.layout, value, w)
      return
    }
  }
  throw issueError(new SchemaIssue.InvalidType(layout.ast, value, ctx.options))
}

function encodeValue(ctx: EncodeContext, layout: Layout, value: unknown, w: Writer): void {
  switch (layout._) {
    case "literal":
      if (!hasLiteral(layout, value)) encodeFail(literalExpected(layout), value, ctx.options)
      encodeValue(ctx, layout.leaf, value, w)
      return
    case "bool":
      w.byte(value === true ? 1 : 0)
      return
    case "null":
    case "undefined":
      return
    case "number":
      if (isVarintNumber(value)) w.numberVarint(value as number)
      else w.f64(value as number)
      return
    case "int": {
      // `disableChecks` can bypass the integer check used to select this layout.
      if (!Number.isSafeInteger(value)) encodeFail("an integer", value, ctx.options)
      w.numberVarint(value as number)
      return
    }
    case "string":
      w.string(value as string)
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
        w.string(zoned.zone.id)
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
      w.string(text)
      return
    }
    case "option": {
      const option = value as Option.Option<unknown>
      if (option._tag === "None") {
        w.byte(0)
      } else {
        w.byte(1)
        encodeValue(ctx, layout.value, option.value, w)
      }
      return
    }
    case "result": {
      const result = value as Result.Result<unknown, unknown>
      if (result._tag === "Success") {
        w.byte(0)
        encodeValue(ctx, layout.success, result.success, w)
      } else {
        w.byte(1)
        encodeValue(ctx, layout.failure, result.failure, w)
      }
      return
    }
    case "exit": {
      const exit = value as Exit.Exit<unknown, unknown>
      if (exit._tag === "Success") {
        w.byte(0)
        encodeValue(ctx, layout.value, exit.value, w)
      } else {
        w.byte(1)
        encodeValue(ctx, layout.cause, exit.cause, w)
      }
      return
    }
    case "cause": {
      const reasons = (value as Cause.Cause<unknown>).reasons
      w.uvarint(reasons.length)
      for (const reason of reasons) {
        const mark = w.beginSized()
        encodeReason(ctx, layout, reason, w)
        w.endSized(mark)
      }
      return
    }
    case "causeReason": {
      encodeReason(ctx, layout, value, w)
      return
    }
    case "struct": {
      if (ctx.positional) encodeStructPositional(ctx, layout, value as object, w)
      else encodeStructFields(ctx, layout, value as object, w)
      return
    }
    case "array": {
      encodeArray(ctx, layout, value, w)
      return
    }
    case "union":
      encodeUnion(ctx, layout, value, w)
      return
    case "never":
      throw issueError(new SchemaIssue.InvalidType(layout.ast, value, ctx.options))
  }
}

// Reuse one top-level writer while allowing nested codecs to allocate their own.
let pooledWriter: Writer | undefined = new Writer()

function encodeFrame(
  layout: Layout,
  value: unknown,
  options: SchemaAST.ParseOptions,
  mode: Mode
): Uint8Array<ArrayBuffer> {
  const ctx: EncodeContext = {
    options,
    positional: mode.positional,
    indexSignatures: undefined,
    extraShape: undefined
  }
  const w = pooledWriter ?? new Writer()
  const pooled = w === pooledWriter
  if (pooled) pooledWriter = undefined
  w.reset()
  const savedPathLen = issuePathLen
  issuePathLen = 0
  try {
    const mark = w.beginSized()
    w.byte(mode.envelope)
    if (mode.positional) {
      w.u32le(mode.fingerprintLo)
      w.u32le(mode.fingerprintHi)
    }
    encodeValue(ctx, layout, value, w)
    w.endSized(mark)
    return w.out()
  } finally {
    w.abort()
    issuePathLen = savedPathLen
    if (pooled) pooledWriter = w
  }
}

// Unknown union members resolve to this sentinel.
const ABSENT = globalThis.Symbol.for("~effect/encoding/SchemaBinary/absent")

function decodeChecked(layout: Layout, r: Reader): unknown {
  const value = decodeValue(layout, r)
  if (value !== ABSENT && r.pos !== r.end) invalid("no leftover bytes", undefined, r.options)
  return value
}

function decodeSized(layout: Layout, r: Reader): unknown {
  const saved = r.enter(r.uvarint())
  const value = decodeChecked(layout, r)
  r.exit(saved)
  return value
}

function decodeInline(layout: Layout, r: Reader): unknown {
  if (isSelfDelimiting(layout)) return decodeValue(layout, r)
  const saved = r.enter(packedSize(layout) ?? 0)
  const value = decodeChecked(layout, r)
  r.exit(saved)
  return value
}

function decodeSlot(layout: Layout, r: Reader): unknown {
  if (isSelfDelimiting(layout)) return decodeValue(layout, r)
  const size = packedSize(layout)
  const saved = r.enter(
    size !== undefined ? size : layout._ === "null" || layout._ === "undefined" ? 0 : r.uvarint()
  )
  const value = decodeChecked(layout, r)
  r.exit(saved)
  return value
}

function decodeExtraPair(layout: StructLayout, r: Reader, out: Record<string, unknown>, seen: Set<string>) {
  const key = r.readUtf8(r.uvarint())
  if (seen.has(key)) invalid("unique extra keys", undefined, r.options)
  seen.add(key)
  const saved = r.enter(r.uvarint())
  const signature = layout.extraAll ??
    (r.indexSignatures ??= new IndexSignatureCache(r.options)).find(layout, key)
  if (signature !== undefined) {
    issuePath[issuePathLen++] = key
    const value = decodeChecked(signature.layout, r)
    issuePathLen--
    if (value !== ABSENT) InternalRecord.assignProperty(out, key, value)
  }
  r.exit(saved)
}

function missingKeyIssue(field: Field): SchemaIssue.Issue {
  return new SchemaIssue.Pointer([field.name], new SchemaIssue.MissingKey(field.annotations))
}

function throwMissingKeys(layout: StructLayout, issues: Array<SchemaIssue.Issue>): never {
  throw issueError(
    new SchemaIssue.Composite(layout.ast, issues as [SchemaIssue.Issue, ...Array<SchemaIssue.Issue>])
  )
}

function decodeStruct(layout: StructLayout, r: Reader): unknown {
  const out: Record<string, unknown> = {}
  // Use bitmasks for common structs and allocate sets only when needed.
  let seenMask = 0
  let presentMask = 0
  let seenWide: Set<number> | undefined
  let presentWide: Set<number> | undefined
  let seenUnknown: Set<number> | undefined
  let seenExtra = false
  // Fast-path fields in encoder order and fall back to the id map.
  const fields = layout.fields
  let cursor = 0
  while (r.pos < r.end) {
    const id = r.uvarint()
    const len = r.uvarint()
    const saved = r.enter(len)
    if (id === 0) {
      if (seenExtra) invalid("unique field ids", undefined, r.options)
      seenExtra = true
      decodeExtraPairs(layout, r, out)
      r.exit(saved)
      continue
    }
    let field: Field | undefined
    if (cursor < fields.length && fields[cursor].id === id) {
      field = fields[cursor]
      cursor++
    } else {
      field = layout.byId.get(id)
      if (field !== undefined) cursor = field.index + 1
    }
    if (field === undefined) {
      if (seenUnknown === undefined) seenUnknown = new Set()
      else if (seenUnknown.has(id)) invalid("unique field ids", undefined, r.options)
      seenUnknown.add(id)
      r.exit(saved)
      continue
    }
    const index = field.index
    if (index < 32) {
      const bit = 1 << index
      if ((seenMask & bit) !== 0) invalid("unique field ids", undefined, r.options)
      seenMask |= bit
    } else if (seenWide === undefined) {
      seenWide = new Set([index])
    } else {
      if (seenWide.has(index)) invalid("unique field ids", undefined, r.options)
      seenWide.add(index)
    }
    issuePath[issuePathLen++] = field.name
    const value = decodeChecked(field.layout, r)
    issuePathLen--
    if (value !== ABSENT) {
      InternalRecord.assignProperty(out, field.name, value)
      if (index < 32) presentMask |= 1 << index
      else (presentWide ??= new Set()).add(index)
    }
    r.exit(saved)
  }
  let issues: Array<SchemaIssue.Issue> | undefined
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i]
    const index = field.index
    const present = index < 32 ? (presentMask & (1 << index)) !== 0 : presentWide?.has(index) === true
    if (!field.optional && !present) {
      ;(issues ??= []).push(missingKeyIssue(field))
      if (r.options.errors !== "all") break
    }
  }
  if (issues !== undefined) throwMissingKeys(layout, issues)
  return out
}

function decodeStructPositional(layout: StructLayout, r: Reader): unknown {
  const out: Record<string, unknown> = {}
  const bitmapBytes = (layout.optionalCount + 7) >> 3
  let bitmap = 0
  if (bitmapBytes > 0) {
    if (r.pos + bitmapBytes > r.end) invalid("complete value", undefined, r.options)
    bitmap = r.pos
    r.pos += bitmapBytes
  }
  const buf = r.buf
  const fields = layout.fields
  let optionalIndex = 0
  let issues: Array<SchemaIssue.Issue> | undefined
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i]
    if (field.optional) {
      const present = (buf[bitmap + (optionalIndex >> 3)] & (1 << (optionalIndex & 7))) !== 0
      optionalIndex++
      if (!present) continue
    }
    issuePath[issuePathLen++] = field.name
    const value = field.inline ? decodeInline(field.layout, r) : decodeSized(field.layout, r)
    issuePathLen--
    if (value !== ABSENT) InternalRecord.assignProperty(out, field.name, value)
    else if (!field.optional) {
      ;(issues ??= []).push(missingKeyIssue(field))
      if (r.options.errors !== "all") break
    }
  }
  if (issues !== undefined) throwMissingKeys(layout, issues)
  if (layout.extra.length > 0) {
    const count = r.uvarint()
    if (count > r.remaining) invalid("complete value", undefined, r.options)
    if (count > 0) {
      const seen = new Set<string>()
      for (let i = 0; i < count; i++) decodeExtraPair(layout, r, out, seen)
    }
  }
  return out
}

function decodeExtraPairs(layout: StructLayout, r: Reader, out: Record<string, unknown>) {
  const seen = new Set<string>()
  while (r.pos < r.end) decodeExtraPair(layout, r, out, seen)
}

function decodeArray(layout: ArrayLayout, r: Reader): unknown {
  const elementLen = layout.elements.length
  const count = layout.hasCount ? r.uvarint() : elementLen
  // Cap allocation amplification from zero-width slots.
  if (layout.hasCount && count > r.remaining + 1_048_576) {
    invalid("array count within allocation limit", count, r.options)
  }
  if (layout.rest.length === 0 && count > elementLen) {
    issuePath[issuePathLen++] = elementLen
    throw issueError(new SchemaIssue.UnexpectedKey(layout.ast, undefined, r.options))
  }
  if (count < layout.minCount) {
    issuePath[issuePathLen++] = count
    throw issueError(new SchemaIssue.MissingKey(undefined))
  }
  const out: Array<unknown> = new Array(count)
  const uniform = layout.uniform
  if (uniform !== undefined) {
    if (layout.uniformNumbers) return decodeNumberRun(out, count, r)
    if (isSelfDelimiting(uniform)) {
      for (let i = 0; i < count; i++) {
        issuePath[issuePathLen++] = i
        out[i] = decodeValue(uniform, r)
        issuePathLen--
      }
      return out
    }
    const packed = layout.uniformPacked
    const inline = layout.uniformInline
    for (let i = 0; i < count; i++) {
      issuePath[issuePathLen++] = i
      const saved = r.enter(inline ? packed ?? 0 : r.uvarint())
      const value = decodeChecked(uniform, r)
      r.exit(saved)
      if (value === ABSENT) throw issueError(new SchemaIssue.MissingKey(undefined))
      issuePathLen--
      out[i] = value
    }
    return out
  }
  for (let i = 0; i < count; i++) {
    const slot = arraySlot(layout, i, count)
    const optional = i < elementLen && layout.elements[i].optional
    if (!layout.hasCount && r.remaining === 0 && !optional && slot._ !== "null" && slot._ !== "undefined") {
      issuePath[issuePathLen++] = i
      throw issueError(new SchemaIssue.MissingKey(undefined))
    }
    issuePath[issuePathLen++] = i
    const value = decodeSlot(slot, r)
    if (value === ABSENT) {
      if (optional) invalid("known union member", undefined, r.options)
      throw issueError(new SchemaIssue.MissingKey(undefined))
    }
    issuePathLen--
    out[i] = value
  }
  if (!layout.hasCount && r.pos < r.end) {
    issuePath[issuePathLen++] = elementLen
    throw issueError(new SchemaIssue.UnexpectedKey(layout.ast, undefined, r.options))
  }
  return out
}

function decodeNumberRun(out: Array<unknown>, count: number, r: Reader): Array<unknown> {
  const mode = r.byte()
  if (mode === NUMBER_RUN_F64) {
    if (r.remaining !== count * 8) invalid("f64", undefined, r.options)
    for (let i = 0; i < count; i++) out[i] = r.f64()
    return out
  }
  if (mode !== NUMBER_RUN_VARINT) invalid("f64", undefined, r.options)
  for (let i = 0; i < count; i++) {
    issuePath[issuePathLen++] = i
    out[i] = r.numberVarint()
    issuePathLen--
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
        InternalRecord.assignProperty(payload as object, sentinel.key, sentinel.literal)
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

// Fingerprint mode rejects selectors outside its canonical member table.
function decodeUnionPositional(layout: UnionLayout, r: Reader): unknown {
  const position = layout.byPos[r.uvarint()]
  if (position === undefined) invalid("known union member", undefined, r.options)
  const payload = decodeChecked(position.layout, r)
  const variant = position.variant
  if (variant !== undefined && !variant.tuple && payload !== ABSENT) {
    for (const sentinel of variant.sentinels) {
      InternalRecord.assignProperty(payload as object, sentinel.key, sentinel.literal)
    }
  }
  return payload
}

function decodeReason(layout: ReasonLayout, r: Reader): unknown {
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
      r.take(r.remaining)
      return ABSENT
  }
}

function requirePresent(value: unknown): unknown {
  if (value === ABSENT) throw issueError(new SchemaIssue.MissingKey(undefined))
  return value
}

function decodeValue(layout: Layout, r: Reader): unknown {
  switch (layout._) {
    case "literal": {
      const value = decodeValue(layout.leaf, r)
      if (!hasLiteral(layout, value)) invalid(literalExpected(layout), value, r.options)
      return value
    }
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
    case "number": {
      const len = r.remaining
      if (len === 8) return r.f64()
      if (len === 0 || len > NUMBER_VARINT_MAX_BYTES) invalid("f64", undefined, r.options)
      return r.numberVarint()
    }
    case "int":
      return r.numberVarint()
    case "string":
      return r.readUtf8(r.end - r.pos)
    case "symbol":
      return globalThis.Symbol.for(r.readUtf8(r.end - r.pos))
    case "bytes":
      return r.take(r.remaining).slice()
    case "bigint":
      return r.zigzag()
    case "int64": {
      if (r.remaining !== 8) invalid("int64", undefined, r.options)
      const millis = Number(r.i64())
      if (layout.flavor !== "date") return DateTime.makeUnsafe(millis)
      const date = new Date(millis)
      if (Number.isNaN(date.getTime())) invalid("a valid Date", millis, r.options)
      return date
    }
    case "dateTimeZoned": {
      const millis = Number(r.i64())
      const tag = r.byte()
      let timeZone: number | string
      if (tag === 0) {
        if (r.remaining !== 4) invalid("time zone", undefined, r.options)
        timeZone = r.i32le()
      } else if (tag === 1) {
        timeZone = r.readUtf8(r.end - r.pos)
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
      const text = r.readUtf8(r.end - r.pos)
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
      const cause = decodeValue(layout.cause, r)
      return Exit.failCause(cause as Cause.Cause<unknown>)
    }
    case "cause": {
      const count = r.uvarint()
      const reasons: Array<Cause.Reason<unknown>> = []
      for (let i = 0; i < count; i++) {
        issuePath[issuePathLen++] = i
        const saved = r.enter(r.uvarint())
        const reason = decodeReason(layout, r)
        r.exit(saved)
        issuePathLen--
        if (reason !== ABSENT) reasons.push(reason as Cause.Reason<unknown>)
      }
      if (r.pos !== r.end) invalid("no leftover bytes", undefined, r.options)
      return Cause.fromReasons(reasons)
    }
    case "causeReason":
      return decodeReason(layout, r)
    case "struct":
      return r.positional ? decodeStructPositional(layout, r) : decodeStruct(layout, r)
    case "array":
      return decodeArray(layout, r)
    case "union":
      return r.positional ? decodeUnionPositional(layout, r) : decodeUnion(layout, r)
    case "never":
      throw issueError(new SchemaIssue.InvalidType(layout.ast, undefined, r.options))
  }
}

function decodeFrameBody(layout: Layout, r: Reader, mode: Mode): unknown {
  const envelope = r.byte()
  if (envelope !== mode.envelope) invalid(mode.expectedEnvelope, envelope, r.options)
  if (mode.positional) {
    if (r.remaining < 8) invalid("complete value", undefined, r.options)
    const buf = r.buf
    const expected = mode.fingerprint
    const pos = r.pos
    for (let i = 0; i < 8; i++) {
      if (buf[pos + i] !== expected[i]) invalid("matching layout fingerprint", undefined, r.options)
    }
    r.pos = pos + 8
  }
  const value = decodeChecked(layout, r)
  if (value === ABSENT) throw issueError(new SchemaIssue.MissingKey(undefined))
  return value
}

// Reuse one top-level reader while allowing nested codecs to allocate their own.
let pooledReader: Reader | undefined = new Reader()

function decodeOneShot(
  layout: Layout,
  bytes: Uint8Array,
  options: SchemaAST.ParseOptions,
  mode: Mode
): unknown {
  const r = pooledReader ?? new Reader()
  const pooled = r === pooledReader
  if (pooled) pooledReader = undefined
  r.reset(bytes, 0, bytes.length, options, undefined, mode.positional)
  const savedPathLen = issuePathLen
  issuePathLen = 0
  try {
    const n = r.uvarint()
    if (n === 0) invalid("nonzero frame length", undefined, options)
    const saved = r.enter(n)
    const value = decodeFrameBody(layout, r, mode)
    r.exit(saved)
    if (r.pos !== bytes.length) invalid("no leftover bytes", undefined, options)
    return value
  } finally {
    issuePathLen = savedPathLen
    r.release()
    if (pooled) pooledReader = r
  }
}

function makeTransformation(
  layout: Layout,
  mode: Mode,
  trusted: WeakSet<object> | undefined
): SchemaTransformation.Transformation<unknown, Uint8Array<ArrayBuffer>> {
  return SchemaTransformation.transformOrFail({
    decode: (bytes: Uint8Array<ArrayBuffer>, options) => {
      try {
        const value = decodeOneShot(layout, bytes, options, mode)
        if (trusted !== undefined && Predicate.isObjectOrArray(value)) trusted.add(value)
        return Effect.succeed(value)
      } catch (e) {
        return e instanceof IssueError ? Effect.fail(e.issue) : Effect.die(e)
      }
    },
    encode: (value: unknown, options) => {
      try {
        return Effect.succeed(encodeFrame(layout, value, options, mode))
      } catch (e) {
        return e instanceof IssueError ? Effect.fail(e.issue) : Effect.die(e)
      }
    }
  })
}

const fingerprintModeCache = new WeakMap<Layout, Mode>()

function compileMode(layout: Layout, fingerprint: boolean | undefined): Mode {
  if (fingerprint !== true) return defaultMode
  let mode = fingerprintModeCache.get(layout)
  if (mode === undefined) {
    mode = fingerprintMode(layout)
    fingerprintModeCache.set(layout, mode)
  }
  return mode
}

interface CompiledTarget {
  readonly target: Schema.Constraint
  readonly layout: Layout
  readonly exact: boolean
}

const compileTargetCache = new WeakMap<SchemaAST.AST, CompiledTarget>()

function compileTarget(
  schema: Schema.Constraint
): CompiledTarget {
  const cached = compileTargetCache.get(schema.ast)
  if (cached !== undefined) return cached
  const raw = Schema.make<Schema.Constraint>(toBinaryAST(schema.ast))
  const { exact, layout, recursive } = compileLayout(raw.ast)
  // Only recursive schemas need the cycle walk.
  const compiled = { target: recursive ? withCycleGuard(raw) : raw, layout, exact }
  compileTargetCache.set(schema.ast, compiled)
  return compiled
}

// The binary layer already validates an exact schema, so the schema pass around
// it repeats that work. Values it just decoded pass straight through, while
// every other input, `Schema.is` included, still runs the real check.
function withTrustedDecode(target: Schema.Constraint, trusted: WeakSet<object>): Schema.Constraint {
  const type = Schema.make(SchemaAST.toType(target.ast))
  const decodeType = SchemaParser.decodeUnknownEffect(type as Schema.ConstraintDecoder<unknown>)
  return Schema.declareConstructor<unknown>()(
    [type],
    () => (input, _ast, options) =>
      Predicate.isObjectOrArray(input) && trusted.delete(input)
        ? Effect.succeed(input)
        : decodeType(input, options),
    { identifier: "binary value" }
  )
}

// Skip the cycle walk once for structurally decoded values.
function withCycleGuard(target: Schema.Constraint): Schema.Constraint {
  const type = Schema.make(SchemaAST.toType(target.ast))
  const decoded = new WeakSet<object>()
  const guard = Schema.declareConstructor<unknown>()(
    [type],
    ([type]) => (input, ast, options) => {
      if (Predicate.isObjectOrArray(input) && decoded.delete(input)) {
        return Effect.succeed(input)
      }
      return isCyclic(input)
        ? Effect.fail(new SchemaIssue.InvalidType(ast, input, options))
        : SchemaParser.decodeUnknownEffect(type)(input, options)
    },
    { identifier: "acyclic value" }
  )
  return Schema.decodeTo(
    guard,
    SchemaTransformation.transform({
      decode: (value) => {
        if (Predicate.isObjectOrArray(value)) decoded.add(value)
        return value
      },
      encode: (value) => value
    })
  )(target)
}

/**
 * Selects the wire mode.
 *
 * The default mode supports compatible schema evolution. `fingerprint: true`
 * uses positional layouts and an 8-byte layout hash for smaller frames, but
 * requires peers to use the same schema definition.
 *
 * @category models
 * @since 4.0.0
 */
export interface Options {
  /**
   * @since 4.0.0
   */
  readonly fingerprint?: boolean | undefined
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
 * The wire layout is compiled from the encoded side of the schema. Each
 * encode/decode handles exactly one frame; use {@link parser} for streams.
 *
 * Encoded results are arena-backed views and may share a larger buffer. Use
 * `bytes.slice()` when independent ownership is required.
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
export function toCodec<S extends Schema.Constraint>(schema: S, options?: Options): toCodec<S> {
  const { exact, layout, target } = compileTarget(schema)
  const mode = compileMode(layout, options?.fingerprint)
  const trusted = exact ? new WeakSet<object>() : undefined
  return (Schema.Uint8Array as Schema.instanceOf<Uint8Array<ArrayBuffer>>).pipe(
    Schema.decodeTo(
      trusted === undefined ? target : withTrustedDecode(target, trusted),
      makeTransformation(layout, mode, trusted)
    )
  ) as unknown as toCodec<S>
}

/**
 * Encodes one frame without the schema pass {@link toCodec} wraps around it.
 *
 * Only schemas the binary layer already validates on its own take the direct
 * path; anything else falls back to the codec, so checks and transformations
 * still run.
 *
 * @internal
 */
export function encodeUnknownSync<S extends Schema.Constraint>(
  schema: S,
  options?: SchemaAST.ParseOptions & Options
): (value: unknown) => Uint8Array<ArrayBuffer> {
  const { exact, layout } = compileTarget(schema)
  if (!exact) {
    return Schema.encodeUnknownSync(
      toCodec(schema, options) as unknown as Schema.ConstraintEncoder<unknown, never>,
      options
    ) as (value: unknown) => Uint8Array<ArrayBuffer>
  }
  const mode = compileMode(layout, options?.fingerprint)

  const parseOptions: SchemaAST.ParseOptions = options ?? EMPTY_PARSE_OPTIONS
  return (value) => {
    try {
      return encodeFrame(layout, value, parseOptions, mode)
    } catch (e) {
      throw e instanceof IssueError ? new Schema.SchemaError(e.issue) : e
    }
  }
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
 * Values completed before a failure remain observable. After a failure, the
 * parser rejects further calls. Use `maxFrameSize` to limit buffered frames.
 *
 * @category constructors
 * @since 4.0.0
 */
export function parser<S extends Schema.Constraint>(
  schema: S,
  options?: SchemaAST.ParseOptions & Options & { readonly maxFrameSize?: number | undefined }
): Parser<S["Type"]> {
  const { exact, layout, target } = compileTarget(schema)
  const mode = compileMode(layout, options?.fingerprint)
  const parseOptions: SchemaAST.ParseOptions = options ?? {}
  const maxFrameSize = options?.maxFrameSize
  const decodeEncoded = exact
    ? undefined
    : Schema.decodeUnknownSync(target as Schema.ConstraintDecoder<unknown>, parseOptions)
  let buffer = new Uint8Array(0)
  let bufferStart = 0
  let bufferEnd = 0
  let stashed: Schema.SchemaError | undefined
  let spent = false
  const body = new Reader()
  const indexSignatures = new IndexSignatureCache(parseOptions, PARSER_INDEX_SIGNATURE_CACHE_SIZE)

  const release = () => {
    body.release()
    indexSignatures.clear()
    buffer = EMPTY_READER_BUFFER
    bufferStart = bufferEnd = 0
  }

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
        release()
        if (out.length === 0) throw error
        stashed = error
        return out
      }
      while (true) {
        // Use bigint only for frame lengths wider than six varint groups.
        let frameLen = 0
        let headerLen = -1
        const buffered = bufferEnd - bufferStart
        let scale = 1
        for (let i = 0; i < Math.min(6, buffered); i++) {
          const b = buffer[bufferStart + i]
          frameLen += (b & 0x7F) * scale
          if ((b & 0x80) === 0) {
            headerLen = i + 1
            break
          }
          scale *= 128
        }
        if (headerLen === -1) {
          if (buffered < 6) return out
          let n = BigInt(frameLen)
          for (let i = 6; i < Math.min(10, buffered); i++) {
            const b = buffer[bufferStart + i]
            n |= BigInt(b & 0x7F) << BigInt(i * 7)
            if ((b & 0x80) === 0) {
              headerLen = i + 1
              if (n > MAX_SAFE_BIGINT) return fail("safe integer length", n)
              frameLen = Number(n)
              break
            }
          }
          if (headerLen === -1) {
            if (buffered >= 10) return fail("uvarint", buffer.subarray(bufferStart, bufferStart + 10))
            return out
          }
        }
        if (frameLen === 0) return fail("nonzero frame length", frameLen)
        if (maxFrameSize !== undefined && frameLen > maxFrameSize) {
          return fail("frame within maxFrameSize", frameLen)
        }
        if (headerLen + frameLen > buffered) return out
        const savedPathLen = issuePathLen
        try {
          issuePathLen = 0
          const bodyStart = bufferStart + headerLen
          indexSignatures.beginFrame()
          body.reset(buffer, bodyStart, bodyStart + frameLen, parseOptions, indexSignatures, mode.positional)
          const value = decodeFrameBody(layout, body, mode)
          out.push((decodeEncoded === undefined ? value : decodeEncoded(value)) as S["Type"])
        } catch (e) {
          spent = true
          release()
          const error = e instanceof IssueError
            ? new Schema.SchemaError(e.issue)
            : Schema.isSchemaError(e)
            ? e
            : (() => {
              throw e
            })()
          if (out.length === 0) throw error
          stashed = error
          return out
        } finally {
          issuePathLen = savedPathLen
        }
        bufferStart += headerLen + frameLen
        if (bufferStart === bufferEnd) bufferStart = bufferEnd = 0
      }
    },
    endSync() {
      if (stashed !== undefined) return takeStashed()
      if (spent) return failSync("parser is spent")
      spent = true
      const input = bufferStart < bufferEnd ? buffer.subarray(bufferStart, bufferEnd) : undefined
      release()
      if (input !== undefined) return failSync("complete value", input)
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
 * Use this to preserve the wire id across a rename or resolve a hash collision.
 * Valid ids are integers from 1 through 4294967295.
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
