// The protobuf JSON mapping (ProtoJSON) of the encoded side of a schema. It
// interprets the same layout as the binary codec, and produces and accepts the
// same values: a message decoded from JSON is the message decoded from its
// bytes.
//
// Output is canonical: fields in field-number order under their JSON names,
// without fields that hold their default value. Input is as lenient as the
// specification asks: both names of a field, `null` for an unset field, and
// numbers in quotes.

import * as Bytes from "../../Bytes.ts"
import * as Base64 from "../../encoding/Base64.ts"
import * as InternalRecord from "../../internal/record.ts"
import * as Predicate from "../../Predicate.ts"
import * as Result from "../../Result.ts"
import type * as Schema from "../../Schema.ts"
import * as Codec from "./codec.ts"
import * as L from "./layout.ts"
import { is64Bit, type ScalarName } from "./schema.ts"
import * as Wire from "./wire.ts"
import * as Wkt from "./wkt.ts"

/** @internal */
export interface Options {
  // Writes the fields without presence that hold their default value.
  readonly alwaysEmitImplicit: boolean
  // Writes enum values as their numbers.
  readonly enumAsInteger: boolean
  // Writes field names as in the `.proto` file.
  readonly useProtoFieldName: boolean
  // Skips the keys of unknown fields, and unknown enum value names.
  readonly ignoreUnknownFields: boolean
  // The messages of `google.protobuf.Any` values, and the extensions of
  // messages, by full name.
  readonly resolver: Resolver | undefined
}

/** @internal */
export interface Resolver {
  readonly message: (name: string) => L.Root | undefined
  readonly extensions: (message: string) => ReadonlyArray<Extension>
}

/** @internal */
export interface Extension {
  // The full name, the key `[name]` of the extension.
  readonly name: string
  // The wrapper of the field of the extension.
  readonly layout: L.MessageType
}

/**
 * Both directions are synchronous, and throw a `WireError` for malformed input
 * or values without a JSON representation.
 *
 * @internal
 */
export const makeCodec = (root: L.Root, options: Options): {
  readonly encode: (value: unknown) => Schema.Json
  readonly decode: (json: Schema.Json) => unknown
} => {
  const ctx: Context = { options, messages: new Map() }
  return {
    encode: (value) => encodeValue(ctx, root, value, 0),
    decode: (json) => {
      if (json === null && !takesNull(root)) throw new Wire.WireError("expected a JSON object", json)
      return decodeValue(ctx, root, json, 0)
    }
  }
}

interface Context {
  readonly options: Options
  readonly messages: Map<L.Message, JsonMessage>
}

// A message prepared for the JSON mapping.
interface JsonMessage {
  readonly message: L.Message
  // The well-known type with a JSON representation of its own.
  readonly wkt: WellKnown | undefined
  // Fields by both their names.
  readonly byName: Map<string, L.Field>
  readonly slotsByKey: Map<PropertyKey, L.Slot>
}

type WellKnown =
  | "Any"
  | "Timestamp"
  | "Duration"
  | "FieldMask"
  | "Struct"
  | "Value"
  | "ListValue"
  | "Wrapper"

const WELL_KNOWN: ReadonlyMap<string, WellKnown> = new Map([
  ["google.protobuf.Any", "Any"],
  ["google.protobuf.Timestamp", "Timestamp"],
  ["google.protobuf.Duration", "Duration"],
  ["google.protobuf.FieldMask", "FieldMask"],
  ["google.protobuf.Struct", "Struct"],
  ["google.protobuf.Value", "Value"],
  ["google.protobuf.ListValue", "ListValue"],
  ["google.protobuf.DoubleValue", "Wrapper"],
  ["google.protobuf.FloatValue", "Wrapper"],
  ["google.protobuf.Int64Value", "Wrapper"],
  ["google.protobuf.UInt64Value", "Wrapper"],
  ["google.protobuf.Int32Value", "Wrapper"],
  ["google.protobuf.UInt32Value", "Wrapper"],
  ["google.protobuf.BoolValue", "Wrapper"],
  ["google.protobuf.StringValue", "Wrapper"],
  ["google.protobuf.BytesValue", "Wrapper"]
])

const NULL_VALUE = "google.protobuf.NullValue"

// The depth limit of the reference implementations.
const MAX_DEPTH = 100

const prepare = (ctx: Context, message: L.Message): JsonMessage => {
  const cached = ctx.messages.get(message)
  if (cached !== undefined) return cached
  // A JSON name takes precedence over the proto name of another field, which
  // only proto2 files may have.
  const byName = new Map<string, L.Field>()
  for (const field of message.fields) byName.set(field.names.json, field)
  for (const field of message.fields) if (!byName.has(field.names.proto)) byName.set(field.names.proto, field)
  const slotsByKey = new Map<PropertyKey, L.Slot>()
  for (const slot of message.slots) slotsByKey.set(slot.key, slot)
  const out: JsonMessage = { message, wkt: WELL_KNOWN.get(message.name), byName, slotsByKey }
  ctx.messages.set(message, out)
  return out
}

const checkDepth = (depth: number): void => {
  if (depth > MAX_DEPTH) throw new Wire.WireError(`nesting deeper than ${MAX_DEPTH}`)
}

// The value of a slot in a message value.
const slotValue = (message: L.Message, slot: L.Slot, container: any): unknown => {
  if (message.shape === "wrapper") return container
  return slot.guarded && !Object.hasOwn(container, slot.key) ? undefined : container[slot.key]
}

// -----------------------------------------------------------------------------
// encode
// -----------------------------------------------------------------------------

const encodeValue = (ctx: Context, type: L.Type, value: unknown, depth: number): Schema.Json => {
  switch (type._tag) {
    case "Scalar":
      return encodeScalar(type, value)
    case "Enum":
      return encodeEnum(ctx, type, value)
    case "Message":
      return encodeMessage(ctx, type.message, value, depth)
    case "Converted":
      return encodeConverted(type, value)
  }
}

const expected = (what: string, value: unknown): never => {
  throw new Wire.WireError(`expected a protobuf ${what}`, value)
}

const encodeScalar = (type: L.Scalar, value: unknown): Schema.Json => {
  const scalar = type.scalar
  switch (scalar) {
    case "double":
    case "float":
      if (typeof value !== "number") return expected(scalar, value)
      if (Number.isNaN(value)) return "NaN"
      if (value === Infinity) return "Infinity"
      if (value === -Infinity) return "-Infinity"
      if (scalar === "float") {
        if (Math.abs(value) > Wire.FLOAT32_MAX) return expected(scalar, value)
        return Math.fround(value)
      }
      return value
    case "bool":
      if (typeof value !== "boolean") return expected(scalar, value)
      return value
    case "string":
      if (typeof value !== "string" || LONE_SURROGATE.test(value)) return expected(scalar, value)
      return value
    case "bytes":
      if (!(value instanceof Uint8Array)) return expected(scalar, value)
      return Base64.encode(value)
    default: {
      const n = toInteger(type, value)
      if (n === undefined || !inRange(scalar, n)) return expected(scalar, value)
      return is64Bit(scalar) ? String(n) : Number(n)
    }
  }
}

// An integer value in its representation, as a bigint.
const toInteger = (type: L.Scalar, value: unknown): bigint | undefined => {
  if (!is64Bit(type.scalar)) return typeof value === "number" && Number.isInteger(value) ? BigInt(value) : undefined
  switch (type.int64As) {
    case "bigint":
      return typeof value === "bigint" ? value : undefined
    case "number":
      return typeof value === "number" && Number.isSafeInteger(value) ? BigInt(value) : undefined
    case "string":
      return typeof value === "string" && INTEGER.test(value) ? BigInt(value) : undefined
  }
}

// The value of an integer in the representation of its type.
const fromInteger = (type: L.Scalar, n: bigint, input: unknown): unknown => {
  if (!is64Bit(type.scalar)) return Number(n)
  switch (type.int64As) {
    case "bigint":
      return n
    case "number":
      if (n > MAX_SAFE || n < -MAX_SAFE) {
        throw new Wire.WireError(`${type.scalar} value ${n} is outside the safe integer range`, input)
      }
      return Number(n)
    case "string":
      return String(n)
  }
}

const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER)
const INT32_MIN = BigInt(-2147483648)
const INT32_MAX = BigInt(2147483647)
const UINT32_MAX = BigInt(4294967295)

const inRange = (scalar: ScalarName, n: bigint): boolean => {
  switch (scalar) {
    case "uint32":
    case "fixed32":
      return n >= Wire.BIGINT_ZERO && n <= UINT32_MAX
    case "uint64":
    case "fixed64":
      return n >= Wire.BIGINT_ZERO && n <= Wire.UINT64_MAX
    default:
      return is64Bit(scalar) ? n >= Wire.INT64_MIN && n <= Wire.INT64_MAX : n >= INT32_MIN && n <= INT32_MAX
  }
}

// A canonical decimal integer.
const INTEGER = /^-?(?:0|[1-9]\d*)$/

// In a string, a UTF-16 surrogate without its pair, which JSON text cannot
// hold as Unicode, even for strings that the binary format does not validate.
const LONE_SURROGATE = /[\uD800-\uDFFF]/u

const encodeEnum = (ctx: Context, type: L.Enum, value: unknown): Schema.Json => {
  const n = L.enumNumber(type, value)
  if (type.name === NULL_VALUE) return null
  if (ctx.options.enumAsInteger) return n
  const name = type.fromNumber.get(n)
  return typeof name === "string" ? name : n
}

// Whether the value of a field without presence is its default, which is not
// written.
const isDefault = (type: L.Type, value: unknown): boolean => {
  switch (type._tag) {
    case "Scalar":
      switch (type.scalar) {
        case "double":
        case "float":
          // -0 is written, as the binary codec writes it.
          return value === 0 && 1 / value > 0
        case "bool":
          return value === false
        case "string":
          return value === ""
        case "bytes":
          return value instanceof Uint8Array && value.length === 0
        default:
          return value === 0 || value === Wire.BIGINT_ZERO || value === "0"
      }
    case "Enum":
      return type.toNumber.get(value) === 0 || value === 0
    default:
      return false
  }
}

const encodeMessage = (ctx: Context, message: L.Message, value: unknown, depth: number): Schema.Json => {
  checkDepth(depth)
  const prepared = prepare(ctx, message)
  switch (prepared.wkt) {
    case undefined:
      return encodeFields(ctx, prepared, value, depth)
    case "Wrapper": {
      const slot = message.slots[0] as L.Singular
      return encodeValue(ctx, slot.type, slotValue(message, slot, value), depth + 1)
    }
    case "Timestamp":
      return formatTime(Wkt.Timestamp, partsOf(message, value), value)
    case "Duration":
      return formatTime(Wkt.Duration, partsOf(message, value), value)
    case "FieldMask":
      return encodeFieldMask(message, value)
    case "Struct":
      return encodeStruct(ctx, message, value, depth)
    case "ListValue":
      return encodeList(ctx, message, value, depth)
    case "Value":
      return encodeJsonValue(ctx, message, value, depth)
    case "Any":
      return encodeAny(ctx, message, value, depth)
  }
}

const encodeConverted = (type: L.Converted, value: unknown): Schema.Json => {
  return formatTime(type, type.toMessage(value) as Parts, value)
}

const encodeFields = (ctx: Context, prepared: JsonMessage, value: unknown, depth: number): Schema.Json => {
  const message = prepared.message
  if (!Predicate.isObject(value)) throw new Wire.WireError(`expected an object for ${message.name}`, value)
  const container = value as any
  const out: Record<string, Schema.Json> = {}
  const { alwaysEmitImplicit, useProtoFieldName } = ctx.options
  // The case of each oneof.
  const cases = new Map<L.Oneof, L.Case>()
  for (const oneof of message.oneofs) {
    const v = slotValue(message, oneof, container)
    if (v === undefined && !Object.hasOwn(container, oneof.key)) continue
    const c = oneof.select(v)
    if (c === undefined) Wire.rethrowAt(new Wire.WireError("value matches no oneof case", v), oneof.key)
    cases.set(oneof, c!)
  }
  for (const field of message.fields) {
    const key = field._tag === "Case" ? field.oneof.key : field.key
    try {
      const name = useProtoFieldName ? field.names.proto : field.names.json
      if (field._tag === "Case") {
        if (cases.get(field.oneof) !== field) continue
        const v = (slotValue(message, field.oneof, container) as { readonly value: unknown }).value
        InternalRecord.assignProperty(out, name, encodeValue(ctx, field.type, v, depth + 1))
        continue
      }
      const v = slotValue(message, field, container)
      if (v === undefined) {
        if (field.absent === "omit" && !Object.hasOwn(container, field.key)) continue
        if (!Object.hasOwn(container, field.key)) throw Wire.missing()
      }
      const json = encodeField(ctx, field, v, depth, alwaysEmitImplicit)
      if (json !== undefined) InternalRecord.assignProperty(out, name, json)
    } catch (e) {
      Wire.rethrowAt(e, message.synthetic ? undefined : key)
    }
  }
  encodeExtensions(ctx, message, container, out, depth)
  return out
}

// The JSON of a field, or `undefined` for a field without presence that holds
// its default value.
const encodeField = (
  ctx: Context,
  field: L.Singular | L.Repeated | L.MapField,
  value: unknown,
  depth: number,
  always: boolean
): Schema.Json | undefined => {
  switch (field._tag) {
    case "Singular":
      if (field.absent === "zero" && !always && isDefault(field.type, value)) return undefined
      return encodeValue(ctx, field.type, value, depth + 1)
    case "Repeated": {
      if (!Array.isArray(value)) throw new Wire.WireError("expected an array", value)
      if (value.length === 0 && field.absent === "zero" && !always) return undefined
      const out: Array<Schema.Json> = []
      for (let i = 0; i < value.length; i++) {
        try {
          out.push(encodeValue(ctx, field.element, value[i], depth + 1))
        } catch (e) {
          Wire.rethrowAt(e, i)
        }
      }
      return out
    }
    case "Map": {
      if (!Predicate.isObject(value) || Array.isArray(value)) throw new Wire.WireError("expected a record", value)
      const keys = Object.keys(value)
      if (keys.length === 0 && field.absent === "zero" && !always) return undefined
      const out: Record<string, Schema.Json> = {}
      for (const key of keys) {
        const wire = field.wireKey(key)
        // A key the key schema rejects is left out, as the binary codec leaves it.
        if (wire === undefined) continue
        try {
          InternalRecord.assignProperty(
            out,
            typeof wire === "string" ? wire : String(wire),
            encodeValue(ctx, field.value, (value as any)[key], depth + 1)
          )
        } catch (e) {
          Wire.rethrowAt(e, key)
        }
      }
      return out
    }
  }
}

// Writes the extensions that the resolver knows from the unknown fields, as
// `"[full.name]"` keys. JSON cannot hold other unknown fields.
const encodeExtensions = (
  ctx: Context,
  message: L.Message,
  container: any,
  out: Record<string, Schema.Json>,
  depth: number
): void => {
  const resolver = ctx.options.resolver
  if (resolver === undefined || message.unknown === undefined) return
  const bytes = Object.hasOwn(container, message.unknown) ? container[message.unknown] : undefined
  if (!(bytes instanceof Uint8Array) || bytes.length === 0) return
  for (const extension of resolver.extensions(message.name)) {
    const wrapper = extension.layout.message
    const slot = wrapper.slots[0] as L.Singular | L.Repeated
    const fields = selectField(bytes, slot.number)
    if (fields.length === 0) continue
    const key = `[${extension.name}]`
    try {
      const value = binaryCodec(extension.layout).decode(fields)
      InternalRecord.assignProperty(
        out,
        key,
        slot._tag === "Singular"
          ? encodeValue(ctx, slot.type, value, depth + 1)
          : encodeField(ctx, slot, value, depth, true)!
      )
    } catch (e) {
      Wire.rethrowAt(e, key)
    }
  }
}

// The occurrences of field `number` in the bytes of unknown fields.
const selectField = (bytes: Uint8Array, number: number): Uint8Array => {
  const r = new Wire.Reader(bytes)
  const chunks: Array<Uint8Array> = []
  while (r.pos < bytes.length) {
    const start = r.pos
    const tag = r.tag()
    r.skip(tag & 7, tag >>> 3, 0)
    if (tag >>> 3 === number) chunks.push(bytes.subarray(start, r.pos))
  }
  return Bytes.concat(chunks)
}

const binaryCodecs = new WeakMap<L.Root, Codec.Codec>()

const binaryCodec = (root: L.Root): Codec.Codec => {
  let codec = binaryCodecs.get(root)
  if (codec === undefined) {
    codec = Codec.makeCodec(root)
    binaryCodecs.set(root, codec)
  }
  return codec
}

// -----------------------------------------------------------------------------
// well-known types
// -----------------------------------------------------------------------------

// The fields of a `google.protobuf.Timestamp` or `google.protobuf.Duration`.
interface Parts {
  readonly seconds: bigint
  readonly nanos: number
}

const partsOf = (message: L.Message, value: unknown): Parts => {
  if (!Predicate.isObject(value)) throw new Wire.WireError(`expected an object for ${message.name}`, value)
  const [seconds, nanos] = message.fields as unknown as [L.Singular, L.Singular]
  const s = toInteger(seconds.type as L.Scalar, slotValue(message, seconds, value))
  const n = slotValue(message, nanos, value)
  if (s === undefined || typeof n !== "number" || !Wire.isInt32(n)) {
    throw new Wire.WireError(`expected the seconds and nanos of ${message.name}`, value)
  }
  return { seconds: s, nanos: n }
}

const isDuration = (type: L.Converted): boolean => type.message.name === "google.protobuf.Duration"

// A `google.protobuf.Timestamp` as an RFC 3339 string, or a
// `google.protobuf.Duration` as seconds, such as `"1.5s"`. The layout of the
// type checks its range, as it does for the binary codec.
const formatTime = (type: L.Converted, parts: Parts, input: unknown): string => {
  const reason = type.invalid(parts)
  if (reason !== undefined) throw new Wire.WireError(reason, input)
  return isDuration(type) ? formatDuration(parts) : formatTimestamp(parts)
}

const formatTimestamp = ({ nanos, seconds }: Parts): string => {
  const iso = new Date(Number(seconds) * 1000).toISOString()
  return `${iso.slice(0, 19)}${nanos === 0 ? "" : `.${fraction(nanos)}`}Z`
}

const formatDuration = ({ nanos, seconds }: Parts): string => {
  const negative = seconds < Wire.BIGINT_ZERO || nanos < 0
  const abs = seconds < Wire.BIGINT_ZERO ? -seconds : seconds
  return `${negative ? "-" : ""}${abs}${nanos === 0 ? "" : `.${fraction(Math.abs(nanos))}`}s`
}

// Nanoseconds as 3, 6, or 9 digits.
const fraction = (nanos: number): string => {
  const digits = String(nanos).padStart(9, "0")
  return digits.endsWith("000000") ? digits.slice(0, 3) : digits.endsWith("000") ? digits.slice(0, 6) : digits
}

const encodeFieldMask = (message: L.Message, value: unknown): string => {
  const paths = slotValue(message, message.slots[0], value)
  if (!Array.isArray(paths)) throw new Wire.WireError("expected the paths of a google.protobuf.FieldMask", value)
  return paths.map((path, i) => {
    if (typeof path !== "string") return Wire.rethrowAt(new Wire.WireError("expected a path", path), i)
    // A path round-trips when each `_` is followed by a lower-case letter, and
    // there are no upper-case letters.
    if (!path.split(".").every((segment) => FIELD_MASK_SEGMENT.test(segment))) {
      return Wire.rethrowAt(new Wire.WireError("path has no JSON representation", path), i)
    }
    return path.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
  }).join(",")
}

const FIELD_MASK_SEGMENT = /^[a-z0-9]+(?:_[a-z][a-z0-9]*)*$/

const toSnakeCase = (segment: string): string => segment.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)

// The `kind` of a `google.protobuf.Value`, by field number.
const KIND_NULL = 1
const KIND_NUMBER = 2
const KIND_STRING = 3
const KIND_BOOL = 4
const KIND_STRUCT = 5
const KIND_LIST = 6

const encodeJsonValue = (ctx: Context, message: L.Message, value: unknown, depth: number): Schema.Json => {
  if (!Predicate.isObject(value)) throw new Wire.WireError(`expected an object for ${message.name}`, value)
  const oneof = message.oneofs[0]
  const kind = slotValue(message, oneof, value)
  const c = kind === undefined ? undefined : oneof.select(kind)
  if (c === undefined) throw new Wire.WireError("google.protobuf.Value has no kind", value)
  const v = (kind as { readonly value: unknown }).value
  try {
    switch (c.number) {
      case KIND_NULL:
        L.enumNumber(c.type as L.Enum, v)
        return null
      case KIND_NUMBER:
        if (typeof v !== "number" || !Number.isFinite(v)) throw new Wire.WireError("expected a finite number", v)
        return v
      default:
        return encodeValue(ctx, c.type, v, depth + 1)
    }
  } catch (e) {
    return Wire.rethrowAt(e, oneof.key)
  }
}

const encodeStruct = (ctx: Context, message: L.Message, value: unknown, depth: number): Schema.Json => {
  if (!Predicate.isObject(value)) throw new Wire.WireError(`expected an object for ${message.name}`, value)
  const slot = message.slots[0] as L.MapField
  try {
    return encodeField(ctx, slot, slotValue(message, slot, value), depth, true)!
  } catch (e) {
    return Wire.rethrowAt(e, slot.key)
  }
}

const encodeList = (ctx: Context, message: L.Message, value: unknown, depth: number): Schema.Json => {
  if (!Predicate.isObject(value)) throw new Wire.WireError(`expected an object for ${message.name}`, value)
  const slot = message.slots[0] as L.Repeated
  try {
    return encodeField(ctx, slot, slotValue(message, slot, value), depth, true)!
  } catch (e) {
    return Wire.rethrowAt(e, slot.key)
  }
}

const encodeAny = (ctx: Context, message: L.Message, value: unknown, depth: number): Schema.Json => {
  if (!Predicate.isObject(value)) throw new Wire.WireError(`expected an object for ${message.name}`, value)
  const [typeUrlSlot, valueSlot] = message.fields as unknown as [L.Singular, L.Singular]
  const typeUrl = slotValue(message, typeUrlSlot, value)
  const bytes = slotValue(message, valueSlot, value)
  if (typeof typeUrl !== "string") {
    return Wire.rethrowAt(new Wire.WireError("expected a type URL", typeUrl), typeUrlSlot.key)
  }
  if (!(bytes instanceof Uint8Array)) return Wire.rethrowAt(expected("bytes", bytes), valueSlot.key)
  if (typeUrl === "" && bytes.length === 0) return {}
  const root = resolveAny(ctx, typeUrl)
  const inner = binaryCodec(root).decode(bytes)
  const json = encodeValue(ctx, root, inner, depth + 1)
  if (isSpecial(ctx, root)) return { "@type": typeUrl, value: json }
  const out: Record<string, Schema.Json> = { "@type": typeUrl }
  for (const [key, v] of Object.entries(json as Record<string, Schema.Json>)) InternalRecord.assignProperty(out, key, v)
  return out
}

const resolveAny = (ctx: Context, typeUrl: string): L.Root => {
  const slash = typeUrl.lastIndexOf("/")
  const name = typeUrl.slice(slash + 1)
  const root = name === "" ? undefined : ctx.options.resolver?.message(name)
  if (root === undefined) {
    throw new Wire.WireError(`google.protobuf.Any holds ${typeUrl}, which is not in the registry`, typeUrl)
  }
  return root
}

// Whether a message has a JSON representation other than an object of its
// fields, which `Any` holds under `"value"`.
const isSpecial = (ctx: Context, root: L.Root): boolean => {
  return root._tag === "Converted" || prepare(ctx, root.message).wkt !== undefined
}

// -----------------------------------------------------------------------------
// decode
// -----------------------------------------------------------------------------

// The value of an unknown enum value name under `ignoreUnknownFields`, which
// leaves the field unset.
const SKIP = Symbol("Protobuf/skip")

const decodeValue = (ctx: Context, type: L.Type, json: unknown, depth: number): unknown => {
  switch (type._tag) {
    case "Scalar":
      return decodeScalar(type, json)
    case "Enum":
      return decodeEnum(ctx, type, json)
    case "Message":
      return decodeMessage(ctx, type.message, json, depth)
    case "Converted":
      return type.fromMessage(parseTime(type, json))
  }
}

// Whether `null` is a value of a type, or of a singular field, rather than an
// unset field.
const takesNull = (type: L.Type | L.Field): boolean => {
  switch (type._tag) {
    case "Enum":
      return type.name === NULL_VALUE
    case "Message":
      return type.message.name === "google.protobuf.Value"
    case "Singular":
    case "Case":
      return takesNull(type.type)
    default:
      return false
  }
}

const decodeScalar = (type: L.Scalar, json: unknown): unknown => {
  const scalar = type.scalar
  switch (scalar) {
    case "double":
    case "float": {
      const n = typeof json === "number"
        ? json
        : typeof json === "string"
        ? json === "NaN" ? NaN : json === "Infinity" ? Infinity : json === "-Infinity" ? -Infinity : decimal(json)
        : undefined
      if (n === undefined || (typeof json === "number" && !Number.isFinite(n))) return expected(scalar, json)
      if (scalar === "float") {
        if (Number.isFinite(n) && Math.abs(n) > Wire.FLOAT32_MAX) return expected(scalar, json)
        return Math.fround(n)
      }
      return n
    }
    case "bool":
      if (typeof json !== "boolean") return expected(scalar, json)
      return json
    case "string":
      if (typeof json !== "string" || LONE_SURROGATE.test(json)) return expected(scalar, json)
      return json
    case "bytes":
      return decodeBytes(json)
    default: {
      const n = typeof json === "number"
        ? Number.isInteger(json) ? BigInt(json) : undefined
        : typeof json === "string"
        ? parseInteger(json)
        : undefined
      if (n === undefined || !inRange(scalar, n)) return expected(scalar, json)
      return fromInteger(type, n, json)
    }
  }
}

// A number in JSON number syntax.
const NUMBER = /^(-)?(0|[1-9]\d*)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/

// A finite number in JSON number syntax, or `undefined`.
const decimal = (text: string): number | undefined => {
  if (!NUMBER.test(text)) return undefined
  const n = Number(text)
  return Number.isFinite(n) ? n : undefined
}

// An integer in JSON number syntax, possibly with a fraction of zeros or an
// exponent, or `undefined`.
const parseInteger = (text: string): bigint | undefined => {
  const m = NUMBER.exec(text)
  if (m === null) return undefined
  const fractionDigits = m[3] ?? ""
  let digits = (m[2] + fractionDigits).replace(/^0+/, "")
  if (digits === "") return Wire.BIGINT_ZERO
  const exponent = Number(m[4] ?? 0) - fractionDigits.length
  if (exponent < 0) {
    if (-exponent >= digits.length || !/^0+$/.test(digits.slice(exponent))) return undefined
    digits = digits.slice(0, exponent)
  } else {
    // Too large for any integer type.
    if (digits.length + exponent > 30) return undefined
    digits += "0".repeat(exponent)
  }
  const n = BigInt(digits)
  return m[1] === "-" ? -n : n
}

const BASE64 = /^[A-Za-z0-9+/_-]*={0,2}$/

// Standard or URL-safe base64, with or without padding.
const decodeBytes = (json: unknown): Uint8Array => {
  if (typeof json === "string" && BASE64.test(json)) {
    const text = json.replace(/=+$/, "").replaceAll("-", "+").replaceAll("_", "/")
    if (text.length % 4 !== 1) {
      const result = Base64.decode(text + "=".repeat((4 - text.length % 4) % 4))
      if (Result.isSuccess(result)) return result.success
    }
  }
  throw new Wire.WireError("expected base64 bytes", json)
}

const decodeEnum = (ctx: Context, type: L.Enum, json: unknown): unknown => {
  if (json === null && type.name === NULL_VALUE) return type.fromNumber.get(0)
  if (typeof json === "string") {
    const n = type.toNumber.get(json)
    if (n !== undefined) return type.fromNumber.get(n)
    if (ctx.options.ignoreUnknownFields) return SKIP
    throw new Wire.WireError("unknown enum value name", json)
  }
  if (typeof json === "number" && Wire.isInt32(json)) {
    const value = L.enumValue(type, json)
    if (value === L.UNKNOWN_ENUM) throw new Wire.WireError("unknown value of a closed enum", json)
    return value
  }
  throw new Wire.WireError("expected an enum value name or number", json)
}

const isJsonObject = (json: unknown): json is Record<string, unknown> => {
  return typeof json === "object" && json !== null && !Array.isArray(json)
}

const decodeMessage = (ctx: Context, message: L.Message, json: unknown, depth: number): unknown => {
  checkDepth(depth)
  const prepared = prepare(ctx, message)
  switch (prepared.wkt) {
    case undefined:
      return decodeFields(ctx, prepared, json, depth)
    case "Wrapper": {
      const slot = message.slots[0] as L.Singular
      const value = decodeValue(ctx, slot.type, json, depth + 1)
      return message.shape === "wrapper" ? value : build(prepared, new Map([[slot, value]]), undefined)
    }
    case "Timestamp":
      return fromParts(prepared, parseTime(Wkt.Timestamp, json))
    case "Duration":
      return fromParts(prepared, parseTime(Wkt.Duration, json))
    case "FieldMask":
      return decodeFieldMask(prepared, json)
    case "Struct":
      return decodeStruct(ctx, prepared, json, depth)
    case "ListValue":
      return decodeList(ctx, prepared, json, depth)
    case "Value":
      return decodeJsonValue(ctx, prepared, json, depth)
    case "Any":
      return decodeAny(ctx, prepared, json, depth)
  }
}

const decodeFields = (ctx: Context, prepared: JsonMessage, json: unknown, depth: number): unknown => {
  const message = prepared.message
  if (!isJsonObject(json)) throw new Wire.WireError(`expected a JSON object for ${message.name}`, json)
  const values = new Map<L.Slot, unknown>()
  // The fields seen, by the key they were seen under.
  const seen = new Map<L.Field, string>()
  let extensions: Array<Uint8Array> | undefined
  for (const key of Object.keys(json)) {
    const value = json[key]
    try {
      const field = prepared.byName.get(key)
      if (field === undefined) {
        const extension = key.startsWith("[") && key.endsWith("]") ? findExtension(ctx, message, key) : undefined
        if (extension !== undefined) {
          ;(extensions ??= []).push(decodeExtension(ctx, extension, value, depth))
        } else if (!ctx.options.ignoreUnknownFields) {
          throw new Wire.WireError(`unknown field of ${message.name}`)
        }
        continue
      }
      const other = seen.get(field)
      if (other !== undefined) throw new Wire.WireError(`field is set twice, as ${other} and ${key}`)
      seen.set(field, key)
      if (value === null && !takesNull(field)) continue
      if (field._tag === "Case") {
        if (values.has(field.oneof)) throw new Wire.WireError(`more than one case of oneof ${String(field.oneof.key)}`)
        const v = decodeValue(ctx, field.type, value, depth + 1)
        if (v !== SKIP) values.set(field.oneof, { _tag: field.tag, value: v })
        continue
      }
      const v = decodeField(ctx, field, value, depth)
      if (v !== SKIP) values.set(field, v)
    } catch (e) {
      Wire.rethrowAt(e, key)
    }
  }
  return build(prepared, values, extensions)
}

const decodeField = (
  ctx: Context,
  field: L.Singular | L.Repeated | L.MapField,
  json: unknown,
  depth: number
): unknown => {
  switch (field._tag) {
    case "Singular":
      return decodeValue(ctx, field.type, json, depth + 1)
    case "Repeated": {
      if (!Array.isArray(json)) throw new Wire.WireError("expected a JSON array", json)
      const out: Array<unknown> = []
      for (let i = 0; i < json.length; i++) {
        try {
          const element = json[i]
          if (element === null && !takesNull(field.element)) throw new Wire.WireError("expected a value, not null")
          const v = decodeValue(ctx, field.element, element, depth + 1)
          if (v !== SKIP) out.push(v)
        } catch (e) {
          Wire.rethrowAt(e, i)
        }
      }
      return out
    }
    case "Map": {
      if (!isJsonObject(json)) throw new Wire.WireError("expected a JSON object", json)
      const out: Record<string, unknown> = {}
      for (const key of Object.keys(json)) {
        try {
          const k = decodeMapKey(field, key)
          if (Object.hasOwn(out, k)) throw new Wire.WireError("map key is set twice")
          const element = json[key]
          if (element === null && !takesNull(field.value)) throw new Wire.WireError("expected a value, not null")
          const v = decodeValue(ctx, field.value, element, depth + 1)
          if (v !== SKIP) InternalRecord.assignProperty(out, k, v)
        } catch (e) {
          Wire.rethrowAt(e, key)
        }
      }
      return out
    }
  }
}

// The key of a decoded record for a JSON map key, in canonical form.
const decodeMapKey = (field: L.MapField, key: string): string => {
  const scalar = field.keyType.scalar
  let canonical: string | undefined
  switch (scalar) {
    case "string":
      canonical = LONE_SURROGATE.test(key) ? undefined : key
      break
    case "bool":
      canonical = key === "true" || key === "false" ? key : undefined
      break
    default: {
      const n = INTEGER_KEY.test(key) ? BigInt(key) : undefined
      canonical = n !== undefined && inRange(scalar, n) ? String(n) : undefined
    }
  }
  if (canonical === undefined || field.wireKey(canonical) === undefined) {
    throw new Wire.WireError(`expected a protobuf ${scalar} map key`, key)
  }
  return canonical
}

const INTEGER_KEY = /^-?\d+$/

// The value of a message from the values of its slots, built like the binary
// codec builds it: its keys in schema order, and the absent value of each slot
// that is not set.
const build = (
  prepared: JsonMessage,
  values: Map<L.Slot, unknown>,
  extensions: ReadonlyArray<Uint8Array> | undefined
): object => {
  const message = prepared.message
  const out: Record<PropertyKey, unknown> = {}
  for (const key of message.order) {
    if (key === message.unknown) {
      if (extensions !== undefined) InternalRecord.assignProperty(out, key, Bytes.concat(extensions))
      continue
    }
    const slot = prepared.slotsByKey.get(key)!
    if (values.has(slot)) {
      InternalRecord.assignProperty(out, key, values.get(slot))
      continue
    }
    switch (slot.absent) {
      case "zero":
        InternalRecord.assignProperty(out, key, L.absentValue(slot))
        break
      case "required":
        Wire.rethrowAt(Wire.missing(), message.synthetic ? undefined : key)
    }
  }
  return out
}

const findExtension = (ctx: Context, message: L.Message, key: string): Extension | undefined => {
  const name = key.slice(1, -1)
  return ctx.options.resolver?.extensions(message.name).find((extension) => extension.name === name)
}

// The bytes of an extension, as they are kept in the unknown fields.
const decodeExtension = (ctx: Context, extension: Extension, json: unknown, depth: number): Uint8Array => {
  const slot = extension.layout.message.slots[0] as L.Singular | L.Repeated
  if (json === null && !takesNull(slot)) return Wire.EMPTY_BYTES
  const value = decodeField(ctx, slot, json, depth)
  if (value === SKIP) return Wire.EMPTY_BYTES
  return binaryCodec(extension.layout).encode(value)
}

// A `google.protobuf.Timestamp` or `google.protobuf.Duration` message from its
// fields.
const fromParts = (prepared: JsonMessage, parts: Parts): unknown => {
  const message = prepared.message
  const [seconds, nanos] = message.fields as unknown as [L.Singular, L.Singular]
  return build(
    prepared,
    new Map<L.Slot, unknown>([[seconds, fromInteger(seconds.type as L.Scalar, parts.seconds, parts.seconds)], [
      nanos,
      parts.nanos
    ]]),
    undefined
  )
}

// The fields of a `google.protobuf.Timestamp` from an RFC 3339 string, or of
// a `google.protobuf.Duration` from seconds, such as `"1.5s"`.
const parseTime = (type: L.Converted, json: unknown): Parts => {
  const parts = isDuration(type) ? parseDuration(json) : parseTimestamp(json)
  const reason = type.invalid(parts)
  if (reason !== undefined) throw new Wire.WireError(reason, json)
  return parts
}

// Upper-case `T` and `Z` only, as the strict profile of RFC 3339 requires.
const TIMESTAMP = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?(?:Z|([+-])(\d{2}):(\d{2}))$/

const parseTimestamp = (json: unknown): Parts => {
  const m = typeof json === "string" ? TIMESTAMP.exec(json) : null
  if (m !== null) {
    const year = Number(m[1])
    const month = Number(m[2]) - 1
    const day = Number(m[3])
    const hours = Number(m[4])
    const minutes = Number(m[5])
    const secs = Number(m[6])
    const date = new Date(0)
    date.setUTCFullYear(year, month, day)
    const valid = hours <= 23 && minutes <= 59 && secs <= 59 && date.getUTCFullYear() === year &&
      date.getUTCMonth() === month && date.getUTCDate() === day
    const offsetHours = m[8] === undefined ? 0 : Number(m[9])
    const offsetMinutes = m[8] === undefined ? 0 : Number(m[10])
    if (valid && offsetHours <= 23 && offsetMinutes <= 59) {
      const offset = (m[8] === "-" ? -1 : 1) * (offsetHours * 60 + offsetMinutes) * 60
      const seconds = BigInt(date.getTime() / 1000 + (hours * 60 + minutes) * 60 + secs - offset)
      const nanos = m[7] === undefined ? 0 : Number(m[7].padEnd(9, "0"))
      return { seconds, nanos }
    }
  }
  throw new Wire.WireError("expected an RFC 3339 timestamp", json)
}

const DURATION = /^(-)?(\d+)(?:\.(\d{1,9}))?s$/

const parseDuration = (json: unknown): Parts => {
  const m = typeof json === "string" ? DURATION.exec(json) : null
  if (m === null) throw new Wire.WireError("expected a duration in seconds, such as \"1.5s\"", json)
  const seconds = BigInt(m[2])
  const nanos = m[3] === undefined ? 0 : Number(m[3].padEnd(9, "0"))
  return m[1] === "-" ? { seconds: -seconds, nanos: nanos === 0 ? 0 : -nanos } : { seconds, nanos }
}

const decodeFieldMask = (prepared: JsonMessage, json: unknown): unknown => {
  if (typeof json !== "string") throw new Wire.WireError("expected the paths of a google.protobuf.FieldMask", json)
  const paths = json === "" ? [] : json.split(",").map((path) => {
    if (path.includes("_")) throw new Wire.WireError("expected a path in lowerCamelCase", path)
    return path.split(".").map(toSnakeCase).join(".")
  })
  const message = prepared.message
  return message.shape === "wrapper" ? paths : build(prepared, new Map([[message.slots[0], paths]]), undefined)
}

const decodeJsonValue = (ctx: Context, prepared: JsonMessage, json: unknown, depth: number): unknown => {
  const message = prepared.message
  const oneof = message.oneofs[0]
  const number = json === null
    ? KIND_NULL
    : typeof json === "number"
    ? KIND_NUMBER
    : typeof json === "string"
    ? KIND_STRING
    : typeof json === "boolean"
    ? KIND_BOOL
    : Array.isArray(json)
    ? KIND_LIST
    : typeof json === "object"
    ? KIND_STRUCT
    : undefined
  const c = number === undefined ? undefined : oneof.cases.find((c) => c.number === number)
  if (c === undefined) throw new Wire.WireError("expected a JSON value", json)
  return build(
    prepared,
    new Map([[oneof, { _tag: c.tag, value: decodeValue(ctx, c.type, json, depth + 1) }]]),
    undefined
  )
}

const decodeStruct = (ctx: Context, prepared: JsonMessage, json: unknown, depth: number): unknown => {
  const slot = prepared.message.slots[0] as L.MapField
  return build(prepared, new Map([[slot, decodeField(ctx, slot, json, depth)]]), undefined)
}

const decodeList = (ctx: Context, prepared: JsonMessage, json: unknown, depth: number): unknown => {
  const slot = prepared.message.slots[0] as L.Repeated
  return build(prepared, new Map([[slot, decodeField(ctx, slot, json, depth)]]), undefined)
}

const decodeAny = (ctx: Context, prepared: JsonMessage, json: unknown, depth: number): unknown => {
  const message = prepared.message
  if (!isJsonObject(json)) throw new Wire.WireError("expected a JSON object for google.protobuf.Any", json)
  const [typeUrlSlot, valueSlot] = message.fields as unknown as [L.Singular, L.Singular]
  const typeUrl = json["@type"]
  if (typeUrl === undefined) {
    if (Object.keys(json).length > 0) throw new Wire.WireError("google.protobuf.Any has no @type", json)
    return build(prepared, new Map(), undefined)
  }
  if (typeof typeUrl !== "string" || typeUrl === "") {
    throw new Wire.WireError("expected a type URL", typeUrl)
  }
  const root = resolveAny(ctx, typeUrl)
  let inner: unknown
  if (isSpecial(ctx, root)) {
    if (!ctx.options.ignoreUnknownFields) {
      for (const key of Object.keys(json)) {
        if (key !== "@type" && key !== "value") {
          Wire.rethrowAt(new Wire.WireError("unknown field of google.protobuf.Any"), key)
        }
      }
    }
    if (!Object.hasOwn(json, "value")) throw new Wire.WireError("google.protobuf.Any has no value", json)
    try {
      inner = decodeValue(ctx, root, json.value, depth + 1)
    } catch (e) {
      Wire.rethrowAt(e, "value")
    }
  } else {
    const fields: Record<string, unknown> = {}
    for (const key of Object.keys(json)) if (key !== "@type") InternalRecord.assignProperty(fields, key, json[key])
    inner = decodeValue(ctx, root, fields, depth + 1)
  }
  return build(
    prepared,
    new Map<L.Slot, unknown>([[typeUrlSlot, typeUrl], [valueSlot, binaryCodec(root).encode(inner)]]),
    undefined
  )
}
