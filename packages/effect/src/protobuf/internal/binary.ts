// Prepares resolved descriptors for shared wire operations. Decoding builds JavaScript
// objects and merges subsequent occurrences into the existing value. Defaults
// are installed only when a message is created, and unknown fields when an
// occurrence ends. A final walk checks required fields, but only when a
// message with required fields was created.
// Descriptor preparation selects field operations and wire tags once. Each
// call owns its message state, independently of the wire reader.

import * as Bytes from "../../Bytes.ts"
import * as InternalRecord from "../../internal/record.ts"
import * as Result from "../../Result.ts"
import type * as D from "../ProtobufDescriptor.ts"
import type * as ProtobufMessage from "../ProtobufMessage.ts"
import * as ProtobufReader from "../ProtobufReader.ts"
import * as ProtobufWriter from "../ProtobufWriter.ts"
import { WireType } from "./wireType.ts"

const unknownFields: unique symbol = Symbol.for("effect/protobuf/ProtobufMessage/unknownFields")

/** @internal */
export type DecodeOptions = Parameters<typeof ProtobufMessage.decode>[1]

/** @internal */
export type EncodeOptions = Parameters<typeof ProtobufMessage.encode>[1]

interface Message {
  [name: string]: any
  [unknownFields]?: Uint8Array
}
type Reader = ProtobufReader.ProtobufReader
type Writer = ProtobufWriter.ProtobufWriter

const DEFAULT_MAX_DEPTH = 100

const depthLimit = (value: number | undefined): number => {
  const depth = value ?? DEFAULT_MAX_DEPTH
  if (!Number.isInteger(depth) || depth < 0) fail("Expected maxDepth to be a non-negative integer")
  return depth
}

/**
 * A message failure and its field path. Throwing this internal value avoids
 * capturing a stack for expected malformed input; public functions return Result.
 *
 * @internal
 */
export class Failure {
  readonly reason: string
  readonly path: Array<PropertyKey>
  constructor(reason: string, path: Array<PropertyKey> = []) {
    this.reason = reason
    this.path = path
  }
  get message(): string {
    return this.path.length === 0 ? this.reason : `${formatPath(this.path)}: ${this.reason}`
  }
}

const formatPath = (path: ReadonlyArray<PropertyKey>): string => {
  let out = ""
  for (const key of path) {
    if (typeof key === "number") out += `[${key}]`
    else if (typeof key === "string" && /^[A-Za-z_$][\w$]*$/.test(key)) out += out === "" ? key : `.${key}`
    else out += `[${JSON.stringify(String(key))}]`
  }
  return out
}

const fail = (reason: string): never => {
  throw new Failure(reason)
}

// Prepends `key` to the path of a failure, and turns a reader error into one.
const rethrow = (e: unknown, key: PropertyKey): never => {
  if (e instanceof Failure) {
    e.path.unshift(key)
    throw e
  }
  if (e instanceof ProtobufReader.ProtobufReaderError) throw new Failure(e.message, [key])
  throw e
}

const show = (value: unknown): string => {
  switch (typeof value) {
    case "string":
      return JSON.stringify(value)
    case "bigint":
      return `${value}n`
    case "object":
      return value === null
        ? "null"
        : Array.isArray(value)
        ? "an array"
        : value instanceof Uint8Array
        ? "a Uint8Array"
        : "an object"
    default:
      return String(value)
  }
}

const expected = (what: string, value: unknown): never => fail(`Expected ${what}, got ${show(value)}`)

// "a uint64", "an int64".
const a = (scalar: string): string => scalar.startsWith("int") ? `an ${scalar}` : `a ${scalar}`

const scalarZero = (type: D.ScalarValueType): unknown => {
  switch (type.scalar) {
    case "bool":
      return false
    case "string":
      return ""
    case "bytes":
      return new Uint8Array(0)
    case "int64":
    case "uint64":
    case "sint64":
    case "fixed64":
    case "sfixed64":
      return type.jsType === "bigint" ? BIGINT_ZERO : type.jsType === "number" ? 0 : "0"
    default:
      return 0
  }
}

const BIGINT_ZERO = BigInt(0)

const wireTypeOf = (type: D.ValueType): number => {
  switch (type.kind) {
    case "enum":
      return WireType.Varint
    case "message":
      return type.delimited ? WireType.StartGroup : WireType.Len
    case "scalar":
      switch (type.scalar) {
        case "double":
        case "fixed64":
        case "sfixed64":
          return WireType.I64
        case "float":
        case "fixed32":
        case "sfixed32":
          return WireType.I32
        case "string":
        case "bytes":
          return WireType.Len
        default:
          return WireType.Varint
      }
  }
}

const is64Bit = (scalar: D.ScalarType): boolean =>
  scalar === "int64" || scalar === "uint64" || scalar === "sint64" || scalar === "fixed64" || scalar === "sfixed64"

const isUnsigned = (scalar: D.ScalarType): boolean =>
  scalar === "uint32" || scalar === "fixed32" || scalar === "uint64" || scalar === "fixed64"

const INT32_MIN = -2147483648
const INT32_MAX = 2147483647
const UINT32_MAX = 4294967295
const FLOAT32_MAX = 3.4028234663852886e38
const INT64_MIN = -(BigInt(1) << BigInt(63))
const INT64_MAX = (BigInt(1) << BigInt(63)) - BigInt(1)
const UINT64_MAX = (BigInt(1) << BigInt(64)) - BigInt(1)

// A 64-bit integer given as a `bigint`, an integer `number` or a decimal
// `string`, in the range of the scalar.
const toInt64 = (scalar: D.ScalarType, value: unknown): bigint | number => {
  let n: bigint
  if (typeof value === "bigint") {
    n = value
  } else if (typeof value === "number") {
    if (!Number.isInteger(value)) return expected(`an integer for ${a(scalar)}`, value)
    if (Number.isSafeInteger(value)) return isUnsigned(scalar) && value < 0 ? outOfRange(scalar, value) : value
    n = BigInt(value)
  } else if (typeof value === "string" && /^-?[0-9]+$/.test(value)) {
    n = BigInt(value)
  } else {
    return expected(`a bigint, integer or decimal string for ${a(scalar)}`, value)
  }
  const unsigned = isUnsigned(scalar)
  return (unsigned ? n >= BIGINT_ZERO && n <= UINT64_MAX : n >= INT64_MIN && n <= INT64_MAX)
    ? n
    : outOfRange(scalar, value)
}

const outOfRange = (scalar: D.ScalarType, value: unknown): never => expected(`${a(scalar)} in range`, value)

const int32 = (scalar: D.ScalarType, value: unknown): number =>
  typeof value === "number" && Number.isInteger(value) && value >= INT32_MIN && value <= INT32_MAX
    ? value
    : expected(`an integer for ${a(scalar)}`, value)

const uint32 = (scalar: D.ScalarType, value: unknown): number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= UINT32_MAX
    ? value
    : expected(`a non-negative integer for ${a(scalar)}`, value)

const float = (v: unknown): number =>
  typeof v === "number" && !(Number.isFinite(v) && Math.abs(v) > FLOAT32_MAX)
    ? v
    : expected("a number in the range of a float", v)

const ownValue = (message: Message, key: string): any => Object.hasOwn(message, key) ? message[key] : undefined
const assign = InternalRecord.assignProperty

interface Layout {
  readonly descriptor: D.MessageDescriptor
  readonly byNumber: { readonly [number: number]: ReadField | undefined }
  readonly ordered: ReadonlyArray<WriteField>
  readonly oneofs: ReadonlyArray<readonly [D.OneofDescriptor, ReadonlySet<string>]>
  readonly create: (context: DecodeContext) => Message
  // Required fields, and message fields whose values can contain one.
  readonly finish: ReadonlyArray<D.FieldDescriptor>
}

interface ReadField {
  readonly key: string
  readonly wire: number
  readonly packed: boolean
  readonly read: (
    context: DecodeContext,
    r: Reader,
    target: Message,
    depth: number,
    start: number,
    packed: boolean
  ) => void
}

interface WriteField {
  readonly key: string
  readonly write: (context: EncodeContext, w: Writer, target: Message, depth: number) => void
}

const layouts = new WeakMap<D.MessageDescriptor, Layout>()
const layoutOf = (descriptor: D.MessageDescriptor): Layout => {
  let layout = layouts.get(descriptor)
  if (layout === undefined) {
    const max = descriptor.fields.reduce((max, field) => Math.max(max, field.number), 0)
    const byNumber: { [number: number]: ReadField | undefined } = max <= 1024
      ? new Array(max + 1).fill(undefined)
      : Object.create(null)
    for (const field of descriptor.fields) {
      byNumber[field.number] = {
        key: field.oneof?.name ?? field.name,
        wire: field.kind === "map" ? WireType.Len : wireTypeOf(field.type),
        packed: field.kind === "list" && packable(field.type),
        read: prepareRead(field)
      }
    }
    layout = {
      descriptor,
      byNumber,
      ordered: [...descriptor.fields].sort((a, b) => a.number - b.number).map((field) => ({
        key: field.oneof?.name ?? field.name,
        write: prepareWrite(field)
      })),
      oneofs: descriptor.oneofs.map((oneof) => [oneof, new Set(oneof.fields.map((field) => field.name))]),
      create: prepareCreate(descriptor),
      finish: descriptor.fields.filter((field) =>
        field.kind === "singular" && field.presence === "required" ||
        field.type.kind === "message" && reachesRequired(field.type.message)
      )
    }
    layouts.set(descriptor, layout)
  }
  return layout
}

// Whether values of a message type can contain a required field. Only the
// answer for the starting type is kept: types on a cycle are answered by the
// frame that first visits them.
const requiredReach = new WeakMap<D.MessageDescriptor, boolean>()
const reachesRequired = (descriptor: D.MessageDescriptor): boolean => {
  let reaches = requiredReach.get(descriptor)
  if (reaches === undefined) {
    const seen = new Set<D.MessageDescriptor>()
    const visit = (message: D.MessageDescriptor): boolean => {
      if (seen.has(message)) return false
      seen.add(message)
      return message.fields.some((field) =>
        field.kind === "singular" && field.presence === "required" ||
        field.type.kind === "message" && visit(field.type.message)
      )
    }
    reaches = visit(descriptor)
    requiredReach.set(descriptor, reaches)
  }
  return reaches
}

// How a default is installed: 0 the constant default, 1 a new list, 2 a new
// record, 3 new bytes.
const createKind = (field: D.FieldDescriptor): 0 | 1 | 2 | 3 => {
  if (field.kind === "list") return 1
  if (field.kind === "map") return 2
  return field.type.kind === "scalar" && field.type.scalar === "bytes" ? 3 : 0
}

// Installs the defaults of a new message in field order. Stores in a loop
// measured faster than copying a template object once several message types
// share this code.
const prepareCreate = (descriptor: D.MessageDescriptor): Layout["create"] => {
  const keys: Array<string> = []
  const values: Array<unknown> = []
  const kinds: Array<0 | 1 | 2 | 3> = []
  for (const field of descriptor.fields) {
    if (
      field.oneof !== undefined ||
      (field.kind === "singular" && (field.presence !== "implicit" || field.type.kind === "message"))
    ) continue
    const kind = createKind(field)
    keys.push(field.name)
    values.push(kind === 0 ? valueDefault(field.type) : undefined)
    kinds.push(kind)
  }
  const required = descriptor.fields.some((field) => field.kind === "singular" && field.presence === "required")
  return (context) => {
    const target: Message = {}
    for (let i = 0; i < keys.length; i++) {
      const kind = kinds[i]
      assign(target, keys[i], kind === 0 ? values[i] : kind === 1 ? [] : kind === 2 ? {} : new Uint8Array(0))
    }
    if (required) context.needsFinish = true
    return target
  }
}

const enumNumbers = new WeakMap<D.EnumDescriptor, ReadonlySet<number>>()
const acceptsEnum = (descriptor: D.EnumDescriptor, value: number): boolean => {
  if (descriptor.open) return true
  let numbers = enumNumbers.get(descriptor)
  if (numbers === undefined) {
    numbers = new Set(descriptor.values.map((value) => value.number))
    enumNumbers.set(descriptor, numbers)
  }
  return numbers.has(value)
}

const packable = (type: D.ValueType): type is D.ScalarValueType | D.EnumValueType =>
  type.kind === "enum" || (type.kind === "scalar" && type.scalar !== "string" && type.scalar !== "bytes")

const valueDefault = (type: D.ValueType): unknown => {
  switch (type.kind) {
    case "message":
      return {}
    case "enum":
      return type.enum.open ? 0 : type.enum.values[0].number
    case "scalar":
      return scalarZero(type)
  }
}

const LAX_UTF8 = { validateUtf8: false } as const

const writeScalar = (w: Writer, scalar: D.ScalarType, value: unknown): void => {
  scalarWriters[scalar](w, value)
}

const writeEnum = (w: Writer, type: D.EnumValueType, value: unknown): void => {
  const number = int32("int32", value)
  if (!acceptsEnum(type.enum, number)) expected(`a value of ${type.enum.typeName}`, value)
  w.int32(number)
}

// -----------------------------------------------------------------------------
// decoding
// -----------------------------------------------------------------------------

interface DecodeContext {
  input: Uint8Array
  readonly maxDepth: number
  readonly keepUnknown: boolean
  needsFinish: boolean
  // The unknown fields of the occurrence being read, added to its message
  // when the occurrence ends.
  unknown: Array<Uint8Array> | undefined
}

const retain = (context: DecodeContext, bytes: Uint8Array): void => {
  if (context.unknown === undefined) context.unknown = [bytes]
  else context.unknown.push(bytes)
}

const retainOccurrence = (context: DecodeContext, start: number, end: number): void => {
  if (context.keepUnknown) retain(context, context.input.subarray(start, end))
}

const checkDepth = (depth: number, limit: number): void => {
  if (depth > limit) fail(`Expected messages nested at most ${limit} deep`)
}

const decodeMessage = (descriptor: D.MessageDescriptor, bytes: Uint8Array, options?: DecodeOptions): Message => {
  const context: DecodeContext = {
    input: bytes,
    maxDepth: depthLimit(options?.maxDepth),
    keepUnknown: options?.readUnknownFields !== false,
    needsFinish: false,
    unknown: undefined
  }
  const layout = layoutOf(descriptor)
  const target = readFields(context, ProtobufReader.make(bytes), layout, undefined, 0)
  if (context.needsFinish) finishMessage(layout, target)
  return target
}

/** @internal */
export const decode = (
  descriptor: D.MessageDescriptor,
  bytes: Uint8Array,
  options: DecodeOptions | undefined
): Result.Result<Record<string, unknown>, Failure> => {
  try {
    return Result.succeed(decodeMessage(descriptor, bytes, options))
  } catch (error) {
    return Result.fail(toFailure(error))
  }
}

const toFailure = (error: unknown): Failure => {
  if (error instanceof Failure) return error
  if (error instanceof ProtobufReader.ProtobufReaderError) return new Failure(error.message)
  throw error
}

const readFields = (
  context: DecodeContext,
  r: Reader,
  layout: Layout,
  before: Message | undefined,
  depth: number,
  group?: number
): Message => {
  checkDepth(depth, context.maxDepth)
  const target = before ?? layout.create(context)
  const fields = layout.byNumber
  const outer = context.unknown
  context.unknown = undefined
  while (true) {
    if (group === undefined && r.isDone()) break
    const start = r.offset
    const tag = r.tag()
    const number = tag >>> 3
    const actual = tag & 7
    if (actual === WireType.EndGroup) {
      if (number === group) break
      fail(`Expected a start group tag before the end group tag of field ${number}`)
    }
    const entry = fields[number]
    const packed = actual === WireType.Len && entry?.packed === true
    if (entry === undefined || (actual !== entry.wire && !packed)) {
      r.skip(tag, context.maxDepth - depth)
      retainOccurrence(context, start, r.offset)
      continue
    }
    try {
      entry.read(context, r, target, depth, start, packed)
    } catch (error) {
      rethrow(error, entry.key)
    }
  }
  const unknown = context.unknown
  context.unknown = outer
  if (unknown !== undefined) {
    const earlier = target[unknownFields]
    target[unknownFields] = Bytes.concat(earlier === undefined ? unknown : [earlier, ...unknown])
  }
  return target
}

// Reads a value of a field, given the value of an earlier occurrence to merge
// a message into. The operation is selected when the descriptor is prepared.
type ValueReader = (context: DecodeContext, r: Reader, before: unknown, depth: number) => unknown

const prepareValueRead = (type: D.ValueType, number: number): ValueReader => {
  switch (type.kind) {
    case "scalar": {
      const read = scalarReader(type)
      return (_context, r) => read(r)
    }
    case "enum":
      return (_context, r) => r.int32()
    case "message": {
      const message = type.message
      let layout: Layout | undefined
      if (type.delimited) {
        return (context, r, before, depth) =>
          readFields(context, r, layout ??= layoutOf(message), before as Message | undefined, depth + 1, number)
      }
      return (context, r, before, depth) =>
        readFields(context, r.delimited(), layout ??= layoutOf(message), before as Message | undefined, depth + 1)
    }
  }
}

const prepareRead = (field: D.FieldDescriptor): ReadField["read"] => {
  switch (field.kind) {
    case "singular":
      return prepareSingularRead(field)
    case "list":
      return prepareListRead(field)
    case "map":
      return prepareMapRead(field)
  }
}

const prepareSingularRead = (field: D.SingularFieldDescriptor): ReadField["read"] => {
  const read = prepareValueRead(field.type, field.number)
  const type = field.type
  const closed = type.kind === "enum" && !type.enum.open ? type.enum : undefined
  if (field.oneof === undefined) {
    const key = field.name
    if (type.kind === "message") {
      return (context, r, target, depth) => {
        assign(target, key, read(context, r, ownValue(target, key), depth))
      }
    }
    if (closed !== undefined) {
      return (context, r, target, depth, start) => {
        const value = read(context, r, undefined, depth) as number
        if (acceptsEnum(closed, value)) assign(target, key, value)
        else retainOccurrence(context, start, r.offset)
      }
    }
    return (context, r, target, depth) => {
      assign(target, key, read(context, r, undefined, depth))
    }
  }
  const key = field.oneof.name
  const name = field.name
  return (context, r, target, depth, start) => {
    let before: unknown
    if (type.kind === "message") {
      const current = ownValue(target, key)
      if (current?._tag === name) before = current.value
    }
    const value = read(context, r, before, depth)
    // Classify the occurrence before changing the active oneof case.
    if (closed !== undefined && !acceptsEnum(closed, value as number)) {
      retainOccurrence(context, start, r.offset)
      return
    }
    assign(target, key, { _tag: name, value })
  }
}

// Creation installs an own container for every repeated field, including
// names such as __proto__ and constructor.
const prepareListRead = (field: D.ListFieldDescriptor): ReadField["read"] => {
  const key = field.name
  const type = field.type
  const read = prepareValueRead(type, field.number)
  const closed = type.kind === "enum" && !type.enum.open ? type.enum : undefined
  const element: ReadField["read"] = (context, r, target, depth, start) => {
    const list = target[key] as Array<unknown>
    try {
      const value = read(context, r, undefined, depth)
      if (closed !== undefined && !acceptsEnum(closed, value as number)) {
        retainOccurrence(context, start, r.offset)
      } else list.push(value)
    } catch (error) {
      rethrow(error, list.length)
    }
  }
  if (!packable(type)) return element
  const readPacked = preparePackedRead(type, field.number)
  return (context, r, target, depth, start, packed) => {
    if (packed) readPacked(context, r, target[key])
    else element(context, r, target, depth, start, packed)
  }
}

// Prepared fields and packed payloads share these scalar operations. Packed
// arrays select an operation once, outside the element loop.
type PackedScalar = Exclude<D.ScalarType, "string" | "bytes">
const numericReaders: Record<PackedScalar, (r: Reader) => unknown> = {
  double: (r) => r.double(),
  float: (r) => r.float(),
  int32: (r) => r.int32(),
  uint32: (r) => r.uint32(),
  sint32: (r) => r.sint32(),
  fixed32: (r) => r.fixed32(),
  sfixed32: (r) => r.sfixed32(),
  bool: (r) => r.bool(),
  int64: (r) => r.int64(),
  uint64: (r) => r.uint64(),
  sint64: (r) => r.sint64(),
  fixed64: (r) => r.fixed64(),
  sfixed64: (r) => r.sfixed64()
}
const numberReaders: Partial<Record<D.ScalarType, (r: Reader) => number>> = {
  int64: (r) => r.int64Number(),
  uint64: (r) => r.uint64Number(),
  sint64: (r) => r.sint64Number(),
  fixed64: (r) => r.fixed64Number(),
  sfixed64: (r) => r.sfixed64Number()
}
const stringReaders: Partial<Record<D.ScalarType, (r: Reader) => string>> = {
  int64: (r) => String(r.int64()),
  uint64: (r) => String(r.uint64()),
  sint64: (r) => String(r.sint64()),
  fixed64: (r) => String(r.fixed64()),
  sfixed64: (r) => String(r.sfixed64())
}

const readString = (r: Reader): string => r.string()
const readStringLax = (r: Reader): string => r.string(LAX_UTF8)
const readBytes = (r: Reader): Uint8Array => r.bytes()
const scalarReader = (type: D.ScalarValueType, jsType = type.jsType): (r: Reader) => unknown => {
  if (type.scalar === "string") return type.validateUtf8 ? readString : readStringLax
  if (type.scalar === "bytes") return readBytes
  const base = numericReaders[type.scalar]
  return jsType === "number" ?
    numberReaders[type.scalar] ?? base
    : jsType === "string"
    ? stringReaders[type.scalar] ?? base
    : base
}

type PackedReader = (context: DecodeContext, r: Reader, list: Array<unknown>) => void

// Separate loops let scalar and floating-point arrays keep their own element
// types in the hot path. The operation is selected during descriptor preparation.
const preparePackedRead = (type: D.ScalarValueType | D.EnumValueType, number: number): PackedReader => {
  if (type.kind === "enum") {
    return (context, r, list) => {
      const child = r.delimited()
      let unknown: Writer | undefined
      try {
        while (!child.isDone()) {
          const value = child.int32()
          if (acceptsEnum(type.enum, value)) list.push(value)
          else if (context.keepUnknown) {
            unknown ??= ProtobufWriter.make()
            unknown.tag(number, WireType.Varint).int32(value)
          }
        }
      } catch (error) {
        rethrow(error, list.length)
      }
      if (unknown !== undefined) retain(context, unknown.finish())
    }
  }
  if (type.scalar === "double" || type.scalar === "float") {
    const size = type.scalar === "double" ? 8 : 4
    return (_context, r, list) => {
      const bytes = r.bytesView()
      if (bytes.length % size !== 0) {
        const complete = bytes.length - bytes.length % size
        throw new Failure(`Expected a complete value at offset ${r.offset - bytes.length + complete}`, [
          list.length + complete / size
        ])
      }
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.length)
      if (size === 8) {
        for (let i = 0; i < bytes.length; i += 8) list.push(view.getFloat64(i, true))
      } else {
        for (let i = 0; i < bytes.length; i += 4) list.push(view.getFloat32(i, true))
      }
    }
  }
  const read = scalarReader(type)
  return (_context, r, list) => {
    const child = r.delimited()
    try {
      while (!child.isDone()) list.push(read(child))
    } catch (error) {
      rethrow(error, list.length)
    }
  }
}

const mapKeyDefault = (type: D.ScalarValueType): string =>
  type.scalar === "string" ? "" : type.scalar === "bool" ? "false" : "0"

const prepareMapRead = (field: D.MapFieldDescriptor): ReadField["read"] => {
  const name = field.name
  const type = field.type
  const keyTag = 1 * 8 + wireTypeOf(field.key)
  const valueTag = 2 * 8 + wireTypeOf(type)
  const readKey = scalarReader(field.key, "bigint")
  const stringKey = field.key.scalar === "string"
  const keyDefault = mapKeyDefault(field.key)
  const read = prepareValueRead(type, 2)
  const closed = type.kind === "enum" && !type.enum.open ? type.enum : undefined
  const message = type.kind === "message" ? type.message : undefined
  const missing = message === undefined ? valueDefault(type) : undefined
  return (context, r, target, depth, start) => {
    const child = r.delimited()
    let key = keyDefault
    let value: unknown
    // Stage the entire entry before replacing any existing value at its key.
    while (!child.isDone()) {
      const tag = child.tag()
      if (tag === keyTag) {
        const read = readKey(child)
        key = stringKey ? read as string : String(read)
      } else if (tag === valueTag) {
        try {
          value = read(context, child, value, depth)
        } catch (error) {
          rethrow(error, key)
        }
      } else child.skip(tag, context.maxDepth - depth)
    }
    if (closed !== undefined && value !== undefined && !acceptsEnum(closed, value as number)) {
      retainOccurrence(context, start, r.offset)
      return
    }
    if (value === undefined) {
      if (message === undefined) value = missing
      else {
        try {
          checkDepth(depth + 1, context.maxDepth)
        } catch (error) {
          rethrow(error, key)
        }
        value = layoutOf(message).create(context)
      }
    }
    assign(target[name], key, value)
  }
}

// Checks required fields of the completed value. Explicit absence stays
// absent, and required fields never receive a default that could conceal
// their absence on the wire.
const finishMessage = (layout: Layout, target: Message): void => {
  for (const field of layout.finish) {
    const key = field.oneof?.name ?? field.name
    const stored = ownValue(target, key)
    if (field.oneof !== undefined && stored?._tag !== field.name) continue
    const value = field.oneof === undefined ? stored : stored.value
    try {
      if (value === undefined) {
        if (field.kind === "singular" && field.presence === "required") {
          fail(`Expected required field ${field.name} of ${layout.descriptor.typeName}`)
        }
        continue
      }
      if (field.type.kind !== "message" || !reachesRequired(field.type.message)) continue
      const child = layoutOf(field.type.message)
      switch (field.kind) {
        case "singular":
          finishMessage(child, value)
          break
        case "list":
          for (let i = 0; i < value.length; i++) {
            try {
              finishMessage(child, value[i])
            } catch (error) {
              rethrow(error, i)
            }
          }
          break
        case "map":
          for (const entry of Object.keys(value)) {
            try {
              finishMessage(child, value[entry])
            } catch (error) {
              rethrow(error, entry)
            }
          }
          break
      }
    } catch (error) {
      rethrow(error, key)
    }
  }
}

// -----------------------------------------------------------------------------
// encoding
// -----------------------------------------------------------------------------

interface EncodeContext {
  readonly maxDepth: number
  readonly writeUnknown: boolean
}

/** @internal */
export const encode = (
  descriptor: D.MessageDescriptor,
  message: unknown,
  options: EncodeOptions | undefined
): Result.Result<Uint8Array<ArrayBuffer>, Failure> => {
  try {
    const w = ProtobufWriter.make()
    writeFields(
      { maxDepth: depthLimit(options?.maxDepth), writeUnknown: options?.writeUnknownFields !== false },
      w,
      descriptor,
      message,
      0
    )
    return Result.succeed(w.finish())
  } catch (error) {
    return Result.fail(toFailure(error))
  }
}

const writeFields = (
  context: EncodeContext,
  w: Writer,
  descriptor: D.MessageDescriptor,
  message: unknown,
  depth: number,
  layout = layoutOf(descriptor)
): void => {
  checkDepth(depth, context.maxDepth)
  if (typeof message !== "object" || message === null || Array.isArray(message)) {
    expected(`an object for ${descriptor.typeName}`, message)
  }
  const target = message as Message
  const oneofs = layout.oneofs
  for (let i = 0; i < oneofs.length; i++) {
    const [oneof, cases] = oneofs[i]
    const value = ownValue(target, oneof.name)
    if (value !== undefined && (typeof value !== "object" || value === null || !cases.has(ownValue(value, "_tag")))) {
      rethrow(new Failure(`Expected a case of oneof ${oneof.name}, got ${show(value?._tag ?? value)}`), oneof.name)
    }
  }
  const fields = layout.ordered
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i]
    try {
      field.write(context, w, target, depth)
    } catch (error) {
      rethrow(error, field.key)
    }
  }
  if (context.writeUnknown) {
    const unknown = target[unknownFields]
    if (unknown !== undefined) {
      if (!(unknown instanceof Uint8Array)) expected("a Uint8Array of unknown fields", unknown)
      w.raw(unknown)
    }
  }
}

// Field writers select their operation, tag and zero test when the descriptor
// is prepared.
const prepareWrite = (field: D.FieldDescriptor): WriteField["write"] => {
  if (field.oneof !== undefined) {
    const key = field.oneof.name
    const name = field.name
    const write = prepareValueWrite(field.type, field.number)
    // writeFields has checked that the oneof is a case object.
    return (context, w, target, depth) => {
      const stored = ownValue(target, key)
      if (stored?._tag === name) write(context, w, ownValue(stored, "value"), depth)
    }
  }
  const key = field.name
  switch (field.kind) {
    case "singular": {
      const required = field.presence === "required"
      const zero = field.presence === "implicit" ? zeroTest(field.type) : undefined
      if (field.type.kind === "scalar") {
        const tag = field.number * 8 + wireTypeOf(field.type)
        const write = scalarWriters[field.type.scalar]
        return (_context, w, target) => {
          const value = ownValue(target, key)
          if (value === undefined) {
            if (required) fail(`Expected a value for required field ${key}`)
          } else if (zero === undefined || !zero(value)) {
            w.uint32(tag)
            write(w, value)
          }
        }
      }
      const write = prepareValueWrite(field.type, field.number)
      return (context, w, target, depth) => {
        const value = ownValue(target, key)
        if (value === undefined) {
          if (required) fail(`Expected a value for required field ${key}`)
        } else if (zero === undefined || !zero(value)) write(context, w, value, depth)
      }
    }
    case "list": {
      const type = field.type
      const number = field.number
      const packed = field.packed && packable(type) ? preparePackedWrite(type, number) : undefined
      const write = prepareValueWrite(type, number)
      return (context, w, target, depth) => {
        const value = ownValue(target, key)
        if (value === undefined) return
        if (!Array.isArray(value)) expected("an array", value)
        if (value.length === 0) return
        if (packed !== undefined) {
          packed(w, value)
          return
        }
        for (let i = 0; i < value.length; i++) {
          try {
            write(context, w, value[i], depth)
          } catch (error) {
            rethrow(error, i)
          }
        }
      }
    }
    case "map": {
      const tag = field.number * 8 + WireType.Len
      const keyType = field.key
      const write = prepareValueWrite(field.type, 2)
      return (context, w, target, depth) => {
        const value = ownValue(target, key)
        if (value === undefined) return
        if (typeof value !== "object" || value === null || Array.isArray(value)) expected("a record", value)
        for (const entry of Object.keys(value)) {
          try {
            w.uint32(tag).fork()
            writeMapKey(w, keyType, entry)
            write(context, w, value[entry], depth)
            w.join()
          } catch (error) {
            rethrow(error, entry)
          }
        }
      }
    }
  }
}

// The test for the zero value of an implicit-presence field, which is not
// written. Message fields have no implicit presence.
const zeroTest = (type: D.ValueType): ((value: unknown) => boolean) | undefined => {
  if (type.kind === "message") return undefined
  if (type.kind === "enum") {
    const zero = valueDefault(type)
    return (value) => value === zero
  }
  switch (type.scalar) {
    case "double":
    case "float":
      return (value) => value === 0 && 1 / value > 0
    case "bool":
      return (value) => value === false
    case "string":
      return (value) => value === ""
    case "bytes":
      return (value) => value instanceof Uint8Array && value.length === 0
    default:
      return is64Bit(type.scalar)
        ? (value) => value === 0 || value === BIGINT_ZERO || value === "0"
        : (value) => value === 0
  }
}

type ValueWriter = (context: EncodeContext, w: Writer, value: unknown, depth: number) => void

const prepareValueWrite = (type: D.ValueType, number: number): ValueWriter => {
  const tag = number * 8 + wireTypeOf(type)
  switch (type.kind) {
    case "scalar": {
      const write = scalarWriters[type.scalar]
      return (_context, w, value) => {
        w.uint32(tag)
        write(w, value)
      }
    }
    case "enum":
      return (_context, w, value) => {
        w.uint32(tag)
        writeEnum(w, type, value)
      }
    case "message": {
      const message = type.message
      let layout: Layout | undefined
      if (type.delimited) {
        const endTag = number * 8 + WireType.EndGroup
        return (context, w, value, depth) => {
          w.uint32(tag)
          writeFields(context, w, message, value, depth + 1, layout ??= layoutOf(message))
          w.uint32(endTag)
        }
      }
      return (context, w, value, depth) => {
        w.uint32(tag).fork()
        writeFields(context, w, message, value, depth + 1, layout ??= layoutOf(message))
        w.join()
      }
    }
  }
}

const scalarWriters: Record<D.ScalarType, (w: Writer, value: unknown) => unknown> = {
  string: (w, v) => w.string(typeof v === "string" ? v : expected("a string", v)),
  bytes: (w, v) => w.bytes(v instanceof Uint8Array ? v : expected("a Uint8Array", v)),
  double: (w, v) => w.double(typeof v === "number" ? v : expected("a number for a double", v)),
  float: (w, v) => w.float(float(v)),
  int32: (w, v) => w.int32(int32("int32", v)),
  uint32: (w, v) => w.uint32(uint32("uint32", v)),
  sint32: (w, v) => w.sint32(int32("sint32", v)),
  fixed32: (w, v) => w.fixed32(uint32("fixed32", v)),
  sfixed32: (w, v) => w.sfixed32(int32("sfixed32", v)),
  bool: (w, v) => w.bool(typeof v === "boolean" ? v : expected("a boolean", v)),
  int64: (w, v) => w.int64(toInt64("int64", v)),
  uint64: (w, v) => w.uint64(toInt64("uint64", v)),
  sint64: (w, v) => w.sint64(toInt64("sint64", v)),
  fixed64: (w, v) => w.fixed64(toInt64("fixed64", v)),
  sfixed64: (w, v) => w.sfixed64(toInt64("sfixed64", v))
}

type PackedWriter = (w: Writer, list: ReadonlyArray<unknown>) => void

// As for reading, the operation is selected during descriptor preparation.
const preparePackedWrite = (type: D.ScalarValueType | D.EnumValueType, number: number): PackedWriter => {
  const tag = number * 8 + WireType.Len
  const write: (w: Writer, value: unknown) => unknown = type.kind === "enum"
    ? (w, value) => writeEnum(w, type, value)
    : scalarWriters[type.scalar]
  const values = (w: Writer, list: ReadonlyArray<unknown>): void => {
    let index = 0
    try {
      for (; index < list.length; index++) write(w, list[index])
    } catch (error) {
      rethrow(error, index)
    }
  }
  const wire = wireTypeOf(type)
  const size = wire === WireType.I64 ? 8 : wire === WireType.I32 ? 4 : 0
  if (size === 0) {
    return (w, list) => {
      w.uint32(tag).fork()
      values(w, list)
      w.join()
    }
  }
  const length = (w: Writer, list: ReadonlyArray<unknown>): number => {
    const length = list.length * size
    if (length > UINT32_MAX) fail("Expected a packed field length of at most 4294967295 bytes")
    w.uint32(tag).uint32(length)
    return length
  }
  if (type.kind === "scalar" && (type.scalar === "double" || type.scalar === "float")) {
    return (w, list) => {
      const view = new DataView(new ArrayBuffer(length(w, list)))
      let index = 0
      try {
        if (size === 8) {
          for (; index < list.length; index++) {
            const value = list[index]
            view.setFloat64(
              index * 8,
              typeof value === "number" ? value : expected("a number for a double", value),
              true
            )
          }
        } else {
          for (; index < list.length; index++) view.setFloat32(index * 4, float(list[index]), true)
        }
      } catch (error) {
        rethrow(error, index)
      }
      w.raw(new Uint8Array(view.buffer))
    }
  }
  return (w, list) => {
    length(w, list)
    values(w, list)
  }
}

const writeMapKey = (w: Writer, type: D.ScalarValueType, key: string): void => {
  w.tag(1, wireTypeOf(type) as ProtobufWriter.WireType)
  switch (type.scalar) {
    case "string":
      writeScalar(w, type.scalar, key)
      break
    case "bool":
      writeScalar(w, type.scalar, key === "true" ? true : key === "false" ? false : expected("a boolean key", key))
      break
    default:
      if (!/^-?[0-9]+$/.test(key)) expected(`an integer key for ${a(type.scalar)}`, key)
      writeScalar(w, type.scalar, is64Bit(type.scalar) ? key : Number(key))
      break
  }
}

// -----------------------------------------------------------------------------
// extensions
// -----------------------------------------------------------------------------

// A MessageSet item: `repeated group Item = 1 { required int32 type_id = 2;
// required bytes message = 3; }`.
const ITEM_START = 1 * 8 + WireType.StartGroup
const ITEM_END = 1 * 8 + WireType.EndGroup

// Splits unknown fields into occurrences of an extension and the rest.
// MessageSet occurrences are bare message payloads; ordinary extensions
// include their field tags so they can decode into a holder.
const splitExtension = (
  message: any,
  extension: D.ExtensionDescriptor
): { readonly own: ReadonlyArray<Uint8Array>; readonly rest: ReadonlyArray<Uint8Array> } => {
  const bytes = message[unknownFields]
  const own: Array<Uint8Array> = []
  const rest: Array<Uint8Array> = []
  if (bytes === undefined) return { own, rest }
  if (!(bytes instanceof Uint8Array)) return expected("a Uint8Array of unknown fields", bytes)
  const number = extension.field.number
  const messageSet = extension.extendee.messageSetWireFormat
  const r = ProtobufReader.make(bytes)
  while (!r.isDone()) {
    const start = r.offset
    const tag = r.tag()
    if (messageSet && tag === ITEM_START) {
      const payload = readItem(r, number)
      if (payload === undefined) rest.push(bytes.subarray(start, r.offset))
      else own.push(payload)
      continue
    }
    // MessageSet also accepts ordinary length-delimited extension fields.
    // Keep both forms as bare payloads: its ID may exceed the range of tags.
    if (messageSet && tag >>> 3 === number && (tag & 7) === WireType.Len) {
      own.push(r.bytesView())
      continue
    }
    r.skip(tag)
    // A field with an incompatible wire type remains unknown when setting
    // or clearing the extension, just as it does during message decoding.
    const type = extension.field.type
    const actual = tag & 7
    const packed = extension.field.kind === "list" && actual === WireType.Len && packable(type)
    const matches = !messageSet && tag >>> 3 === number && (actual === wireTypeOf(type) || packed)
    ;(matches ? own : rest).push(bytes.subarray(start, r.offset))
  }
  return { own, rest }
}

// Reads the rest of a MessageSet item after its start tag, and returns its
// message bytes when its type id is `typeId`. Only the first type id and
// payload are used; incomplete items do not set an extension.
const readItem = (r: ProtobufReader.ProtobufReader, typeId: number): Uint8Array | undefined => {
  let id: number | undefined
  let payload: Uint8Array | undefined
  while (true) {
    const tag = r.tag()
    if (tag === ITEM_END) break
    if (tag === 2 * 8 + WireType.Varint) {
      const value = r.uint32()
      if (value === 0) fail("Expected a nonzero MessageSet type id")
      id ??= value
    } else if (tag === 3 * 8 + WireType.Len) {
      const value = r.bytesView()
      payload ??= value
    } else {
      r.skip(tag)
    }
  }
  return id === typeId ? payload : undefined
}

// A message of one field, an ordinary extension, which its occurrences decode into.
const holders = new WeakMap<D.ExtensionDescriptor, D.MessageDescriptor>()
const holderOf = (extension: D.ExtensionDescriptor): D.MessageDescriptor => {
  let descriptor = holders.get(extension)
  if (descriptor === undefined) {
    descriptor = { ...extension.extendee, fields: [extension.field], oneofs: [] }
    holders.set(extension, descriptor)
  }
  return descriptor
}

const readExtension = (extension: D.ExtensionDescriptor, occurrences: ReadonlyArray<Uint8Array>): Message =>
  decodeMessage(holderOf(extension), Bytes.concat(occurrences))

const messageSetDescriptor = (extension: D.ExtensionDescriptor): D.MessageDescriptor => {
  const field = extension.field
  if (field.kind !== "singular" || field.type.kind !== "message") {
    return fail("Expected a singular message extension of a MessageSet")
  }
  return field.type.message
}

// Called with at least one payload. Each reader is bounded to its occurrence,
// while merge state survives until final validation.
const readMessageSet = (extension: D.ExtensionDescriptor, occurrences: ReadonlyArray<Uint8Array>): Message => {
  const descriptor = messageSetDescriptor(extension)
  const context: DecodeContext = {
    input: occurrences[0],
    maxDepth: DEFAULT_MAX_DEPTH,
    keepUnknown: true,
    needsFinish: false,
    unknown: undefined
  }
  const layout = layoutOf(descriptor)
  const target = layout.create(context)
  for (const input of occurrences) {
    context.input = input
    // The payload is nested one level inside the extended message.
    readFields(context, ProtobufReader.make(input), layout, target, 1)
  }
  if (context.needsFinish) finishMessage(layout, target)
  return target
}

/** @internal */
export const getExtension = (
  message: unknown,
  extension: D.ExtensionDescriptor
): Result.Result<unknown, Failure> => {
  try {
    const { own } = splitExtension(message, extension)
    const field = extension.field
    if (own.length === 0) return Result.succeed(field.kind === "list" ? [] : undefined)
    if (extension.extendee.messageSetWireFormat) {
      try {
        return Result.succeed(readMessageSet(extension, own))
      } catch (error) {
        rethrow(error, field.name)
      }
    }
    const target = readExtension(extension, own)
    return Result.succeed(ownValue(target, field.name))
  } catch (e) {
    return Result.fail(toFailure(e))
  }
}

/** @internal */
export const setExtension = (
  message: object,
  extension: D.ExtensionDescriptor,
  value: unknown
): Result.Result<Record<PropertyKey, unknown>, Failure> => {
  try {
    const { own, rest } = splitExtension(message, extension)
    const chunks = [...rest]
    // Closed-enum numbers outside the descriptor are unknown data, even
    // when they share the extension's field number or a packed occurrence.
    const type = extension.field.type
    if (own.length > 0 && type.kind === "enum" && !type.enum.open) {
      const unknown = readExtension(extension, own)[unknownFields]
      if (unknown !== undefined) chunks.push(unknown)
    }
    if (value !== undefined) {
      const w = ProtobufWriter.make()
      const context = { maxDepth: DEFAULT_MAX_DEPTH, writeUnknown: true }
      if (extension.extendee.messageSetWireFormat) {
        w.tag(1, WireType.StartGroup)
          .tag(2, WireType.Varint).uint32(extension.field.number)
          .tag(3, WireType.Len).fork()
        try {
          writeFields(context, w, messageSetDescriptor(extension), value, 1)
        } catch (error) {
          rethrow(error, extension.field.name)
        }
        w.join().tag(1, WireType.EndGroup)
      } else {
        writeFields(context, w, holderOf(extension), { [extension.field.name]: value }, 0)
      }
      chunks.push(w.finish())
    }
    const out: Record<PropertyKey, unknown> = { ...message }
    if (chunks.length === 0) delete out[unknownFields]
    else out[unknownFields] = Bytes.concat(chunks)
    return Result.succeed(out)
  } catch (e) {
    return Result.fail(toFailure(e))
  }
}
