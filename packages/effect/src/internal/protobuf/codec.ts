// Encodes and decodes values of the encoded side of a schema, as described by
// its layout. `Protobuf.toCodec` wraps this in a schema transformation.

import * as DateTime from "../../DateTime.ts"
import * as Duration_ from "../../Duration.ts"
import * as Option from "../../Option.ts"
import * as Predicate from "../../Predicate.ts"
import {
  type Absent,
  BOX_VALUE,
  type Case,
  type EnumLayout,
  type Field,
  is64Bit,
  isPackable,
  isUnsigned,
  type Message,
  type MessageLayout,
  type Oneof,
  type Root,
  type ScalarLayout,
  type ScalarName,
  type Slot,
  TUPLE_REST,
  type ValueLayout,
  type WktName
} from "./layout.ts"
import {
  BIGINT_MAX_SAFE,
  BIGINT_NANOS_PER_MILLI,
  BIGINT_NANOS_PER_SECOND,
  BIGINT_ZERO,
  FLOAT32_MAX,
  INT64_MAX,
  INT64_MIN,
  int64FromHalves,
  isInt32,
  isUint32,
  MAX_DEPTH,
  Reader,
  readTag,
  splitBigInt64,
  UINT64_MAX,
  uint64FromHalves,
  WIRE_EGROUP,
  WIRE_I32,
  WIRE_I64,
  WIRE_LEN,
  WIRE_SGROUP,
  WIRE_VARINT,
  WireError,
  Writer
} from "./wire.ts"

function matchCase(oneof: Oneof, value: unknown): Case | undefined {
  const discriminator = oneof.discriminator
  if (discriminator !== undefined) {
    return Predicate.isObject(value)
      ? discriminator.cases.get((value as Record<string, unknown>)[discriminator.key])
      : undefined
  }
  for (const c of oneof.cases) {
    if (c.guard(value)) return c
  }
  return undefined
}

// Rethrows a wire error with the slot it occurred in prepended to its path.
function rethrowAt(e: unknown, key: PropertyKey | undefined): never {
  if (e instanceof WireError && key !== undefined && key !== BOX_VALUE && key !== TUPLE_REST) e.path.unshift(key)
  throw e
}

/** @internal */
export interface Codec {
  readonly encode: (value: unknown) => Uint8Array<ArrayBuffer>
  readonly decode: (bytes: Uint8Array) => unknown
}

// Compiles the encoder and decoder of a root layout. Both are synchronous and
// throw a `WireError` for malformed input.
/** @internal */
export function makeCodec(root: Root): Codec {
  switch (root._tag) {
    case "Void":
      return {
        encode: () => new Writer().finish(),
        // An empty message: its fields are skipped, but must be well-formed.
        decode: (bytes) => {
          const r = new Reader(bytes)
          while (r.pos < bytes.length) {
            const tag = readTag(r)
            r.skip(tag & 7, tag >>> 3, 0)
          }
          return root.value
        }
      }
    case "Message": {
      const encoder = encoderFor(root.message)
      const decoder = decoderFor(root.message)
      return {
        encode: (value) => {
          const w = new Writer()
          encodeMessage(encoder, value, w)
          return w.finish()
        },
        decode: (bytes) => decodeRoot(decoder, bytes)
      }
    }
    case "Wkt":
      return {
        encode: (value) => {
          const w = new Writer()
          encodeWkt(root.wkt, value, w, 0)
          return w.finish()
        },
        decode: (bytes) => decodeWkt(root.wkt, new Reader(bytes), bytes.length, 0, undefined)
      }
    case "Wrapper":
      return {
        encode: (value) => {
          const w = new Writer()
          encodeWrapper(root.scalar, value, w)
          return w.finish()
        },
        decode: (bytes) => decodeWrapper(root.scalar, new Reader(bytes), bytes.length, 0, undefined)
      }
  }
}

// -----------------------------------------------------------------------------
// encode
// -----------------------------------------------------------------------------

// Writes one slot of a message from the message's value. `cases` holds the
// case of each oneof.
type SlotWriter = (container: unknown, w: Writer, cases: ReadonlyArray<Case | undefined> | undefined) => void

// Writes a value with its tag.
type ValueWriter = (value: unknown, w: Writer) => void

interface MessageEncoder {
  readonly message: Message
  // In field-number order.
  writers: ReadonlyArray<SlotWriter>
  // The key of each writer's slot in issue paths.
  keys: ReadonlyArray<PropertyKey | undefined>
}

const encoders = new WeakMap<Message, MessageEncoder>()

function encoderFor(message: Message): MessageEncoder {
  const cached = encoders.get(message)
  if (cached !== undefined) return cached
  const encoder: MessageEncoder = { message, writers: [], keys: [] }
  // Registered first, so that recursive messages resolve to this encoder.
  encoders.set(message, encoder)
  encoder.writers = message.sorted.map((slot) => slotWriter(message, slot))
  encoder.keys = message.sorted.map((slot) =>
    slot._tag === "Case" ? slot.oneof.key : slot.kind === "rest" ? undefined : slot.key
  )
  return encoder
}

// The value a slot of `message` holds in `container`.
function slotValue(message: Message, container: unknown, key: PropertyKey): unknown {
  switch (message.shape) {
    case "struct":
      return ownValue(container as Record<PropertyKey, unknown>, key)
    case "tuple":
      return key === TUPLE_REST
        ? (container as ReadonlyArray<unknown>).slice(message.elements)
        : (container as ReadonlyArray<unknown>)[key as number]
    case "box":
      return container
  }
}

// The depth of the message being encoded, limited like the decoder limits it
// so that whatever is written can be read back.
let encodeDepth = -1

function encodeMessage(encoder: MessageEncoder, value: unknown, w: Writer): void {
  if (encodeDepth >= MAX_DEPTH) throw new WireError(`nesting deeper than ${MAX_DEPTH}`)
  const message = encoder.message
  if (message.shape === "struct" && !Predicate.isObject(value)) {
    throw new WireError(`expected an object for ${message.name}`, value)
  }
  if (message.shape === "tuple" && !Array.isArray(value)) {
    throw new WireError(`expected an array for ${message.name}`, value)
  }
  let key: PropertyKey | undefined
  encodeDepth++
  try {
    // The case of each oneof, so that it is written in field-number order.
    let cases: Array<Case | undefined> | undefined
    if (message.oneofs.length > 0) {
      cases = []
      for (const oneof of message.oneofs) {
        key = oneof.key
        const v = present(oneof, slotValue(message, value, key))
        const c = v === undefined ? undefined : matchCase(oneof, v)
        if (v !== undefined && c === undefined) throw new WireError("value matches no oneof case", v)
        cases.push(c)
      }
    }
    const writers = encoder.writers
    const keys = encoder.keys
    for (let i = 0; i < writers.length; i++) {
      key = keys[i]
      writers[i](value, w, cases)
    }
    if (message.unknown !== undefined) {
      key = message.unknown.key
      const bytes = ownValue(value as Record<PropertyKey, unknown>, key)
      if (bytes !== undefined) {
        if (!(bytes instanceof Uint8Array)) throw new WireError("expected the bytes of unknown fields", bytes)
        w.raw(bytes)
      }
    }
  } catch (e) {
    rethrowAt(e, key)
  } finally {
    encodeDepth--
  }
}

function unwrapCase(key: string, member: unknown): unknown {
  return (member as Record<string, unknown>)[key]
}

// The value of an explicit-presence slot, or `undefined` when it is absent.
// `null` is absent only for a nullable slot; elsewhere it is a value, such as
// the `null_value` of a `google.protobuf.Value`.
function present(slot: Field | Oneof, value: unknown): unknown {
  if (value === null && slot.nullAbsent) return undefined
  if (slot.absent === "none" && value !== undefined) {
    if (!Option.isOption(value)) throw new WireError("expected an Option", value)
    return Option.isSome(value) ? value.value : undefined
  }
  return value
}

function slotWriter(message: Message, slot: Slot): SlotWriter {
  if (slot._tag === "Case") {
    const oneof = slot.oneof
    const key = oneof.key
    const unwrap = slot.unwrap
    const writeValue = valueWriter(slot.number, slot.type, slot.delimited)
    return (container, w, cases) => {
      if (cases![oneof.index] !== slot) return
      const v = present(oneof, slotValue(message, container, key))
      writeValue(unwrap === undefined ? v : unwrapCase(unwrap.key, v), w)
    }
  }
  if (slot.kind === "rest") {
    const writeEntry = entryWriter(slot)
    return (container, w) => {
      const obj = container as Record<PropertyKey, unknown>
      for (const k of slot.keysOf!(obj)) {
        if (typeof k !== "string" || message.declared.has(k) || claimedBefore(message, slot, k)) continue
        writeEntry(k, obj[k], w)
      }
    }
  }
  if (message.shape === "struct" && slot.absent !== "none" && slot.key !== "__proto__") {
    const fast = slot.kind === "singular" ? singularStructWriter(slot) : undefined
    if (fast !== undefined) return fast
  }
  const key = slot.key
  const absent = slot.absent
  switch (slot.kind) {
    case "singular": {
      const writeValue = valueWriter(slot.number, slot.type, slot.delimited)
      const skipZero = absent === "zero" && !slot.always
      const type = slot.type
      return (container, w) => {
        const v = present(slot, slotValue(message, container, key))
        if (v === undefined || (skipZero && isZero(type, v))) return
        writeValue(v, w)
      }
    }
    case "repeated": {
      const writeList = slot.packed ? packedWriter(slot) : unpackedWriter(slot)
      return (container, w) => {
        const v = present(slot, slotValue(message, container, key))
        if (v === undefined) return
        if (!Array.isArray(v)) throw new WireError("expected an array", v)
        if (v.length > 0) writeList(v, w)
      }
    }
    case "map": {
      const writeEntry = entryWriter(slot)
      return (container, w) => {
        const v = present(slot, slotValue(message, container, key))
        if (v === undefined) return
        if (!Predicate.isObject(v)) throw new WireError("expected a record", v)
        const record = v as Record<string, unknown>
        for (const k of Object.keys(record)) writeEntry(k, record[k], w)
      }
    }
  }
}

function claimedBefore(message: Message, field: Field, key: string): boolean {
  for (const other of message.rest) {
    if (other === field) return false
    if (other.keysOf!({ [key]: null }).length > 0) return true
  }
  return false
}

// Writes the elements of a non-empty list, reporting the index of a failing one.
type ListWriter = (list: ReadonlyArray<unknown>, w: Writer) => void

function unpackedWriter(field: Field): ListWriter {
  const writeValue = valueWriter(field.number, field.type, field.delimited)
  return (list, w) => {
    let i = 0
    try {
      for (; i < list.length; i++) writeValue(list[i], w)
    } catch (e) {
      rethrowAt(e, i)
    }
  }
}

function packedWriter(field: Field): ListWriter {
  const tag = field.number * 8 + WIRE_LEN
  const type = field.type
  const size = type._tag === "Scalar" ? fixedSize(type.scalar) : 0
  if (size > 0) {
    // The length of fixed-width elements is known up front.
    const scalar = type as ScalarLayout
    return (list, w) => {
      w.varint32(tag)
      w.varint32(list.length * size)
      w.ensure(list.length * size)
      let i = 0
      try {
        if (scalar.scalar === "double") {
          for (; i < list.length; i++) {
            const v = list[i]
            if (typeof v !== "number") expected("double", v)
            w.view.setFloat64(w.pos, v, true)
            w.pos += 8
          }
        } else {
          for (; i < list.length; i++) encodeScalar(scalar, list[i], w)
        }
      } catch (e) {
        rethrowAt(e, i)
      }
    }
  }
  return (list, w) => {
    w.varint32(tag)
    const start = w.begin()
    let i = 0
    try {
      if (type._tag === "Enum") {
        for (; i < list.length; i++) w.int32(enumNumber(type, list[i]))
      } else {
        for (; i < list.length; i++) encodeScalar(type as ScalarLayout, list[i], w)
      }
    } catch (e) {
      rethrowAt(e, i)
    }
    w.end(start)
  }
}

function fixedSize(scalar: ScalarName): number {
  switch (scalar) {
    case "double":
    case "fixed64":
    case "sfixed64":
      return 8
    case "float":
    case "fixed32":
    case "sfixed32":
      return 4
    default:
      return 0
  }
}

// Writes a map entry, reporting its key when it fails.
function entryWriter(field: Field): (key: string, value: unknown, w: Writer) => void {
  const tag = field.number * 8 + WIRE_LEN
  const mapKey = field.mapKey!
  const keyTag = 8 + mapKey.wireType
  const writeValue = valueWriter(2, field.type, false)
  const optionalValues = field.optionalValues
  return (key, value, w) => {
    if (value === undefined && optionalValues) return
    try {
      w.varint32(tag)
      const start = w.begin()
      w.varint32(keyTag)
      encodeScalar(mapKey, mapKeyFromString(mapKey, key), w)
      writeValue(value, w)
      w.end(start)
    } catch (e) {
      rethrowAt(e, key)
    }
  }
}

function valueWriter(number: number, type: ValueLayout, delimited: boolean): ValueWriter {
  if (delimited) {
    const encoder = encoderFor((type as MessageLayout).message)
    const start = number * 8 + WIRE_SGROUP
    const end = number * 8 + WIRE_EGROUP
    return (value, w) => {
      w.varint32(start)
      encodeMessage(encoder, value, w)
      w.varint32(end)
    }
  }
  const tag = number * 8 + type.wireType
  switch (type._tag) {
    case "Scalar":
      return (value, w) => {
        w.varint32(tag)
        encodeScalar(type, value, w)
      }
    case "Enum":
      return (value, w) => {
        w.varint32(tag)
        w.int32(enumNumber(type, value))
      }
    case "Symbol":
      return (value, w) => {
        w.varint32(tag)
        const key = typeof value === "symbol" ? Symbol.keyFor(value) : undefined
        if (key === undefined) throw new WireError("expected a registered symbol (Symbol.for)", value)
        w.string(key)
      }
    case "Constant":
      return (_, w) => {
        w.varint32(tag)
        w.varint32(0)
      }
    case "Message": {
      const encoder = encoderFor(type.message)
      return (value, w) => {
        w.varint32(tag)
        const start = w.begin()
        encodeMessage(encoder, value, w)
        w.end(start)
      }
    }
    case "Wkt":
      return (value, w) => {
        w.varint32(tag)
        const start = w.begin()
        encodeWkt(type.wkt, value, w, encodeDepth + 1)
        w.end(start)
      }
    case "Wrapper":
      return (value, w) => {
        w.varint32(tag)
        const start = w.begin()
        encodeWrapper(type.scalar, value, w)
        w.end(start)
      }
  }
}

// Writers for the common singular struct properties, each specialized to one
// type. A `null` or `undefined` property is absent; `skipZero` leaves out the
// zero value of an implicit-presence field.
function singularStructWriter(field: Field): SlotWriter | undefined {
  if (field.delimited) return undefined
  const key = field.key
  const tag = field.number * 8 + field.type.wireType
  const skipZero = field.absent === "zero" && !field.always
  const type = field.type
  switch (type._tag) {
    case "Scalar":
      switch (type.asNumber ? undefined : type.scalar) {
        case "string":
          return (container, w) => {
            const v = (container as Record<PropertyKey, unknown>)[key]
            if (v === undefined || v === null || (skipZero && v === "")) return
            if (typeof v !== "string") expected("string", v)
            w.varint32(tag)
            w.string(v)
          }
        case "bool":
          return (container, w) => {
            const v = (container as Record<PropertyKey, unknown>)[key]
            if (v === undefined || v === null || (skipZero && v === false)) return
            if (typeof v !== "boolean") expected("bool", v)
            w.varint32(tag)
            w.varint32(v ? 1 : 0)
          }
        case "double":
          return (container, w) => {
            const v = (container as Record<PropertyKey, unknown>)[key]
            if (v === undefined || v === null || (skipZero && v === 0 && 1 / v > 0)) return
            if (typeof v !== "number") expected("double", v)
            w.varint32(tag)
            w.double(v)
          }
        case "int32":
          return (container, w) => {
            const v = (container as Record<PropertyKey, unknown>)[key]
            if (v === undefined || v === null || (skipZero && v === 0)) return
            if (typeof v !== "number" || !isInt32(v)) expected("int32", v)
            w.varint32(tag)
            w.int32(v)
          }
        case "uint32":
          return (container, w) => {
            const v = (container as Record<PropertyKey, unknown>)[key]
            if (v === undefined || v === null || (skipZero && v === 0)) return
            if (typeof v !== "number" || !isUint32(v)) expected("uint32", v)
            w.varint32(tag)
            w.varint32(v)
          }
        case "bytes":
          return undefined
        default:
          return (container, w) => {
            const v = (container as Record<PropertyKey, unknown>)[key]
            if (v === undefined || v === null || (skipZero && isScalarZero(type, v))) return
            w.varint32(tag)
            encodeScalar(type, v, w)
          }
      }
    case "Enum":
      return (container, w) => {
        const v = (container as Record<PropertyKey, unknown>)[key]
        if (v === undefined || v === null) return
        const n = enumNumber(type, v)
        if (skipZero && n === 0) return
        w.varint32(tag)
        w.int32(n)
      }
    case "Message": {
      const encoder = encoderFor(type.message)
      return (container, w) => {
        const v = (container as Record<PropertyKey, unknown>)[key]
        if (v === undefined || v === null) return
        w.varint32(tag)
        const start = w.begin()
        encodeMessage(encoder, v, w)
        w.end(start)
      }
    }
    default:
      return undefined
  }
}

function encodeWrapper(scalar: ScalarLayout, value: unknown, w: Writer): void {
  if (isScalarZero(scalar, value)) return
  w.tag(1, scalar.wireType)
  encodeScalar(scalar, value, w)
}

function enumNumber(type: EnumLayout, value: unknown): number {
  const n = type.toNumber === undefined ? value : type.toNumber.get(value)
  if (typeof n !== "number" || !isInt32(n)) throw new WireError("expected an enum value", value)
  return n
}

function isZero(type: ValueLayout, value: unknown): boolean {
  switch (type._tag) {
    case "Scalar":
      return isScalarZero(type, value)
    case "Enum":
      return enumNumber(type, value) === 0
    default:
      return false
  }
}

function isScalarZero(type: ScalarLayout, value: unknown): boolean {
  switch (type.scalar) {
    case "bool":
      return value === false
    case "string":
      return value === ""
    case "bytes":
      return value instanceof Uint8Array && value.length === 0
    case "double":
    case "float":
      // -0 is written, as other implementations do
      return value === 0 && 1 / value > 0
    default:
      // A 64-bit integer is a bigint, or also a number when it is represented
      // as one, as `split64` accepts.
      return is64Bit(type.scalar)
        ? value === BIGINT_ZERO || (type.asNumber && value === 0)
        : value === 0
  }
}

function expected(scalar: ScalarName, value: unknown): never {
  throw new WireError(`expected a protobuf ${scalar}`, value)
}

// The unsigned 32-bit halves of the last `split64`.
const halves = { lo: 0, hi: 0 }

// Splits a 64-bit integer into `halves`, or returns `false` when the value is
// not one in the range of `type`.
function split64(type: ScalarLayout, value: unknown): boolean {
  if (typeof value === "bigint") {
    if (isUnsigned(type.scalar) ? value < BIGINT_ZERO || value > UINT64_MAX : value < INT64_MIN || value > INT64_MAX) {
      return false
    }
    splitBigInt64(value, halves)
    return true
  }
  if (!type.asNumber || typeof value !== "number" || !Number.isSafeInteger(value)) return false
  if (value < 0 && isUnsigned(type.scalar)) return false
  halves.lo = value >>> 0
  halves.hi = Math.floor(value / 4294967296) >>> 0
  return true
}

function encodeScalar(type: ScalarLayout, value: unknown, w: Writer): void {
  const scalar = type.scalar
  switch (scalar) {
    case "double":
      if (typeof value !== "number") expected(scalar, value)
      w.double(value)
      return
    case "float":
      if (typeof value !== "number" || (Number.isFinite(value) && Math.abs(value) > FLOAT32_MAX)) {
        expected(scalar, value)
      }
      w.float(value)
      return
    case "int32":
      if (typeof value !== "number" || !isInt32(value)) expected(scalar, value)
      w.int32(value)
      return
    case "sint32":
      if (typeof value !== "number" || !isInt32(value)) expected(scalar, value)
      w.varint32(((value << 1) ^ (value >> 31)) >>> 0)
      return
    case "sfixed32":
      if (typeof value !== "number" || !isInt32(value)) expected(scalar, value)
      w.sfixed32(value)
      return
    case "uint32":
      if (typeof value !== "number" || !isUint32(value)) expected(scalar, value)
      w.varint32(value)
      return
    case "fixed32":
      if (typeof value !== "number" || !isUint32(value)) expected(scalar, value)
      w.fixed32(value)
      return
    case "int64":
    case "uint64":
      if (!split64(type, value)) expected(scalar, value)
      w.varint64(halves.lo, halves.hi)
      return
    case "sint64": {
      if (!split64(type, value)) expected(scalar, value)
      const { hi, lo } = halves
      const sign = (hi | 0) >> 31
      w.varint64(((lo << 1) ^ sign) >>> 0, (((hi << 1) | (lo >>> 31)) ^ sign) >>> 0)
      return
    }
    case "fixed64":
    case "sfixed64":
      if (!split64(type, value)) expected(scalar, value)
      w.fixed64(halves.lo, halves.hi)
      return
    case "bool":
      if (typeof value !== "boolean") expected(scalar, value)
      w.varint32(value ? 1 : 0)
      return
    case "string":
      if (typeof value !== "string") expected(scalar, value)
      w.string(value)
      return
    case "bytes":
      if (!(value instanceof Uint8Array)) expected(scalar, value)
      w.bytes(value)
      return
  }
}

const INTEGER_KEY = /^-?\d+$/

function mapKeyFromString(type: ScalarLayout, key: string): unknown {
  switch (type.scalar) {
    case "string":
      return key
    case "bool":
      if (key === "true") return true
      if (key === "false") return false
      break
    case "double":
    case "float": {
      const n = Number(key)
      if (String(n) === key) return n
      break
    }
    default:
      if (!INTEGER_KEY.test(key)) break
      return is64Bit(type.scalar) && !type.asNumber ? BigInt(key) : Number(key)
  }
  throw new WireError(`expected a protobuf ${type.scalar} map key`, key)
}

// `depth` counts nesting like the decoder: the well-known type itself, and two
// levels per JSON object or array.
function encodeWkt(wkt: WktName, value: unknown, w: Writer, depth: number): void {
  if (depth > MAX_DEPTH) throw new WireError(`nesting deeper than ${MAX_DEPTH}`)
  switch (wkt) {
    case "timestamp":
    case "date": {
      const millis = wkt === "timestamp"
        ? (DateTime.isDateTime(value) ? DateTime.toEpochMillis(value) : NaN)
        : (value instanceof Date ? value.getTime() : NaN)
      if (!Number.isFinite(millis)) throw new WireError("expected a valid timestamp", value)
      const seconds = Math.floor(millis / 1000)
      writeSecondsNanos(BigInt(seconds), (millis - seconds * 1000) * 1_000_000, w)
      return
    }
    case "duration": {
      if (!Duration_.isDuration(value) || !Duration_.isFinite(value)) {
        throw new WireError("expected a finite duration", value)
      }
      const total = Duration_.toNanosUnsafe(value)
      const seconds = total / BIGINT_NANOS_PER_SECOND
      writeSecondsNanos(seconds, Number(total - seconds * BIGINT_NANOS_PER_SECOND), w)
      return
    }
    case "value":
      encodeJsonValue(value, w, depth)
      return
    case "struct":
      encodeJsonStruct(value, w, depth)
      return
    case "listValue":
      encodeJsonList(value, w, depth)
      return
  }
}

function writeSecondsNanos(seconds: bigint, nanos: number, w: Writer): void {
  if (seconds !== BIGINT_ZERO) {
    w.tag(1, WIRE_VARINT)
    splitBigInt64(seconds, halves)
    w.varint64(halves.lo, halves.hi)
  }
  if (nanos !== 0) {
    w.tag(2, WIRE_VARINT)
    w.int32(nanos)
  }
}

function encodeJsonValue(value: unknown, w: Writer, depth: number): void {
  if (depth > MAX_DEPTH) throw new WireError(`nesting deeper than ${MAX_DEPTH}`)
  switch (typeof value) {
    case "number":
      w.tag(2, WIRE_I64)
      w.double(value)
      return
    case "string":
      w.tag(3, WIRE_LEN)
      w.string(value)
      return
    case "boolean":
      w.tag(4, WIRE_VARINT)
      w.varint32(value ? 1 : 0)
      return
    case "object": {
      if (value === null) {
        w.tag(1, WIRE_VARINT)
        w.varint32(0)
        return
      }
      const isList = Array.isArray(value)
      w.tag(isList ? 6 : 5, WIRE_LEN)
      const start = w.begin()
      if (isList) encodeJsonList(value, w, depth + 1)
      else encodeJsonStruct(value, w, depth + 1)
      w.end(start)
      return
    }
  }
  throw new WireError("expected a JSON value", value)
}

function encodeJsonStruct(value: unknown, w: Writer, depth: number): void {
  if (!Predicate.isObject(value) || Array.isArray(value)) throw new WireError("expected a JSON object", value)
  const record = value as Record<string, unknown>
  for (const key of Object.keys(record)) {
    w.tag(1, WIRE_LEN)
    const entry = w.begin()
    w.tag(1, WIRE_LEN)
    w.string(key)
    w.tag(2, WIRE_LEN)
    const start = w.begin()
    try {
      encodeJsonValue(record[key], w, depth + 1)
    } catch (e) {
      rethrowAt(e, key)
    }
    w.end(start)
    w.end(entry)
  }
}

function encodeJsonList(value: unknown, w: Writer, depth: number): void {
  if (!Array.isArray(value)) throw new WireError("expected a JSON array", value)
  for (let i = 0; i < value.length; i++) {
    w.tag(1, WIRE_LEN)
    const start = w.begin()
    try {
      encodeJsonValue(value[i], w, depth + 1)
    } catch (e) {
      rethrowAt(e, i)
    }
    w.end(start)
  }
}

// -----------------------------------------------------------------------------
// decode
// -----------------------------------------------------------------------------

// Reads one value of a slot's type. `previous` is the value of an earlier
// occurrence of a message field, which is merged into.
type ValueReader = (r: Reader, wireType: number, previous: unknown, depth: number, number: number) => unknown

// Decodes one occurrence of a slot into the accumulator of its message.
type SlotReader = (
  acc: Record<PropertyKey, unknown>,
  r: Reader,
  wireType: number,
  depth: number,
  number: number
) => void

interface SlotEntry {
  readonly read: SlotReader
  // The key of the slot in issue paths.
  readonly key: PropertyKey | undefined
}

interface MessageDecoder {
  readonly message: Message
  // Slot entries by field number, or a map when the numbers are large.
  table: ReadonlyArray<SlotEntry | undefined>
  map: Map<number, SlotEntry> | undefined
  // A struct starts as a copy of its template, which holds every property
  // whose absent value can be shared. Properties in `lazy` are given a fresh
  // zero value when they are still absent at the end.
  template: Record<PropertyKey, unknown> | undefined
  lazy: Array<{ readonly key: PropertyKey; readonly zero: () => unknown }>
}

const decoders = new WeakMap<Message, MessageDecoder>()

function decoderFor(message: Message): MessageDecoder {
  const cached = decoders.get(message)
  if (cached !== undefined) return cached
  const decoder: MessageDecoder = { message, table: [], map: undefined, template: undefined, lazy: [] }
  // Registered first, so that recursive messages resolve to this decoder.
  decoders.set(message, decoder)
  if (message.shape === "struct") {
    const template: Record<PropertyKey, unknown> = {}
    for (const field of message.fields) {
      const key = field.key
      switch (field.absent) {
        case "zero": {
          const zero = sharedZero(field)
          setOwn(template, key, zero === LAZY ? undefined : zero)
          if (zero === LAZY) decoder.lazy.push({ key, zero: () => freshZero(field) })
          break
        }
        case "null":
          setOwn(template, key, null)
          break
        case "undefined":
          setOwn(template, key, undefined)
          break
        case "none":
          setOwn(template, key, Option.none())
          break
        case "constant":
          setOwn(template, key, field.constant)
          break
      }
    }
    for (const oneof of message.oneofs) {
      if (oneof.absent === "null") setOwn(template, oneof.key, null)
      else if (oneof.absent === "undefined") setOwn(template, oneof.key, undefined)
      else if (oneof.absent === "none") setOwn(template, oneof.key, Option.none())
    }
    for (const [k, literal] of message.literals) setOwn(template, k, literal)
    if (message.unknown !== undefined && !message.unknown.optional) setOwn(template, message.unknown.key, undefined)
    decoder.template = template
  }
  const entries = new Map<number, SlotEntry>()
  let max = 0
  for (const [number, slot] of message.byNumber) {
    const key = slot._tag === "Case" ? slot.oneof.key : slot.kind === "rest" ? undefined : slot.key
    // A `__proto__` property that is not in the template is defined before it
    // is read or written, which would otherwise reach the prototype.
    const read = key === "__proto__" && !Object.hasOwn(decoder.template ?? {}, key)
      ? ownFirst(slotReader(message, slot))
      : slotReader(message, slot)
    entries.set(number, { read, key })
    if (number > max) max = number
  }
  if (max <= 1024) {
    const table: Array<SlotEntry | undefined> = new Array(max + 1).fill(undefined)
    for (const [number, entry] of entries) table[number] = entry
    decoder.table = table
  } else {
    decoder.map = entries
  }
  return decoder
}

const LAZY = Symbol("Protobuf/lazy")

// The zero value of an implicit-presence field when it can be shared, or `LAZY`.
function sharedZero(field: Field): unknown {
  if (field.kind !== "singular") return LAZY
  const type = field.type
  switch (type._tag) {
    case "Scalar":
      return type.scalar === "bytes" ? LAZY : zeroScalar(type)
    case "Wrapper":
      return type.scalar.scalar === "bytes" ? LAZY : zeroScalar(type.scalar)
    case "Enum":
    case "Constant":
    case "Symbol":
      return zeroValue(type)
    default:
      return LAZY
  }
}

function freshZero(field: Field): unknown {
  return field.kind === "repeated" ? [] : field.kind === "map" ? {} : zeroValue(field.type)
}

// Unknown fields of messages that occurred several times, joined once when the
// outermost decode is done, so that merging occurrences stays linear.
let mergedUnknown: Map<Record<PropertyKey, unknown>, { key: PropertyKey; chunks: Array<Uint8Array> }> | undefined

function decodeRoot(decoder: MessageDecoder, bytes: Uint8Array): unknown {
  const outer = mergedUnknown
  mergedUnknown = undefined
  try {
    const out = decodeMessage(decoder, new Reader(bytes), bytes.length, undefined, 0, undefined)
    // Set while decoding, which narrowing does not see.
    const merged = mergedUnknown as typeof outer
    if (merged !== undefined) {
      for (const [acc, { chunks, key }] of merged) setOwn(acc, key, concatBytes(chunks))
    }
    return out
  } finally {
    mergedUnknown = outer
  }
}

// Decodes a message up to `end`, or up to the end group tag of field `group`.
// A message that occurred before is merged into: `previous` is its value.
function decodeMessage(
  decoder: MessageDecoder,
  r: Reader,
  end: number,
  previous: unknown,
  depth: number,
  group: number | undefined
): unknown {
  if (depth > MAX_DEPTH) throw new WireError(`nesting deeper than ${MAX_DEPTH}`)
  const message = decoder.message
  const template = decoder.template
  const acc = template === undefined
    ? accumulator(message, previous)
    : previous === undefined
    ? { ...template }
    : previous as Record<PropertyKey, unknown>
  const table = decoder.table
  const map = decoder.map
  let unknown: Array<Uint8Array> | undefined
  let key: PropertyKey | undefined
  try {
    while (true) {
      key = undefined
      if (r.pos >= end) {
        if (group !== undefined) throw new WireError("premature end of input")
        break
      }
      const start = r.pos
      // Tags of fields 1 to 15 are a single byte.
      const byte = r.buf[start]
      let tag: number
      if (byte < 0x80 && byte >= 8 && (byte & 7) <= WIRE_I32) {
        tag = byte
        r.pos = start + 1
      } else {
        tag = readTag(r)
      }
      const wireType = tag & 7
      const number = tag >>> 3
      if (wireType === WIRE_EGROUP) {
        if (number === group) break
        throw new WireError(`unexpected end group tag for field ${number}`)
      }
      const entry = map === undefined ? table[number] : map.get(number)
      if (entry === undefined) {
        r.skip(wireType, number, depth)
        if (message.unknown !== undefined) (unknown ??= []).push(r.buf.subarray(start, r.pos))
        continue
      }
      key = entry.key
      entry.read(acc, r, wireType, depth, number)
    }
    if (group === undefined && r.pos !== end) throw new WireError("field overruns its message")
  } catch (e) {
    rethrowAt(e, key)
  }
  if (template === undefined) {
    for (const [k, literal] of message.literals) acc[k] = literal
    for (const field of message.fields) {
      // The rest elements of a tuple are the array itself.
      if (field.key !== TUPLE_REST && !(field.key in acc)) fillAbsent(acc, field.key, field.absent, field)
    }
    for (const oneof of message.oneofs) {
      if (!(oneof.key in acc)) fillAbsent(acc, oneof.key, oneof.absent, undefined)
    }
  } else {
    const lazy = decoder.lazy
    for (let i = 0; i < lazy.length; i++) {
      const k = lazy[i].key
      if (acc[k] === undefined) acc[k] = lazy[i].zero()
    }
  }
  if (message.unknown !== undefined) {
    const k = message.unknown.key
    const before = ownValue(acc, k)
    if (unknown === undefined) {
      if (before === undefined && !message.unknown.optional) setOwn(acc, k, new Uint8Array(0))
    } else if (before instanceof Uint8Array) {
      // An occurrence merged into an earlier one.
      const merged = mergedUnknown ??= new Map()
      let entry = merged.get(acc)
      if (entry === undefined) merged.set(acc, entry = { key: k, chunks: [before] })
      for (let i = 0; i < unknown.length; i++) entry.chunks.push(unknown[i])
    } else {
      setOwn(acc, k, concatBytes(unknown))
    }
  }
  return template === undefined ? materialize(message, acc) : acc
}

// The slots of a message being decoded, keyed like the message's slots. A
// tuple is decoded in place: element `i` at index `i`, and the rest elements
// pushed after the elements.
function accumulator(message: Message, previous: unknown): Record<PropertyKey, unknown> {
  switch (message.shape) {
    case "struct":
      return previous === undefined ? {} : previous as Record<PropertyKey, unknown>
    case "tuple": {
      if (Array.isArray(previous) && previous.length >= message.elements) return previous as any
      const array: Array<unknown> = new Array(message.elements)
      if (Array.isArray(previous)) {
        for (let i = 0; i < previous.length; i++) array[i] = previous[i]
      }
      return array as any
    }
    case "box":
      return previous === undefined ? {} : { [BOX_VALUE]: previous }
  }
}

function materialize(message: Message, acc: Record<PropertyKey, unknown>): unknown {
  switch (message.shape) {
    case "struct":
      return acc
    case "tuple": {
      // An absent element ends the tuple, without the rest elements.
      for (let i = 0; i < message.elements; i++) {
        if (!(i in acc)) return (acc as unknown as Array<unknown>).slice(0, i)
      }
      return acc
    }
    case "box":
      return acc[BOX_VALUE]
  }
}

function concatBytes(chunks: ReadonlyArray<Uint8Array>): Uint8Array<ArrayBuffer> {
  let length = 0
  for (const chunk of chunks) length += chunk.length
  const out = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.length
  }
  return out
}

function fillAbsent(
  acc: Record<PropertyKey, unknown>,
  key: PropertyKey,
  absent: Absent,
  field: Field | undefined
): void {
  switch (absent) {
    case "zero":
      acc[key] = freshZero(field!)
      return
    case "null":
      acc[key] = null
      return
    case "undefined":
      acc[key] = undefined
      return
    case "none":
      acc[key] = Option.none()
      return
    case "constant":
      acc[key] = field!.constant
      return
  }
}

function slotReader(message: Message, slot: Slot): SlotReader {
  if (slot._tag === "Case") return caseReader(slot)
  switch (slot.kind) {
    case "singular":
      return singularReader(slot)
    case "repeated":
      return repeatedReader(slot)
    case "map": {
      const key = slot.key
      const absent = slot.absent
      const readEntry = entryReader(slot)
      return (acc, r, wireType, depth) => {
        const before = present(slot, acc[key])
        const record = (Predicate.isObject(before) ? before : {}) as Record<string, unknown>
        readEntry(record, r, wireType, depth, 0)
        acc[key] = absent === "none" ? Option.some(record) : record
      }
    }
    case "rest":
      // Keys of declared properties, and of earlier index signatures, are
      // never written to this field, and would overwrite those properties.
      return entryReader(slot, (k) => message.declared.has(k) || claimedBefore(message, slot, k))
  }
}

// The case each decoded oneof value was read as. A later occurrence of the same
// case merges into it, even when it is incomplete and fails the case's guard.
const decodedCases = new WeakMap<object, Case>()

function caseReader(slot: Case): SlotReader {
  const oneof = slot.oneof
  const key = oneof.key
  const unwrap = slot.unwrap
  const merges = mergesOccurrences(slot.type)
  const readValue = valueReader(slot.type)
  return (acc, r, wireType, depth, number) => {
    let merge: unknown = undefined
    if (merges) {
      const before = present(oneof, earlier(acc, key))
      const c = typeof before === "object" && before !== null
        ? decodedCases.get(before)
        : before === undefined
        ? undefined
        : matchCase(oneof, before)
      if (c === slot) merge = unwrap === undefined ? before : unwrapCase(unwrap.key, before)
    }
    let value = readValue(r, wireType, merge, depth, number)
    if (unwrap !== undefined) {
      const member: Record<string, unknown> = {}
      for (const [k, literal] of unwrap.literals) member[k] = literal
      member[unwrap.key] = value
      value = member
    }
    if (merges && typeof value === "object" && value !== null) decodedCases.set(value, slot)
    acc[key] = oneof.absent === "none" ? Option.some(value) : value
  }
}

// Messages, including well-known types and wrappers, merge with an earlier
// occurrence; other values replace it.
function mergesOccurrences(type: ValueLayout): boolean {
  return type._tag === "Message" || type._tag === "Wkt" || type._tag === "Wrapper"
}

// The value of an earlier occurrence, which is never an inherited property such
// as `constructor`.
function earlier(acc: Record<PropertyKey, unknown>, key: PropertyKey): unknown {
  return Object.hasOwn(acc, key) ? acc[key] : undefined
}

function singularReader(field: Field): SlotReader {
  const key = field.key
  const absent = field.absent
  const readValue = valueReader(field.type)
  if (mergesOccurrences(field.type)) {
    return (acc, r, wireType, depth, number) => {
      const value = readValue(r, wireType, present(field, earlier(acc, key)), depth, number)
      acc[key] = absent === "none" ? Option.some(value) : value
    }
  }
  if (absent === "none") {
    return (acc, r, wireType, depth, number) => {
      acc[key] = Option.some(readValue(r, wireType, undefined, depth, number))
    }
  }
  const type = field.type
  if (type._tag === "Scalar" && !type.asNumber) {
    const scalar = scalarFieldReader(key, type.scalar)
    if (scalar !== undefined) return scalar
  }
  return (acc, r, wireType, depth, number) => {
    acc[key] = readValue(r, wireType, undefined, depth, number)
  }
}

// Readers for the common scalar fields, each specialized to one type.
function scalarFieldReader(key: PropertyKey, scalar: ScalarName): SlotReader | undefined {
  switch (scalar) {
    case "string":
      return (acc, r, wireType) => {
        if (wireType !== WIRE_LEN) expectWireType(wireType, WIRE_LEN)
        acc[key] = r.string()
      }
    case "bool":
      return (acc, r, wireType) => {
        if (wireType !== WIRE_VARINT) expectWireType(wireType, WIRE_VARINT)
        r.varint64()
        acc[key] = r.lo !== 0 || r.hi !== 0
      }
    case "double":
      return (acc, r, wireType) => {
        if (wireType !== WIRE_I64) expectWireType(wireType, WIRE_I64)
        acc[key] = r.double()
      }
    case "int32":
      return (acc, r, wireType) => {
        if (wireType !== WIRE_VARINT) expectWireType(wireType, WIRE_VARINT)
        r.varint64()
        acc[key] = r.lo | 0
      }
    case "uint32":
      return (acc, r, wireType) => {
        if (wireType !== WIRE_VARINT) expectWireType(wireType, WIRE_VARINT)
        acc[key] = r.varint32()
      }
    case "int64":
      return (acc, r, wireType) => {
        if (wireType !== WIRE_VARINT) expectWireType(wireType, WIRE_VARINT)
        r.varint64()
        acc[key] = int64FromHalves(r.lo, r.hi)
      }
    default:
      return undefined
  }
}

function repeatedReader(field: Field): SlotReader {
  const key = field.key
  const absent = field.absent
  const readValue = valueReader(field.type)
  const readPacked = isPackable(field.type) ? packedReader(field.type) : undefined
  if (key === TUPLE_REST) {
    // The rest elements of a tuple, pushed onto the tuple itself.
    return (acc, r, wireType, depth, number) => {
      const list = acc as unknown as Array<unknown>
      try {
        if (wireType === WIRE_LEN && readPacked !== undefined) {
          const end = r.delimited()
          readPacked(r, end, list)
          if (r.pos !== end) throw new WireError("packed element overruns its field")
        } else {
          list.push(readValue(r, wireType, undefined, depth, number))
        }
      } catch (e) {
        rethrowAt(e, list.length)
      }
    }
  }
  if (absent !== "none") {
    // The list is stored once, on the first occurrence.
    return (acc, r, wireType, depth, number) => {
      let list = acc[key] as Array<unknown>
      if (!Array.isArray(list)) acc[key] = list = []
      try {
        if (wireType === WIRE_LEN && readPacked !== undefined) {
          const end = r.delimited()
          readPacked(r, end, list)
          if (r.pos !== end) throw new WireError("packed element overruns its field")
        } else {
          list.push(readValue(r, wireType, undefined, depth, number))
        }
      } catch (e) {
        rethrowAt(e, list.length)
      }
    }
  }
  return (acc, r, wireType, depth, number) => {
    const before = present(field, acc[key])
    const list: Array<unknown> = Array.isArray(before) ? before : []
    try {
      if (wireType === WIRE_LEN && readPacked !== undefined) {
        const end = r.delimited()
        readPacked(r, end, list)
        if (r.pos !== end) throw new WireError("packed element overruns its field")
      } else {
        list.push(readValue(r, wireType, undefined, depth, number))
      }
    } catch (e) {
      rethrowAt(e, list.length)
    }
    acc[key] = absent === "none" ? Option.some(list) : list
  }
}

// Reads a map entry into `target`, unless `skip` rejects its key.
function entryReader(field: Field, skip?: (key: string) => boolean): SlotReader {
  const mapKey = field.mapKey!
  const keyZero = zeroScalar(mapKey)
  const readKey = valueReader(mapKey)
  const readValue = valueReader(field.type)
  return (target, r, wireType, depth) => {
    expectWireType(wireType, WIRE_LEN)
    const end = r.delimited()
    let k: unknown = undefined
    let value: unknown = undefined
    while (r.pos < end) {
      const tag = readTag(r)
      if (tag >>> 3 === 1) k = readKey(r, tag & 7, undefined, depth, 1)
      else if (tag >>> 3 === 2) value = readValue(r, tag & 7, value, depth, 2)
      else r.skip(tag & 7, tag >>> 3, depth)
    }
    if (r.pos !== end) throw new WireError("map entry overruns its field")
    const key = String(k ?? keyZero)
    if (skip !== undefined && skip(key)) return
    setOwn(target, key, value === undefined ? zeroValue(field.type) : value)
  }
}

// A `__proto__` key is read and written as an own property: an assignment
// would replace the prototype, and a read would return it.

function setOwn(target: Record<PropertyKey, unknown>, key: PropertyKey, value: unknown): void {
  if (key === "__proto__") {
    Object.defineProperty(target, key, { value, writable: true, enumerable: true, configurable: true })
  } else {
    target[key] = value
  }
}

function ownValue(source: Record<PropertyKey, unknown>, key: PropertyKey): unknown {
  return key !== "__proto__" || Object.hasOwn(source, key) ? source[key] : undefined
}

function ownFirst(read: SlotReader): SlotReader {
  return (acc, r, wireType, depth, number) => {
    if (!Object.hasOwn(acc, "__proto__")) setOwn(acc, "__proto__", undefined)
    read(acc, r, wireType, depth, number)
  }
}

function expectWireType(actual: number, expected: number): void {
  if (actual !== expected) throw new WireError(`wire type ${actual} does not match the field (expected ${expected})`)
}

function valueReader(type: ValueLayout): ValueReader {
  switch (type._tag) {
    case "Scalar":
      return type.asNumber ? (r, wireType) => decodeScalarField(type, wireType, r) : SCALAR_READERS[type.scalar]
    case "Enum":
      return (r, wireType) => {
        expectWireType(wireType, WIRE_VARINT)
        r.varint64()
        return enumValue(type, r.lo | 0)
      }
    case "Symbol":
      return (r, wireType) => {
        expectWireType(wireType, WIRE_LEN)
        return Symbol.for(r.string())
      }
    case "Constant":
      return (r, wireType) => {
        expectWireType(wireType, WIRE_LEN)
        r.pos = r.delimited()
        return type.value
      }
    case "Message": {
      const message = type.message
      const decoder = decoderFor(message)
      // Messages are read in either encoding, whichever the field declares.
      return (r, wireType, previous, depth, number) => {
        if (wireType === WIRE_SGROUP) {
          return decodeMessage(decoder, r, r.buf.length, mergeTarget(message, previous), depth + 1, number)
        }
        expectWireType(wireType, WIRE_LEN)
        return decodeMessage(decoder, r, r.delimited(), mergeTarget(message, previous), depth + 1, undefined)
      }
    }
    case "Wkt":
      return (r, wireType, previous, depth) => {
        expectWireType(wireType, WIRE_LEN)
        return decodeWkt(type.wkt, r, r.delimited(), depth + 1, previous)
      }
    case "Wrapper":
      return (r, wireType, previous, depth) => {
        expectWireType(wireType, WIRE_LEN)
        return decodeWrapper(type.scalar, r, r.delimited(), depth + 1, previous)
      }
  }
}

function mergeTarget(message: Message, previous: unknown): unknown {
  switch (message.shape) {
    case "struct":
      return Predicate.isObject(previous) ? previous : undefined
    case "tuple":
      return Array.isArray(previous) ? previous : undefined
    case "box":
      return previous
  }
}

// Unknown numbers pass through for the schema to judge.
function enumValue(type: EnumLayout, n: number): unknown {
  if (type.fromNumber === undefined) return n
  const value = type.fromNumber.get(n)
  return value === undefined ? n : value
}

function decodeScalarField(type: ScalarLayout, wireType: number, r: Reader): unknown {
  expectWireType(wireType, type.wireType)
  return decodeScalar(type, r)
}

// A reader per scalar, so that each reads one type.
const SCALAR_READERS: { readonly [K in ScalarName]: ValueReader } = {
  double: (r, wireType) => {
    expectWireType(wireType, WIRE_I64)
    return r.double()
  },
  float: (r, wireType) => {
    expectWireType(wireType, WIRE_I32)
    return r.float()
  },
  int32: (r, wireType) => {
    expectWireType(wireType, WIRE_VARINT)
    r.varint64()
    return r.lo | 0
  },
  uint32: (r, wireType) => {
    expectWireType(wireType, WIRE_VARINT)
    return r.varint32()
  },
  sint32: (r, wireType) => {
    expectWireType(wireType, WIRE_VARINT)
    const n = r.varint32()
    return (n >>> 1) ^ -(n & 1)
  },
  fixed32: (r, wireType) => {
    expectWireType(wireType, WIRE_I32)
    return r.fixed32()
  },
  sfixed32: (r, wireType) => {
    expectWireType(wireType, WIRE_I32)
    return r.sfixed32()
  },
  int64: (r, wireType) => {
    expectWireType(wireType, WIRE_VARINT)
    r.varint64()
    return int64FromHalves(r.lo, r.hi)
  },
  uint64: (r, wireType) => {
    expectWireType(wireType, WIRE_VARINT)
    r.varint64()
    return uint64FromHalves(r.lo, r.hi)
  },
  sint64: (r, wireType) => {
    expectWireType(wireType, WIRE_VARINT)
    r.varint64()
    const mask = -(r.lo & 1)
    return int64FromHalves((((r.lo >>> 1) | (r.hi << 31)) ^ mask) >>> 0, ((r.hi >>> 1) ^ mask) >>> 0)
  },
  fixed64: (r, wireType) => {
    expectWireType(wireType, WIRE_I64)
    r.fixed64()
    return uint64FromHalves(r.lo, r.hi)
  },
  sfixed64: (r, wireType) => {
    expectWireType(wireType, WIRE_I64)
    r.fixed64()
    return int64FromHalves(r.lo, r.hi)
  },
  bool: (r, wireType) => {
    expectWireType(wireType, WIRE_VARINT)
    r.varint64()
    return r.lo !== 0 || r.hi !== 0
  },
  string: (r, wireType) => {
    expectWireType(wireType, WIRE_LEN)
    return r.string()
  },
  bytes: (r, wireType) => {
    expectWireType(wireType, WIRE_LEN)
    return r.bytes()
  }
}

// Reads the elements of a packed field up to `end`.
type PackedReader = (r: Reader, end: number, list: Array<unknown>) => void

function packedReader(type: ValueLayout): PackedReader {
  if (type._tag === "Enum") {
    return (r, end, list) => {
      while (r.pos < end) {
        r.varint64()
        list.push(enumValue(type, r.lo | 0))
      }
    }
  }
  const scalar = type as ScalarLayout
  switch (scalar.asNumber ? undefined : scalar.scalar) {
    case "double":
      return packedDouble
    case "float":
      return packedFloat
    case "int32":
      return packedInt32
    case "uint32":
      return packedUint32
    case "sint32":
      return packedSint32
    case "int64":
      return packedInt64
    case "bool":
      return packedBool
    default:
      return (r, end, list) => {
        while (r.pos < end) list.push(decodeScalar(scalar, r))
      }
  }
}

// Fixed-width elements that fill the field exactly are read without bounds
// checks; otherwise element by element, which reports the overrun.
function packedDouble(r: Reader, end: number, list: Array<unknown>): void {
  if ((end - r.pos) % 8 === 0) {
    const view = r.view
    let p = r.pos
    for (; p < end; p += 8) list.push(view.getFloat64(p, true))
    r.pos = p
  } else {
    while (r.pos < end) list.push(r.double())
  }
}

function packedFloat(r: Reader, end: number, list: Array<unknown>): void {
  if ((end - r.pos) % 4 === 0) {
    const view = r.view
    let p = r.pos
    for (; p < end; p += 4) list.push(view.getFloat32(p, true))
    r.pos = p
  } else {
    while (r.pos < end) list.push(r.float())
  }
}

function packedInt32(r: Reader, end: number, list: Array<unknown>): void {
  while (r.pos < end) {
    r.varint64()
    list.push(r.lo | 0)
  }
}

function packedUint32(r: Reader, end: number, list: Array<unknown>): void {
  while (r.pos < end) list.push(r.varint32())
}

function packedSint32(r: Reader, end: number, list: Array<unknown>): void {
  while (r.pos < end) {
    const n = r.varint32()
    list.push((n >>> 1) ^ -(n & 1))
  }
}

function packedInt64(r: Reader, end: number, list: Array<unknown>): void {
  while (r.pos < end) {
    r.varint64()
    list.push(int64FromHalves(r.lo, r.hi))
  }
}

function packedBool(r: Reader, end: number, list: Array<unknown>): void {
  while (r.pos < end) {
    r.varint64()
    list.push(r.lo !== 0 || r.hi !== 0)
  }
}

function decodeScalar(type: ScalarLayout, r: Reader): unknown {
  switch (type.scalar) {
    case "double":
      return r.double()
    case "float":
      return r.float()
    case "int32":
      r.varint64()
      return r.lo | 0
    case "uint32":
      return r.varint32()
    case "sint32": {
      const n = r.varint32()
      return (n >>> 1) ^ -(n & 1)
    }
    case "fixed32":
      return r.fixed32()
    case "sfixed32":
      return r.sfixed32()
    case "int64":
      r.varint64()
      return int64Value(type, r.lo, r.hi)
    case "uint64":
      r.varint64()
      return uint64Value(type, r.lo, r.hi)
    case "sint64": {
      r.varint64()
      const mask = -(r.lo & 1)
      return int64Value(type, (((r.lo >>> 1) | (r.hi << 31)) ^ mask) >>> 0, ((r.hi >>> 1) ^ mask) >>> 0)
    }
    case "fixed64":
      r.fixed64()
      return uint64Value(type, r.lo, r.hi)
    case "sfixed64":
      r.fixed64()
      return int64Value(type, r.lo, r.hi)
    case "bool":
      r.varint64()
      return r.lo !== 0 || r.hi !== 0
    case "string":
      return r.string()
    case "bytes":
      return r.bytes()
  }
}

function int64Value(type: ScalarLayout, lo: number, hi: number): unknown {
  if (!type.asNumber) return int64FromHalves(lo, hi)
  const n = (hi | 0) * 4294967296 + lo
  return Number.isSafeInteger(n) ? n : outsideSafeRange(type, int64FromHalves(lo, hi))
}

function uint64Value(type: ScalarLayout, lo: number, hi: number): unknown {
  if (!type.asNumber) return uint64FromHalves(lo, hi)
  const n = hi * 4294967296 + lo
  return Number.isSafeInteger(n) ? n : outsideSafeRange(type, uint64FromHalves(lo, hi))
}

function outsideSafeRange(type: ScalarLayout, n: bigint): never {
  throw new WireError(`${type.scalar} value ${n} is outside the safe integer range`)
}

function decodeWrapper(scalar: ScalarLayout, r: Reader, end: number, depth: number, previous: unknown): unknown {
  let value = previous === undefined ? zeroScalar(scalar) : previous
  while (r.pos < end) {
    const tag = readTag(r)
    if (tag >>> 3 === 1) value = decodeScalarField(scalar, tag & 7, r)
    else r.skip(tag & 7, tag >>> 3, depth)
  }
  if (r.pos !== end) throw new WireError("field overruns its message")
  return value
}

// Decodes a well-known type, merged into `previous`, the value of an earlier
// occurrence.
function decodeWkt(wkt: WktName, r: Reader, end: number, depth: number, previous: unknown): unknown {
  if (depth > MAX_DEPTH) throw new WireError(`nesting deeper than ${MAX_DEPTH}`)
  let out: unknown
  switch (wkt) {
    case "timestamp":
    case "date":
    case "duration": {
      let seconds = BIGINT_ZERO
      let nanos = 0
      if (previous !== undefined) {
        if (wkt === "duration") {
          const total = Duration_.toNanosUnsafe(previous as Duration_.Duration)
          seconds = total / BIGINT_NANOS_PER_SECOND
          nanos = Number(total - seconds * BIGINT_NANOS_PER_SECOND)
        } else {
          const millis = wkt === "timestamp"
            ? DateTime.toEpochMillis(previous as DateTime.Utc)
            : (previous as Date).getTime()
          const s = Math.floor(millis / 1000)
          seconds = BigInt(s)
          nanos = (millis - s * 1000) * 1_000_000
        }
      }
      while (r.pos < end) {
        const tag = readTag(r)
        if (tag === 8) {
          r.varint64()
          seconds = int64FromHalves(r.lo, r.hi)
        } else if (tag === 16) {
          r.varint64()
          nanos = r.lo | 0
        } else {
          r.skip(tag & 7, tag >>> 3, depth)
        }
      }
      out = wkt === "duration" ? joinDuration(seconds, nanos) : joinTimestamp(wkt, seconds, nanos)
      break
    }
    case "value":
      out = decodeJsonValue(r, end, depth, previous)
      break
    case "struct":
      out = decodeJsonStruct(r, end, depth, previous)
      break
    case "listValue":
      out = decodeJsonList(r, end, depth, previous)
      break
  }
  if (r.pos !== end) throw new WireError("field overruns its message")
  return out
}

function joinTimestamp(wkt: "timestamp" | "date", seconds: bigint, nanos: number): unknown {
  // `DateTime.Utc` and `Date` have millisecond precision.
  const millis = Number(seconds) * 1000 + Math.floor(nanos / 1_000_000)
  if (wkt === "date") {
    const date = new Date(millis)
    if (Number.isNaN(date.getTime())) throw new WireError("timestamp out of range")
    return date
  }
  const dateTime = DateTime.make(millis)
  if (Option.isNone(dateTime)) throw new WireError("timestamp out of range")
  return dateTime.value
}

function joinDuration(seconds: bigint, nanos: number): Duration_.Duration {
  const total = seconds * BIGINT_NANOS_PER_SECOND + BigInt(nanos)
  // Prefer the millisecond representation when it is exact.
  return total % BIGINT_NANOS_PER_MILLI === BIGINT_ZERO && total <= BIGINT_MAX_SAFE && total >= -BIGINT_MAX_SAFE
    ? Duration_.millis(Number(total / BIGINT_NANOS_PER_MILLI))
    : Duration_.nanos(total)
}

// JSON values merge like the messages they are: an object into an object, an
// array into an array, and any other value replaces the earlier one.
function decodeJsonValue(r: Reader, end: number, depth: number, previous: unknown): unknown {
  if (depth > MAX_DEPTH) throw new WireError(`nesting deeper than ${MAX_DEPTH}`)
  let value: unknown = previous === undefined ? null : previous
  while (r.pos < end) {
    const tag = readTag(r)
    switch (tag) {
      case 8: // null_value
        r.varint64()
        value = null
        break
      case 17: // number_value
        value = r.double()
        break
      case 26: // string_value
        value = r.string()
        break
      case 32: // bool_value
        r.varint64()
        value = r.lo !== 0 || r.hi !== 0
        break
      case 42: // struct_value
        value = decodeJsonStruct(r, r.delimited(), depth + 1, value)
        break
      case 50: // list_value
        value = decodeJsonList(r, r.delimited(), depth + 1, value)
        break
      default:
        r.skip(tag & 7, tag >>> 3, depth)
    }
  }
  if (r.pos !== end) throw new WireError("field overruns its message")
  return value
}

function decodeJsonStruct(r: Reader, end: number, depth: number, previous: unknown): Record<string, unknown> {
  const out = Predicate.isObject(previous) ? previous as Record<string, unknown> : {}
  while (r.pos < end) {
    const tag = readTag(r)
    if (tag !== 10) {
      r.skip(tag & 7, tag >>> 3, depth)
      continue
    }
    const entryEnd = r.delimited()
    let key = ""
    let value: unknown = undefined
    while (r.pos < entryEnd) {
      const entryTag = readTag(r)
      if (entryTag === 10) key = r.string()
      else if (entryTag === 18) value = decodeJsonValue(r, r.delimited(), depth + 1, value)
      else r.skip(entryTag & 7, entryTag >>> 3, depth)
    }
    if (r.pos !== entryEnd) throw new WireError("map entry overruns its field")
    setOwn(out, key, value === undefined ? null : value)
  }
  if (r.pos !== end) throw new WireError("field overruns its message")
  return out
}

function decodeJsonList(r: Reader, end: number, depth: number, previous: unknown): Array<unknown> {
  const out = Array.isArray(previous) ? previous : []
  while (r.pos < end) {
    const tag = readTag(r)
    if (tag === 10) out.push(decodeJsonValue(r, r.delimited(), depth + 1, undefined))
    else r.skip(tag & 7, tag >>> 3, depth)
  }
  if (r.pos !== end) throw new WireError("field overruns its message")
  return out
}

function zeroScalar(type: ScalarLayout): unknown {
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
      return type.asNumber ? 0 : BIGINT_ZERO
    default:
      return 0
  }
}

function zeroValue(type: ValueLayout): unknown {
  switch (type._tag) {
    case "Scalar":
      return zeroScalar(type)
    case "Enum":
      return enumValue(type, 0)
    case "Message":
      return decodeMessage(decoderFor(type.message), new Reader(EMPTY), 0, undefined, 0, undefined)
    case "Wkt":
      return decodeWkt(type.wkt, new Reader(EMPTY), 0, 0, undefined)
    case "Wrapper":
      return zeroScalar(type.scalar)
    case "Constant":
      return type.value
    case "Symbol":
      return Symbol.for("")
  }
}

const EMPTY = new Uint8Array(0)
