// The binary encoding of message values, compiled per message descriptor into
// a reader and a writer per field: closures that hold what they need, so that
// encoding and decoding read no descriptors.
//
// A message value is a plain object, keyed by the `localName` of its fields:
//
// - implicit-presence fields always hold a value, their zero value when absent
// - explicit-presence fields are left out when absent
// - repeated fields hold an array, and map fields a record
// - a oneof holds `{ _tag, value }`, with the `localName` of its case
// - unknown fields are kept as their encoded bytes, under `unknownFields`
//
// Decoding merges a later occurrence of a message field into the value of the
// earlier one, as protobuf does, so values are built in place.

import * as Bytes from "../../Bytes.ts"
import * as InternalRecord from "../../internal/record.ts"
import * as Utf8 from "../../internal/utf8.ts"
import * as Result from "../../Result.ts"
import type * as D from "../ProtobufDescriptor.ts"
import * as ProtobufReader from "../ProtobufReader.ts"
import * as ProtobufWriter from "../ProtobufWriter.ts"
import { WireType } from "./wireType.ts"

// `ProtobufMessage.unknownFields`, the same symbol.
const unknownFields: unique symbol = Symbol.for("effect/protobuf/ProtobufMessage/unknownFields")

/** @internal */
export interface DecodeOptions {
  readonly readUnknownFields?: boolean | undefined
  readonly maxDepth?: number | undefined
}

/** @internal */
export interface EncodeOptions {
  readonly writeUnknownFields?: boolean | undefined
  readonly maxDepth?: number | undefined
}

const DEFAULT_MAX_DEPTH = 100

// -----------------------------------------------------------------------------
// failures
// -----------------------------------------------------------------------------

/**
 * Why a value does not encode or bytes do not decode, and where. The path is
 * filled in while the failure propagates. It is not an `Error`, so throwing it
 * captures no stack.
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

// -----------------------------------------------------------------------------
// compiled messages
// -----------------------------------------------------------------------------

// How decoding a field went: its value is stored, or the occurrence is kept as
// an unknown field, after it was read or before, when its wire type is not the
// field's.
const STORED = 0
const KEEP = 1
const SKIP = 2

type FieldReader = (r: Input, target: any, wireType: number, depth: number) => number
type FieldWriter = (w: ProtobufWriter.ProtobufWriter, message: any, depth: number, options: EncodeOptions) => void

interface Compiled {
  readonly descriptor: D.MessageDescriptor
  // Creates an empty value: implicit-presence fields hold their zero value,
  // repeated and map fields an empty array and record.
  create: () => any
  // Readers by field number, as an array unless the numbers are large.
  table: Array<FieldReader | undefined>
  byNumber: Map<number, FieldReader>
  // Field writers in field-number order, with their keys for paths.
  writers: Array<FieldWriter>
  writerKeys: Array<string>
  // The keys of oneofs and their cases, checked before writing.
  oneofs: Array<{ readonly key: string; readonly cases: ReadonlySet<string> }>
  required: Array<D.FieldDescriptor>
}

const cache = new WeakMap<D.MessageDescriptor, Compiled>()

// Messages are registered before their fields are compiled, so that recursive
// messages refer to themselves.
const compile = (descriptor: D.MessageDescriptor): Compiled => {
  const cached = cache.get(descriptor)
  if (cached !== undefined) return cached
  const out: Compiled = {
    descriptor,
    create: () => ({}),
    table: [],
    byNumber: new Map(),
    writers: [],
    writerKeys: [],
    oneofs: [],
    required: []
  }
  cache.set(descriptor, out)
  const fields = descriptor.fields
  const keys: Array<string> = []
  const zeros: Array<() => unknown> = []
  for (const field of fields) {
    out.byNumber.set(field.number, fieldReader(field))
    const zero = zeroOf(field)
    if (zero !== undefined) {
      keys.push(field.localName)
      zeros.push(zero)
    }
    if (field.kind === "singular" && field.presence === "required") out.required.push(field)
  }
  const max = fields.reduce((max, field) => Math.max(max, field.number), 0)
  if (max <= 1024) {
    out.table = new Array(max + 1).fill(undefined)
    for (const [number, reader] of out.byNumber) out.table[number] = reader
  }
  out.create = () => {
    const value: any = {}
    for (let i = 0; i < keys.length; i++) value[keys[i]] = zeros[i]()
    return value
  }
  for (const field of [...fields].sort((a, b) => a.number - b.number)) {
    out.writers.push(fieldWriter(field))
    out.writerKeys.push(field.oneof?.localName ?? field.localName)
  }
  for (const oneof of descriptor.oneofs) {
    out.oneofs.push({ key: oneof.localName, cases: new Set(oneof.fields.map((field) => field.localName)) })
  }
  return out
}

// The value of a field in an empty message, or `undefined` for a field that
// is left out.
const zeroOf = (field: D.FieldDescriptor): (() => unknown) | undefined => {
  switch (field.kind) {
    case "list":
      return () => []
    case "map":
      return () => ({})
    case "singular": {
      if (field.presence !== "implicit" || field.oneof !== undefined) return undefined
      const type = field.type
      if (type.kind === "enum") {
        const zero = type.enum.open ? 0 : type.enum.values[0].number
        return () => zero
      }
      if (type.kind === "message") return undefined
      if (type.scalar === "bytes") return () => new Uint8Array(0)
      const zero = scalarZero(type)
      return () => zero
    }
  }
}

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

// -----------------------------------------------------------------------------
// scalars
// -----------------------------------------------------------------------------

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

const scalarReader = (type: D.ScalarValueType): (r: Input) => unknown => {
  switch (type.scalar) {
    case "double":
      return (r) => r.double()
    case "float":
      return (r) => r.float()
    case "int32":
      return (r) => r.int32()
    case "uint32":
      return (r) => r.uint32()
    case "sint32":
      return (r) => r.sint32()
    case "fixed32":
      return (r) => r.fixed32()
    case "sfixed32":
      return (r) => r.sfixed32()
    case "bool":
      return (r) => r.bool()
    case "bytes":
      return (r) => r.bytes()
    case "string":
      return type.validateUtf8 ? (r) => r.string() : (r) => {
        const bytes = delimitedView(r)
        return Utf8.decodeLax(bytes, 0, bytes.length)
      }
    case "int64":
      return int64Reader(type, (r) => r.int64(), (r) => r.int64Number())
    case "uint64":
      return int64Reader(type, (r) => r.uint64(), (r) => r.uint64Number())
    case "sint64":
      return int64Reader(type, (r) => r.sint64(), (r) => r.sint64Number())
    case "fixed64":
      return int64Reader(type, (r) => r.fixed64(), (r) => r.fixed64Number())
    case "sfixed64":
      return int64Reader(type, (r) => r.sfixed64(), (r) => r.sfixed64Number())
  }
}

const int64Reader = (
  type: D.ScalarValueType,
  bigint: (r: Input) => bigint,
  number: (r: Input) => number
): (r: Input) => unknown => {
  switch (type.jsType) {
    case "bigint":
      return bigint
    case "number":
      return number
    case "string":
      return (r) => String(bigint(r))
  }
}

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

type ScalarWriter = (w: ProtobufWriter.ProtobufWriter, value: unknown) => void

const scalarWriter = (scalar: D.ScalarType): ScalarWriter => {
  switch (scalar) {
    case "double":
      return (w, v) => w.double(typeof v === "number" ? v : expected("a number for a double", v))
    case "float":
      return (w, v) => w.float(float(v))
    case "int32":
      return (w, v) => w.int32(int32(scalar, v))
    case "sint32":
      return (w, v) => w.sint32(int32(scalar, v))
    case "sfixed32":
      return (w, v) => w.sfixed32(int32(scalar, v))
    case "uint32":
      return (w, v) => w.uint32(uint32(scalar, v))
    case "fixed32":
      return (w, v) => w.fixed32(uint32(scalar, v))
    case "int64":
    case "uint64":
      return (w, v) => w.int64(toInt64(scalar, v))
    case "sint64":
      return (w, v) => w.sint64(toInt64(scalar, v))
    case "fixed64":
    case "sfixed64":
      return (w, v) => w.fixed64(toInt64(scalar, v))
    case "bool":
      return (w, v) => w.bool(typeof v === "boolean" ? v : expected("a boolean", v))
    case "string":
      return (w, v) => w.string(typeof v === "string" ? v : expected("a string", v))
    case "bytes":
      return (w, v) => w.bytes(v instanceof Uint8Array ? v : expected("a Uint8Array", v))
  }
}

const float = (v: unknown): number =>
  typeof v === "number" && !(Number.isFinite(v) && Math.abs(v) > FLOAT32_MAX)
    ? v
    : expected("a number in the range of a float", v)

const enumWriter: ScalarWriter = (w, v) => w.int32(int32("int32", v))

// Whether an implicit-presence value is its zero value, which is not
// written. -0 is written, as other implementations write it.
const isZero = (type: D.ScalarValueType | D.EnumValueType): (value: unknown) => boolean => {
  if (type.kind === "enum") return (v) => v === 0
  switch (type.scalar) {
    case "double":
    case "float":
      return (v) => v === 0 && 1 / v > 0
    case "bool":
      return (v) => v === false
    case "string":
      return (v) => v === ""
    case "bytes":
      return (v) => v instanceof Uint8Array && v.length === 0
    default:
      return is64Bit(type.scalar) ? (v) => v === 0 || v === BIGINT_ZERO || v === "0" : (v) => v === 0
  }
}

// The bytes of a length-delimited value, without a copy.
const delimitedView = (r: Input): Uint8Array => {
  r.enter()
  const start = r.offset
  r.leave()
  return r.input.subarray(start, r.offset)
}

// -----------------------------------------------------------------------------
// decode
// -----------------------------------------------------------------------------

class Input extends ProtobufReader.ProtobufReader {
  readonly input: Uint8Array
  readonly keepUnknown: boolean
  readonly maxDepth: number
  // Fields that the last field read leaves for the unknown fields, such as
  // the unknown numbers of a packed closed enum.
  extra: Array<Uint8Array> | undefined = undefined
  // Messages with required fields, checked once all occurrences are merged.
  pending: Array<readonly [Compiled, any]> | undefined = undefined

  constructor(input: Uint8Array, options: DecodeOptions | undefined) {
    super(input)
    this.input = input
    this.keepUnknown = options?.readUnknownFields !== false
    this.maxDepth = options?.maxDepth ?? DEFAULT_MAX_DEPTH
  }
}

/** @internal */
export const decode = (
  descriptor: D.MessageDescriptor,
  bytes: Uint8Array,
  options: DecodeOptions | undefined
): Result.Result<Record<string, unknown>, Failure> => {
  try {
    const compiled = compile(descriptor)
    const r = new Input(bytes, options)
    const value = compiled.create()
    readFields(r, compiled, value, undefined, 0)
    if (r.pending !== undefined) checkRequired(r.pending)
    return Result.succeed(value)
  } catch (e) {
    return Result.fail(toFailure(e))
  }
}

const toFailure = (e: unknown): Failure => {
  if (e instanceof Failure) return e
  if (e instanceof ProtobufReader.ProtobufReaderError) return new Failure(e.message)
  throw e
}

const checkRequired = (pending: ReadonlyArray<readonly [Compiled, any]>): void => {
  for (const [compiled, value] of pending) {
    for (const field of compiled.required) {
      if (value[field.localName] === undefined) {
        fail(`Expected required field ${field.name} of ${compiled.descriptor.typeName}`)
      }
    }
  }
}

// Reads the fields of a message into `target` up to the end of the reader, or
// up to the end group tag of field `group`.
const readFields = (r: Input, compiled: Compiled, target: any, group: number | undefined, depth: number): void => {
  if (depth > r.maxDepth) fail(`Expected messages nested at most ${r.maxDepth} deep`)
  const table = compiled.table
  const byNumber = compiled.byNumber
  let unknown: Array<Uint8Array> | undefined
  // The number of the field being read, for the path of a failure.
  let reading = -1
  try {
    while (true) {
      // A message ends with its bytes, and a group with its end group tag.
      if (group === undefined && r.isDone()) break
      const start = r.offset
      const tag = r.tag()
      const wireType = tag & 7
      const number = tag >>> 3
      if (wireType === WireType.EndGroup) {
        if (number === group) break
        fail(`Expected a start group tag before the end group tag of field ${number}`)
      }
      const read = number < table.length ? table[number] : byNumber.get(number)
      let status = SKIP
      if (read !== undefined) {
        reading = number
        status = read(r, target, wireType, depth)
        reading = -1
      }
      if (status === SKIP) r.skip(tag)
      if (status !== STORED && r.keepUnknown) (unknown ??= []).push(r.input.subarray(start, r.offset))
      if (r.extra !== undefined) {
        if (r.keepUnknown) (unknown ??= []).push(...r.extra)
        r.extra = undefined
      }
    }
  } catch (e) {
    if (reading === -1) throw e
    rethrow(e, numberKey(compiled, reading))
  }
  if (unknown !== undefined) {
    const before = target[unknownFields]
    target[unknownFields] = Bytes.concat(before === undefined ? unknown : [before, ...unknown])
  }
  if (compiled.required.length > 0) (r.pending ??= []).push([compiled, target])
}

// The key of a field in paths: its oneof's, or its own.
const numberKey = (compiled: Compiled, number: number): string => {
  for (const field of compiled.descriptor.fields) {
    if (field.number === number) return field.oneof?.localName ?? field.localName
  }
  return String(number)
}

const readMessage = (r: Input, compiled: Compiled, target: any, group: number | undefined, depth: number): void => {
  if (group !== undefined) return readFields(r, compiled, target, group, depth + 1)
  r.enter()
  readFields(r, compiled, target, undefined, depth + 1)
  r.leave()
}

const fieldReader = (field: D.FieldDescriptor): FieldReader => {
  switch (field.kind) {
    case "singular":
      return singularReader(field)
    case "list":
      return listReader(field)
    case "map":
      return mapReader(field)
  }
}

// Reads one value of a type, given the value before, which a message merges
// into, and returns `KEEP` for an unknown number of a closed enum.
type ValueReader = (r: Input, before: unknown, depth: number) => unknown

const KEEP_VALUE = Symbol("effect/protobuf/keep")

const valueReader = (type: D.ValueType, number: number): ValueReader => {
  switch (type.kind) {
    case "scalar": {
      const read = scalarReader(type)
      return (r) => read(r)
    }
    case "enum": {
      if (type.enum.open) return (r) => r.int32()
      const numbers = new Set(type.enum.values.map((value) => value.number))
      return (r) => {
        const n = r.int32()
        return numbers.has(n) ? n : KEEP_VALUE
      }
    }
    case "message": {
      const group = type.delimited ? number : undefined
      let compiled: Compiled | undefined
      return (r, before, depth) => {
        compiled ??= compile(type.message)
        const target = before === undefined ? compiled.create() : before
        readMessage(r, compiled, target, group, depth)
        return target
      }
    }
  }
}

const singularReader = (field: D.SingularFieldDescriptor): FieldReader => {
  const wireType = wireTypeOf(field.type)
  const read = valueReader(field.type, field.number)
  const merges = field.type.kind === "message"
  const oneof = field.oneof
  if (oneof !== undefined) {
    const key = oneof.localName
    const tag = field.localName
    return (r, target, actual, depth) => {
      if (actual !== wireType) return SKIP
      const current = target[key]
      const before = merges && current !== undefined && current._tag === tag ? current.value : undefined
      const value = read(r, before, depth)
      if (value === KEEP_VALUE) return KEEP
      target[key] = { _tag: tag, value }
      return STORED
    }
  }
  const key = field.localName
  return (r, target, actual, depth) => {
    if (actual !== wireType) return SKIP
    const value = read(r, merges ? target[key] : undefined, depth)
    if (value === KEEP_VALUE) return KEEP
    target[key] = value
    return STORED
  }
}

const listReader = (field: D.ListFieldDescriptor): FieldReader => {
  const key = field.localName
  const type = field.type
  const wireType = wireTypeOf(type)
  const read = valueReader(type, field.number)
  const readPacked = type.kind === "message" ? undefined : packedReader(type, field.number)
  return (r, target, actual, depth) => {
    const list = target[key]
    if (actual === WireType.Len && readPacked !== undefined) {
      readPacked(r, list)
      return STORED
    }
    if (actual !== wireType) return SKIP
    let value: unknown
    try {
      value = read(r, undefined, depth)
    } catch (e) {
      rethrow(e, list.length)
    }
    if (value === KEEP_VALUE) return KEEP
    list.push(value)
    return STORED
  }
}

// Reads the elements of a packed field, after its tag.
const packedReader = (
  type: D.ScalarValueType | D.EnumValueType,
  number: number
): ((r: Input, list: Array<unknown>) => void) | undefined => {
  if (type.kind === "enum") {
    const numbers = type.enum.open ? undefined : new Set(type.enum.values.map((value) => value.number))
    return (r, list) => {
      r.enter()
      while (!r.isDone()) {
        const n = r.int32()
        if (numbers === undefined || numbers.has(n)) list.push(n)
        // The unknown numbers of a closed enum are kept as unpacked fields.
        else (r.extra ??= []).push(ProtobufWriter.make().tag(number, WireType.Varint).int32(n).finish())
      }
      r.leave()
    }
  }
  const wireType = wireTypeOf(type)
  // Strings and bytes are never packed.
  if (wireType === WireType.Len) return undefined
  if (type.scalar === "double" || type.scalar === "float") {
    // Floats are read together through one view of their bytes, which is
    // faster than a read per element.
    const size = type.scalar === "double" ? 8 : 4
    return (r, list) => {
      const bytes = delimitedView(r)
      const length = bytes.length - bytes.length % size
      if (length !== bytes.length) fail(`Expected a complete value at offset ${r.offset - bytes.length + length}`)
      const view = new DataView(bytes.buffer, bytes.byteOffset, length)
      if (size === 8) { for (let p = 0; p < length; p += 8) list.push(view.getFloat64(p, true)) }
      else for (let p = 0; p < length; p += 4) list.push(view.getFloat32(p, true))
    }
  }
  const read = scalarReader(type)
  return (r, list) => {
    r.enter()
    while (!r.isDone()) list.push(read(r))
    r.leave()
  }
}

const mapReader = (field: D.MapFieldDescriptor): FieldReader => {
  const key = field.localName
  const keyWireType = wireTypeOf(field.key)
  const readKey = mapKeyReader(field.key)
  const valueWireType = wireTypeOf(field.type)
  const readValue = valueReader(field.type, 2)
  const valueZero = field.type.kind === "message" ? undefined : field.type.kind === "enum"
    ? (field.type.enum.open ? 0 : field.type.enum.values[0].number)
    : scalarZero(field.type)
  const message = field.type.kind === "message" ? field.type.message : undefined
  const keyZero = mapKeyZero(field.key)
  return (r, target, actual, depth) => {
    if (actual !== WireType.Len) return SKIP
    let k: string | undefined
    let value: unknown = undefined
    let keep = false
    r.enter()
    while (!r.isDone()) {
      const tag = r.tag()
      const number = tag >>> 3
      const wireType = tag & 7
      if (number === 1 && wireType === keyWireType) {
        k = readKey(r)
      } else if (number === 2 && wireType === valueWireType) {
        try {
          value = readValue(r, value, depth)
        } catch (e) {
          rethrow(e, k ?? keyZero)
        }
        if (value === KEEP_VALUE) {
          // An entry with an unknown number of a closed enum is kept whole.
          keep = true
          value = undefined
        }
      } else {
        r.skip(tag)
      }
    }
    r.leave()
    if (keep) return KEEP
    if (value === undefined) value = message === undefined ? fresh(valueZero) : compile(message).create()
    InternalRecord.assignProperty(target[key], k ?? keyZero, value)
    return STORED
  }
}

const fresh = (zero: unknown): unknown => zero instanceof Uint8Array ? new Uint8Array(0) : zero

// Map keys are held as strings, as in JSON: 64-bit integers in decimal, and
// booleans as `"true"` and `"false"`.
const mapKeyReader = (type: D.ScalarValueType): (r: Input) => string => {
  if (type.scalar === "string") return scalarReader(type) as (r: Input) => string
  const read = scalarReader({ ...type, jsType: "bigint" })
  return (r) => String(read(r))
}

const mapKeyZero = (type: D.ScalarValueType): string => {
  switch (type.scalar) {
    case "string":
      return ""
    case "bool":
      return "false"
    default:
      return "0"
  }
}

// -----------------------------------------------------------------------------
// encode
// -----------------------------------------------------------------------------

/** @internal */
export const encode = (
  descriptor: D.MessageDescriptor,
  message: unknown,
  options: EncodeOptions | undefined
): Result.Result<Uint8Array<ArrayBuffer>, Failure> => {
  try {
    const w = ProtobufWriter.make()
    writeFields(w, compile(descriptor), message, 0, options ?? NO_OPTIONS)
    return Result.succeed(w.finish())
  } catch (e) {
    return Result.fail(toFailure(e))
  }
}

const NO_OPTIONS: EncodeOptions = {}

const writeFields = (
  w: ProtobufWriter.ProtobufWriter,
  compiled: Compiled,
  message: any,
  depth: number,
  options: EncodeOptions
): void => {
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH
  if (depth > maxDepth) fail(`Expected messages nested at most ${maxDepth} deep`)
  if (typeof message !== "object" || message === null || Array.isArray(message)) {
    expected(`an object for ${compiled.descriptor.typeName}`, message)
  }
  const oneofs = compiled.oneofs
  for (let i = 0; i < oneofs.length; i++) {
    const { cases, key } = oneofs[i]
    const value = message[key]
    if (value !== undefined && (typeof value !== "object" || value === null || !cases.has(value._tag))) {
      rethrow(new Failure(`Expected a case of oneof ${key}, got ${show(value?._tag ?? value)}`), key)
    }
  }
  const writers = compiled.writers
  let i = 0
  try {
    for (; i < writers.length; i++) writers[i](w, message, depth, options)
  } catch (e) {
    rethrow(e, compiled.writerKeys[i])
  }
  if (options.writeUnknownFields !== false) {
    const unknown = message[unknownFields]
    if (unknown !== undefined) {
      if (!(unknown instanceof Uint8Array)) expected("a Uint8Array of unknown fields", unknown)
      w.raw(unknown)
    }
  }
}

const fieldWriter = (field: D.FieldDescriptor): FieldWriter => {
  switch (field.kind) {
    case "singular":
      return singularWriter(field)
    case "list":
      return listWriter(field)
    case "map":
      return mapWriter(field)
  }
}

// Writes a value of a type with its tag.
type ValueWriter = (w: ProtobufWriter.ProtobufWriter, value: unknown, depth: number, options: EncodeOptions) => void

const valueWriter = (type: D.ValueType, number: number): ValueWriter => {
  switch (type.kind) {
    case "scalar": {
      const write = scalarWriter(type.scalar)
      const wireType = wireTypeOf(type)
      return (w, v) => write(w.tag(number, wireType as ProtobufWriter.WireType), v)
    }
    case "enum":
      return (w, v) => enumWriter(w.tag(number, WireType.Varint), v)
    case "message": {
      let compiled: Compiled | undefined
      if (type.delimited) {
        return (w, v, depth, options) => {
          compiled ??= compile(type.message)
          w.tag(number, WireType.StartGroup)
          writeFields(w, compiled, v, depth + 1, options)
          w.tag(number, WireType.EndGroup)
        }
      }
      return (w, v, depth, options) => {
        compiled ??= compile(type.message)
        w.tag(number, WireType.Len).fork()
        writeFields(w, compiled, v, depth + 1, options)
        w.join()
      }
    }
  }
}

const singularWriter = (field: D.SingularFieldDescriptor): FieldWriter => {
  const write = valueWriter(field.type, field.number)
  const oneof = field.oneof
  if (oneof !== undefined) {
    const key = oneof.localName
    const tag = field.localName
    return (w, message, depth, options) => {
      const value = message[key]
      if (value !== undefined && value._tag === tag) write(w, value.value, depth, options)
    }
  }
  const key = field.localName
  switch (field.presence) {
    case "required":
      return (w, message, depth, options) => {
        const value = message[key]
        if (value === undefined) fail(`Expected a value for required field ${field.name}`)
        write(w, value, depth, options)
      }
    case "explicit":
      return (w, message, depth, options) => {
        const value = message[key]
        if (value !== undefined) write(w, value, depth, options)
      }
    case "implicit": {
      // Messages always have explicit presence.
      const zero = isZero(field.type as D.ScalarValueType | D.EnumValueType)
      return (w, message, depth, options) => {
        const value = message[key]
        if (value !== undefined && !zero(value)) write(w, value, depth, options)
      }
    }
  }
}

const listWriter = (field: D.ListFieldDescriptor): FieldWriter => {
  const key = field.localName
  const type = field.type
  const writeList = field.packed && type.kind !== "message" ? packedWriter(type, field.number) : undefined
  const write = valueWriter(type, field.number)
  return (w, message, depth, options) => {
    const list = message[key]
    if (list === undefined) return
    if (!Array.isArray(list)) expected("an array", list)
    if (list.length === 0) return
    if (writeList !== undefined) return writeList(w, list)
    let i = 0
    try {
      for (; i < list.length; i++) write(w, list[i], depth, options)
    } catch (e) {
      rethrow(e, i)
    }
  }
}

const packedWriter = (
  type: D.ScalarValueType | D.EnumValueType,
  number: number
): ((w: ProtobufWriter.ProtobufWriter, list: ReadonlyArray<unknown>) => void) | undefined => {
  if (type.kind === "scalar" && (type.scalar === "string" || type.scalar === "bytes")) return undefined
  const write = type.kind === "enum" ? enumWriter : scalarWriter(type.scalar)
  const wireType = wireTypeOf(type)
  const size = wireType === WireType.I64 ? 8 : wireType === WireType.I32 ? 4 : 0
  const floats = type.kind === "scalar" && (type.scalar === "double" || type.scalar === "float")
  return (w, list) => {
    let i = 0
    try {
      w.tag(number, WireType.Len)
      // The length of fixed-width elements is known up front.
      if (size > 0) w.uint32(list.length * size)
      else w.fork()
      if (floats) {
        // Floats are written together through one view, which is faster than
        // a write per element.
        const view = new DataView(new ArrayBuffer(list.length * size))
        if (size === 8) {
          for (; i < list.length; i++) {
            const v = list[i]
            view.setFloat64(i * 8, typeof v === "number" ? v : expected("a number for a double", v), true)
          }
        } else {
          for (; i < list.length; i++) view.setFloat32(i * 4, float(list[i]), true)
        }
        w.raw(new Uint8Array(view.buffer))
      } else {
        for (; i < list.length; i++) write(w, list[i])
      }
      if (size === 0) w.join()
    } catch (e) {
      rethrow(e, i)
    }
  }
}

const mapWriter = (field: D.MapFieldDescriptor): FieldWriter => {
  const key = field.localName
  const writeKey = mapKeyWriter(field.key)
  const writeValue = valueWriter(field.type, 2)
  const number = field.number
  return (w, message, depth, options) => {
    const record = message[key]
    if (record === undefined) return
    if (typeof record !== "object" || record === null || Array.isArray(record)) expected("a record", record)
    for (const k of Object.keys(record)) {
      try {
        w.tag(number, WireType.Len).fork()
        writeKey(w, k)
        writeValue(w, record[k], depth, options)
        w.join()
      } catch (e) {
        rethrow(e, k)
      }
    }
  }
}

// Writes the key field of a map entry from its string.
const mapKeyWriter = (type: D.ScalarValueType): (w: ProtobufWriter.ProtobufWriter, key: string) => void => {
  const write = scalarWriter(type.scalar)
  const wireType = wireTypeOf(type) as ProtobufWriter.WireType
  switch (type.scalar) {
    case "string":
      return (w, k) => write(w.tag(1, wireType), k)
    case "bool":
      return (w, k) =>
        write(w.tag(1, wireType), k === "true" ? true : k === "false" ? false : expected("a boolean key", k))
    default: {
      const big = is64Bit(type.scalar)
      return (w, k) => {
        if (!/^-?[0-9]+$/.test(k)) expected(`an integer key for ${a(type.scalar)}`, k)
        write(w.tag(1, wireType), big ? k : Number(k))
      }
    }
  }
}

// -----------------------------------------------------------------------------
// extensions
// -----------------------------------------------------------------------------

// A MessageSet item: `repeated group Item = 1 { required int32 type_id = 2;
// required bytes message = 3; }`.
const ITEM_START = 1 * 8 + WireType.StartGroup
const ITEM_END = 1 * 8 + WireType.EndGroup

// Splits the unknown fields of a message into the occurrences of an
// extension, which decode into a holder, and the rest.
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
      const payload = readItem(r, bytes, number)
      if (payload === undefined) rest.push(bytes.subarray(start, r.offset))
      // The payload is the message, which is read as an occurrence of a
      // length-delimited field.
      else own.push(ProtobufWriter.make().tag(number, WireType.Len).bytes(payload).finish())
      continue
    }
    r.skip(tag)
    ;(!messageSet && tag >>> 3 === number ? own : rest).push(bytes.subarray(start, r.offset))
  }
  return { own, rest }
}

// Reads the rest of a MessageSet item after its start tag, and returns its
// message bytes when its type id is `typeId`.
const readItem = (r: ProtobufReader.ProtobufReader, input: Uint8Array, typeId: number): Uint8Array | undefined => {
  let id: number | undefined
  let payload: Uint8Array | undefined
  while (true) {
    const tag = r.tag()
    if (tag === ITEM_END) break
    if (tag === 2 * 8 + WireType.Varint) {
      id = r.uint32()
    } else if (tag === 3 * 8 + WireType.Len) {
      r.enter()
      const start = r.offset
      r.leave()
      payload = input.subarray(start, r.offset)
    } else {
      r.skip(tag)
    }
  }
  return id === typeId ? payload ?? new Uint8Array(0) : undefined
}

// A message of one field, the extension, which its occurrences decode into.
const holderOf = (extension: D.ExtensionDescriptor): Compiled => {
  const cached = holders.get(extension)
  if (cached !== undefined) return cached
  const descriptor = { ...extension.extendee, fields: [extension.field], oneofs: [] }
  const compiled = compile(descriptor)
  holders.set(extension, compiled)
  return compiled
}

const holders = new WeakMap<D.ExtensionDescriptor, Compiled>()

/** @internal */
export const getExtension = (
  message: unknown,
  extension: D.ExtensionDescriptor
): Result.Result<unknown, Failure> => {
  try {
    const { own } = splitExtension(message, extension)
    const field = extension.field
    if (own.length === 0) return Result.succeed(field.kind === "list" ? [] : undefined)
    const r = new Input(Bytes.concat(own), undefined)
    const target = holderOf(extension).create()
    readFields(r, holderOf(extension), target, undefined, 0)
    if (r.pending !== undefined) checkRequired(r.pending)
    return Result.succeed(target[field.localName])
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
    const { rest } = splitExtension(message, extension)
    const chunks = [...rest]
    if (value !== undefined) {
      const w = ProtobufWriter.make()
      writeFields(w, holderOf(extension), { [extension.field.localName]: value }, 0, NO_OPTIONS)
      const encoded = w.finish()
      chunks.push(
        extension.extendee.messageSetWireFormat ? messageSetItem(extension.field.number, encoded) : encoded
      )
    }
    const out: Record<PropertyKey, unknown> = { ...message }
    if (chunks.length === 0) delete out[unknownFields]
    else out[unknownFields] = Bytes.concat(chunks)
    return Result.succeed(out)
  } catch (e) {
    return Result.fail(toFailure(e))
  }
}

// The item of a message extension of a MessageSet, from the bytes of its
// field.
const messageSetItem = (typeId: number, field: Uint8Array): Uint8Array<ArrayBuffer> => {
  const r = ProtobufReader.make(field)
  r.tag()
  const payload = r.bytes()
  return ProtobufWriter.make()
    .tag(1, WireType.StartGroup)
    .tag(2, WireType.Varint).uint32(typeId)
    .tag(3, WireType.Len).bytes(payload)
    .tag(1, WireType.EndGroup)
    .finish()
}
