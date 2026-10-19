// Encodes and decodes the proto3 JSON form of values of the encoded side of a
// schema, as described by its layout. `Protobuf.toCodecJson` wraps this in a
// schema transformation.
//
// https://protobuf.dev/programming-guides/json/

import * as DateTime from "../../DateTime.ts"
import * as Duration_ from "../../Duration.ts"
import * as Base64 from "../../encoding/Base64.ts"
import * as Option from "../../Option.ts"
import * as Predicate from "../../Predicate.ts"
import * as Result from "../../Result.ts"
import type * as Schema from "../../Schema.ts"
import {
  enumNumber,
  enumValue,
  freshZero,
  isZero,
  joinDuration,
  matchCase,
  ownValue,
  present,
  setOwn,
  zeroScalar
} from "./codec.ts"
import {
  type Absent,
  BOX_VALUE,
  type Case,
  type EnumLayout,
  type Field,
  is64Bit,
  layoutError,
  type Message,
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
  BIGINT_NANOS_PER_SECOND,
  BIGINT_ZERO,
  FLOAT32_MAX,
  INT64_MAX,
  INT64_MIN,
  isInt32,
  isUint32,
  MAX_DEPTH,
  UINT64_MAX,
  WireError
} from "./wire.ts"

type Json = Schema.Json
type JsonRecord = Record<string, Json>

/** @internal */
export interface JsonCodec {
  readonly encode: (value: unknown) => Json
  // `strict` rejects unknown fields instead of ignoring them.
  readonly decode: (json: unknown, strict: boolean) => unknown
}

// Compiles the JSON encoder and decoder of a root layout. Both are synchronous
// and throw a `WireError` for invalid input.
/** @internal */
export function makeJsonCodec(root: Root): JsonCodec {
  switch (root._tag) {
    case "Void":
      return {
        encode: () => ({}),
        decode: (json, strict) => {
          const object = expectObject(json, "the root message")
          if (strict) rejectKeys(object)
          return root.value
        }
      }
    case "Wrapper":
      return {
        encode: (value) => encodeScalar(root.scalar, value),
        // A root wrapper has no field whose `null` could mean unset.
        decode: (json) => json === null ? zeroScalar(root.scalar) : decodeScalar(root.scalar, json)
      }
    default:
      prepare(root)
      return {
        encode: (value) => encodeValue(root, value),
        decode: (json, strict) => decodeValue(root, json, 0, strict)
      }
  }
}

// Rethrows an error with the key it occurred at prepended to its path.
function rethrowAt(e: unknown, key: PropertyKey | undefined): never {
  if (e instanceof WireError && key !== undefined) e.path.unshift(key)
  throw e
}

// -----------------------------------------------------------------------------
// names
// -----------------------------------------------------------------------------

interface JsonMessage {
  // The JSON name of each slot of a struct or box, in field-number order.
  readonly names: ReadonlyArray<string>
  // The slot of each accepted key: the JSON name and the property key.
  readonly byKey: ReadonlyMap<string, Slot>
}

const jsonMessages = new WeakMap<Message, JsonMessage>()

// Compiles the names of every message reachable from a layout, so that a
// property without a JSON name fails when the codec is created.
function prepare(type: ValueLayout): void {
  if (type._tag === "Message") jsonMessage(type.message)
}

function jsonMessage(message: Message): JsonMessage {
  const cached = jsonMessages.get(message)
  if (cached !== undefined) return cached
  const names: Array<string> = []
  const byKey = new Map<string, Slot>()
  const json: JsonMessage = { names, byKey }
  // Registered first, so that recursive messages resolve to this entry.
  jsonMessages.set(message, json)
  if (message.shape !== "tuple") {
    const claim = (key: string, slot: Slot) => {
      const other = byKey.get(key)
      if (other !== undefined && other !== slot) {
        throw layoutError(`${message.name} has two fields named "${key}" in JSON`)
      }
      byKey.set(key, slot)
    }
    for (const slot of message.sorted) {
      if (slot._tag === "Field" && slot.kind === "rest") {
        names.push("")
        continue
      }
      const name = protoName(message, slot)
      const jsonName = slot.jsonName ?? toJsonName(name)
      names.push(jsonName)
      claim(jsonName, slot)
      claim(name, slot)
    }
  }
  for (const slot of message.sorted) prepare(slot.type)
  return json
}

// The name of a slot in a `.proto` file: the property key, the tag of a tagged
// struct case, or the oneof name and number of any other case.
function protoName(message: Message, slot: Slot): string {
  if (slot._tag === "Field") return keyName(message, slot.key)
  const discriminator = slot.oneof.discriminator
  if (discriminator !== undefined) {
    const literal = slot.unwrap!.literals.find(([key]) => key === discriminator.key)![1]
    if (typeof literal === "string") return literal
  }
  return `${keyName(message, slot.oneof.key)}_${slot.number}`
}

function keyName(message: Message, key: PropertyKey): string {
  if (key === BOX_VALUE) return "value"
  if (typeof key !== "string") throw layoutError(`property ${String(key)} of ${message.name} has no JSON name`)
  return key
}

// The JSON name protoc derives from a field name.
function toJsonName(name: string): string {
  let out = ""
  let upper = false
  for (const char of name) {
    if (char === "_") {
      upper = true
    } else if (upper) {
      out += char.toUpperCase()
      upper = false
    } else {
      out += char
    }
  }
  return out
}

// -----------------------------------------------------------------------------
// encode
// -----------------------------------------------------------------------------

function encodeValue(type: ValueLayout, value: unknown): Json {
  switch (type._tag) {
    case "Scalar":
      return encodeScalar(type, value)
    case "Wrapper":
      return encodeScalar(type.scalar, value)
    case "Enum": {
      const n = enumNumber(type, value)
      return type.names?.get(n) ?? n
    }
    case "Symbol": {
      const key = typeof value === "symbol" ? Symbol.keyFor(value) : undefined
      if (key === undefined) throw new WireError("expected a registered symbol (Symbol.for)", value)
      return key
    }
    case "Constant":
      return {}
    case "Message":
      return type.message.shape === "tuple" ? encodeTuple(type.message, value) : encodeMessage(type.message, value)
    case "Wkt":
      return encodeWkt(type.wkt, value)
  }
}

function encodeMessage(message: Message, value: unknown): JsonRecord {
  const box = message.shape === "box"
  if (!box && !Predicate.isObject(value)) throw new WireError(`expected an object for ${message.name}`, value)
  if (message.name === "google.protobuf.Any") throw anyError(value)
  const { names } = jsonMessage(message)
  const out: JsonRecord = {}
  const container = value as Record<PropertyKey, unknown>
  let key: PropertyKey | undefined
  try {
    // The case of each oneof, written at the position of its field number.
    let cases: Array<Case | undefined> | undefined
    if (message.oneofs.length > 0) {
      cases = []
      for (const oneof of message.oneofs) {
        key = oneof.key
        const v = present(oneof, box ? value : ownValue(container, key))
        const c = v === undefined ? undefined : matchCase(oneof, v)
        if (v !== undefined && c === undefined) throw new WireError("value matches no oneof case", v)
        cases.push(c)
      }
    }
    const sorted = message.sorted
    for (let i = 0; i < sorted.length; i++) {
      const slot = sorted[i]
      if (slot._tag === "Case") {
        if (cases![slot.oneof.index] !== slot) continue
        key = slot.oneof.key
        const v = present(slot.oneof, box ? value : ownValue(container, key))
        setOwn(
          out,
          names[i],
          encodeValue(slot.type, slot.unwrap === undefined ? v : (v as Record<string, unknown>)[slot.unwrap.key])
        )
      } else if (slot.kind === "rest") {
        key = undefined
        encodeRest(message, slot, container, out)
      } else {
        key = slot.key
        const json = encodeField(slot, box ? value : ownValue(container, key), false)
        if (json !== undefined) setOwn(out, names[i], json)
      }
    }
  } catch (e) {
    rethrowAt(e, key === BOX_VALUE ? undefined : key)
  }
  return out
}

// `null` stands for an absent field, except for a `google.protobuf.Value`.
function isNullValue(type: ValueLayout, value: unknown): boolean {
  return value === null && type._tag === "Wkt" && type.wkt === "value"
}

// The JSON of a field, or `undefined` when it is left out. Tuple elements
// (`element`) are written whenever they are present.
function encodeField(field: Field, value: unknown, element: boolean): Json | undefined {
  const v = present(field, value)
  if (v === undefined) return undefined
  switch (field.kind) {
    case "singular":
      if (!element && field.absent === "zero" && !field.always && isZero(field.type, v)) return undefined
      return encodeValue(field.type, v)
    case "repeated": {
      if (!Array.isArray(v)) throw new WireError("expected an array", v)
      if (v.length === 0 && !element) return undefined
      const out: Array<Json> = []
      let i = 0
      try {
        for (; i < v.length; i++) out.push(encodeValue(field.type, v[i]))
      } catch (e) {
        rethrowAt(e, i)
      }
      return out
    }
    case "map": {
      if (!Predicate.isObject(v)) throw new WireError("expected a record", v)
      const record = v as Record<string, unknown>
      const out: JsonRecord = {}
      let empty = true
      for (const k of Object.keys(record)) {
        const entry = record[k]
        if (entry === undefined && field.optionalValues) continue
        try {
          setOwn(out, encodeMapKey(field.mapKey!, k), encodeValue(field.type, entry))
        } catch (e) {
          rethrowAt(e, k)
        }
        empty = false
      }
      return empty && !element ? undefined : out
    }
    case "rest":
      return undefined
  }
}

// The entries of an index signature are properties of the object itself.
function encodeRest(message: Message, field: Field, container: Record<PropertyKey, unknown>, out: JsonRecord): void {
  const { byKey } = jsonMessage(message)
  for (const k of field.keysOf!(container)) {
    if (typeof k !== "string" || message.declared.has(k) || claimedBefore(message, field, k)) continue
    const value = container[k]
    if (value === undefined && field.optionalValues) continue
    try {
      if (byKey.has(k)) throw new WireError("key is the JSON name of a field")
      encodeMapKey(field.mapKey!, k)
      setOwn(out, k, encodeValue(field.type, value))
    } catch (e) {
      rethrowAt(e, k)
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

function encodeTuple(message: Message, value: unknown): Array<Json> {
  if (!Array.isArray(value)) throw new WireError(`expected an array for ${message.name}`, value)
  const out: Array<Json> = []
  let i = 0
  try {
    for (; i < message.elements && i < value.length; i++) {
      const field = message.byNumber.get(i + 1) as Field | undefined
      // A nullish element is a constant.
      out.push(field === undefined ? null : encodeField(field, value[i], true) ?? null)
    }
    const rest = message.byNumber.get(message.elements + 1) as Field | undefined
    if (rest !== undefined && rest.key === TUPLE_REST) {
      for (; i < value.length; i++) out.push(encodeValue(rest.type, value[i]))
    }
  } catch (e) {
    rethrowAt(e, i)
  }
  return out
}

function expected(scalar: ScalarName, value: unknown): never {
  throw new WireError(`expected a protobuf ${scalar}`, value)
}

function encodeScalar(type: ScalarLayout, value: unknown): Json {
  const scalar = type.scalar
  switch (scalar) {
    case "double":
    case "float":
      if (typeof value !== "number") expected(scalar, value)
      if (Number.isFinite(value)) {
        if (scalar === "float" && Math.abs(value) > FLOAT32_MAX) expected(scalar, value)
        return value
      }
      return Number.isNaN(value) ? "NaN" : value > 0 ? "Infinity" : "-Infinity"
    case "int32":
    case "sint32":
    case "sfixed32":
      if (typeof value !== "number" || !isInt32(value)) expected(scalar, value)
      return value
    case "uint32":
    case "fixed32":
      if (typeof value !== "number" || !isUint32(value)) expected(scalar, value)
      return value
    case "int64":
    case "uint64":
    case "sint64":
    case "fixed64":
    case "sfixed64": {
      const n = typeof value === "bigint"
        ? value
        : type.asNumber && typeof value === "number" && Number.isSafeInteger(value)
        ? BigInt(value)
        : undefined
      if (n === undefined || !inRange(scalar, n)) expected(scalar, value)
      return String(n)
    }
    case "bool":
      if (typeof value !== "boolean") expected(scalar, value)
      return value
    case "string":
      if (typeof value !== "string") expected(scalar, value)
      return value
    case "bytes":
      if (!(value instanceof Uint8Array)) expected(scalar, value)
      return Base64.encode(value)
  }
}

// Map keys are strings; integer keys are written in decimal.
function encodeMapKey(type: ScalarLayout, key: string): string {
  switch (type.scalar) {
    case "string":
      return key
    case "bool":
      if (key === "true" || key === "false") return key
      break
    case "double":
    case "float":
      if (String(Number(key)) === key) return key
      break
    default:
      if (INTEGER.test(key)) {
        const n = BigInt(key)
        if (inRange(type.scalar, n)) return String(n)
      }
  }
  throw new WireError(`expected a protobuf ${type.scalar} map key`, key)
}

const INTEGER = /^-?\d+$/

function encodeWkt(wkt: WktName, value: unknown): Json {
  switch (wkt) {
    case "timestamp":
    case "date": {
      const millis = wkt === "timestamp"
        ? (DateTime.isDateTime(value) ? DateTime.toEpochMillis(value) : NaN)
        : (value instanceof Date ? value.getTime() : NaN)
      if (!Number.isFinite(millis)) throw new WireError("expected a valid timestamp", value)
      if (millis < MIN_TIMESTAMP_MILLIS || millis > MAX_TIMESTAMP_MILLIS) {
        throw new WireError("timestamp out of range (years 0001 to 9999)", value)
      }
      const iso = new Date(millis).toISOString()
      return millis % 1000 === 0 ? `${iso.slice(0, 19)}Z` : iso
    }
    case "duration": {
      if (!Duration_.isDuration(value) || !Duration_.isFinite(value)) {
        throw new WireError("expected a finite duration", value)
      }
      const total = Duration_.toNanosUnsafe(value)
      const abs = total < BIGINT_ZERO ? -total : total
      if (abs > MAX_DURATION_NANOS) throw new WireError("duration out of range (±315576000000 seconds)", value)
      const seconds = abs / BIGINT_NANOS_PER_SECOND
      const nanos = Number(abs - seconds * BIGINT_NANOS_PER_SECOND)
      return `${total < BIGINT_ZERO ? "-" : ""}${seconds}${nanos === 0 ? "" : `.${fraction(nanos)}`}s`
    }
    case "value":
      return copyJson(value, 0)
    case "struct":
      if (!Predicate.isObject(value) || Array.isArray(value)) throw new WireError("expected a JSON object", value)
      return copyJson(value, 0)
    case "listValue":
      if (!Array.isArray(value)) throw new WireError("expected a JSON array", value)
      return copyJson(value, 0)
  }
}

// Nanoseconds as 3, 6, or 9 digits.
function fraction(nanos: number): string {
  const digits = String(nanos).padStart(9, "0")
  return digits.endsWith("000000") ? digits.slice(0, 3) : digits.endsWith("000") ? digits.slice(0, 6) : digits
}

// Copies a `google.protobuf.Value`, which holds JSON values only.
function copyJson(value: unknown, depth: number): Json {
  if (depth > MAX_DEPTH) throw new WireError(`nesting deeper than ${MAX_DEPTH}`)
  switch (typeof value) {
    case "number":
      if (!Number.isFinite(value)) throw new WireError("expected a finite number", value)
      return value
    case "string":
    case "boolean":
      return value
    case "object": {
      if (value === null) return null
      if (Array.isArray(value)) {
        const out: Array<Json> = []
        let i = 0
        try {
          for (; i < value.length; i++) out.push(copyJson(value[i], depth + 1))
        } catch (e) {
          rethrowAt(e, i)
        }
        return out
      }
      const record = value as Record<string, unknown>
      const out: JsonRecord = {}
      for (const key of Object.keys(record)) {
        try {
          setOwn(out, key, copyJson(record[key], depth + 1))
        } catch (e) {
          rethrowAt(e, key)
        }
      }
      return out
    }
  }
  throw new WireError("expected a JSON value", value)
}

function anyError(value: unknown): WireError {
  return new WireError("google.protobuf.Any has no JSON mapping without a type registry", value)
}

// -----------------------------------------------------------------------------
// decode
// -----------------------------------------------------------------------------

function decodeValue(type: ValueLayout, json: unknown, depth: number, strict: boolean): unknown {
  switch (type._tag) {
    case "Scalar":
      return decodeScalar(type, json)
    case "Wrapper":
      return decodeScalar(type.scalar, json)
    case "Enum":
      return decodeEnum(type, json)
    case "Symbol":
      if (typeof json !== "string") throw new WireError("expected a string", json)
      return Symbol.for(json)
    case "Constant": {
      const object = expectObject(json, "a literal")
      if (strict) rejectKeys(object)
      return type.value
    }
    case "Message":
      if (depth > MAX_DEPTH) throw new WireError(`nesting deeper than ${MAX_DEPTH}`)
      return type.message.shape === "tuple"
        ? decodeTuple(type.message, json, depth + 1, strict)
        : decodeMessage(type.message, json, depth + 1, strict)
    case "Wkt":
      return decodeWkt(type.wkt, json, depth + 1)
  }
}

function expectObject(json: unknown, what: string): Record<string, unknown> {
  if (!Predicate.isObject(json) || Array.isArray(json)) throw new WireError(`expected an object for ${what}`, json)
  return json as Record<string, unknown>
}

function rejectKeys(object: Record<string, unknown>): void {
  for (const key of Object.keys(object)) rethrowAt(new WireError("unknown field"), key)
}

function decodeMessage(message: Message, json: unknown, depth: number, strict: boolean): unknown {
  const object = expectObject(json, message.name)
  if (message.name === "google.protobuf.Any") throw anyError(json)
  const { byKey } = jsonMessage(message)
  const acc: Record<PropertyKey, unknown> = {}
  // The slots and oneofs set so far, to reject a second spelling or case.
  let seen: Set<Slot | Oneof> | undefined
  for (const key of Object.keys(object)) {
    const value = object[key]
    try {
      const slot = byKey.get(key)
      if (slot === undefined) {
        const rest = message.declared.has(key)
          ? undefined
          : message.rest.find((field) => field.keysOf!({ [key]: null }).length > 0)
        if (rest !== undefined) {
          setOwn(acc, decodeMapKey(rest.mapKey!, key), decodeValue(rest.type, value, depth, strict))
        } else if (strict) throw new WireError("unknown field")
        continue
      }
      seen ??= new Set()
      if (seen.has(slot)) throw new WireError("field is set twice, by its JSON name and its property key")
      seen.add(slot)
      if (slot._tag === "Case") {
        if (value === null && !isNullValue(slot.type, value)) continue
        const oneof = slot.oneof
        if (seen.has(oneof)) throw new WireError("more than one case of a oneof is set")
        seen.add(oneof)
        let v = decodeValue(slot.type, value, depth, strict)
        if (slot.unwrap !== undefined) {
          const member: Record<string, unknown> = {}
          for (const [k, literal] of slot.unwrap.literals) member[k] = literal
          member[slot.unwrap.key] = v
          v = member
        }
        setOwn(acc, oneof.key, oneof.absent === "none" ? Option.some(v) : v)
        continue
      }
      const v = decodeField(slot, value, depth, strict)
      if (v !== undefined) setOwn(acc, slot.key, slot.absent === "none" ? Option.some(v) : v)
    } catch (e) {
      rethrowAt(e, key)
    }
  }
  for (const [k, literal] of message.literals) setOwn(acc, k, literal)
  for (const field of message.fields) {
    if (!Object.hasOwn(acc, field.key)) fillAbsent(acc, field.key, field.absent, field)
  }
  for (const oneof of message.oneofs) {
    if (!Object.hasOwn(acc, oneof.key)) fillAbsent(acc, oneof.key, oneof.absent, undefined)
  }
  if (message.unknown !== undefined && !message.unknown.optional) {
    setOwn(acc, message.unknown.key, new Uint8Array(0))
  }
  return message.shape === "box" ? acc[BOX_VALUE] : acc
}

// The value of a field, or `undefined` when it is absent: `null`, or an empty
// list or map, which protobuf does not tell apart from an absent one.
function decodeField(field: Field, json: unknown, depth: number, strict: boolean): unknown {
  if (json === null && !(field.kind === "singular" && isNullValue(field.type, json))) return undefined
  switch (field.kind) {
    case "singular":
      return decodeValue(field.type, json, depth, strict)
    case "repeated": {
      if (!Array.isArray(json)) throw new WireError("expected an array", json)
      const list: Array<unknown> = []
      let i = 0
      try {
        for (; i < json.length; i++) list.push(decodeValue(field.type, json[i], depth, strict))
      } catch (e) {
        rethrowAt(e, i)
      }
      return list.length === 0 ? undefined : list
    }
    default: {
      const object = expectObject(json, "a map")
      const record: Record<string, unknown> = {}
      let empty = true
      for (const k of Object.keys(object)) {
        try {
          setOwn(record, decodeMapKey(field.mapKey!, k), decodeValue(field.type, object[k], depth, strict))
        } catch (e) {
          rethrowAt(e, k)
        }
        empty = false
      }
      return empty ? undefined : record
    }
  }
}

function fillAbsent(acc: Record<PropertyKey, unknown>, key: PropertyKey, absent: Absent, field: Field | undefined) {
  switch (absent) {
    case "zero":
      setOwn(acc, key, freshZero(field!))
      return
    case "null":
      setOwn(acc, key, null)
      return
    case "undefined":
      setOwn(acc, key, undefined)
      return
    case "none":
      setOwn(acc, key, Option.none())
      return
    case "constant":
      setOwn(acc, key, field!.constant)
      return
  }
}

function decodeTuple(message: Message, json: unknown, depth: number, strict: boolean): Array<unknown> {
  if (!Array.isArray(json)) throw new WireError(`expected an array for ${message.name}`, json)
  const out: Array<unknown> = []
  let i = 0
  try {
    for (; i < message.elements; i++) {
      const field = message.byNumber.get(i + 1) as Field | undefined
      if (field === undefined) {
        // A nullish element is a constant, restored like the binary codec does.
        out.push(message.literals.find(([k]) => k === i)![1])
        continue
      }
      if (i >= json.length) break
      const v = decodeField(field, json[i], depth, strict)
      if (v !== undefined) {
        out.push(v)
      } else if (field.absent === "zero" || field.absent === "constant") {
        out.push(field.absent === "zero" ? freshZero(field) : field.constant)
      } else {
        break
      }
    }
    const rest = message.byNumber.get(message.elements + 1) as Field | undefined
    if (out.length === message.elements && rest !== undefined && rest.key === TUPLE_REST) {
      for (; i < json.length; i++) out.push(decodeValue(rest.type, json[i], depth, strict))
    } else if (strict && json.length > out.length) {
      i = out.length
      throw new WireError("unexpected tuple element")
    }
  } catch (e) {
    rethrowAt(e, i)
  }
  return out
}

function decodeEnum(type: EnumLayout, json: unknown): unknown {
  if (typeof json === "string") {
    if (type.byName?.has(json)) return type.byName.get(json)
    throw new WireError("unknown enum value name", json)
  }
  if (typeof json === "number" && isInt32(json)) return enumValue(type, json === 0 ? 0 : json)
  throw new WireError("expected an enum value name or number", json)
}

// Numbers in JSON number syntax, possibly quoted.
const NUMBER = /^(-)?(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/

// An integer written in decimal, possibly with a fraction of zeros or an
// exponent, or `undefined`.
function parseInteger(text: string): bigint | undefined {
  const m = NUMBER.exec(text)
  if (m === null) return undefined
  const fraction = m[3] ?? ""
  let digits = (m[2] + fraction).replace(/^0+/, "")
  if (digits === "") return BIGINT_ZERO
  const exponent = Number(m[4] ?? 0) - fraction.length
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

function inRange(scalar: ScalarName, n: bigint): boolean {
  switch (scalar) {
    case "uint32":
    case "fixed32":
      return n >= BIGINT_ZERO && n <= UINT32_MAX
    case "uint64":
    case "fixed64":
      return n >= BIGINT_ZERO && n <= UINT64_MAX
    default:
      return is64Bit(scalar) ? n >= INT64_MIN && n <= INT64_MAX : n >= INT32_MIN && n <= INT32_MAX
  }
}

const INT32_MIN = BigInt(-2147483648)
const INT32_MAX = BigInt(2147483647)
const UINT32_MAX = BigInt(4294967295)

// An integer from a JSON number or a numeric string.
function decodeInteger(type: ScalarLayout, json: unknown): number | bigint {
  const scalar = type.scalar
  const n = typeof json === "number"
    ? (Number.isInteger(json) ? BigInt(json) : undefined)
    : typeof json === "string"
    ? parseInteger(json)
    : undefined
  if (n === undefined || !inRange(scalar, n)) expected(scalar, json)
  if (!is64Bit(scalar)) return Number(n)
  if (!type.asNumber) return n
  if (n > BIGINT_MAX_SAFE || n < -BIGINT_MAX_SAFE) {
    throw new WireError(`${scalar} value ${n} is outside the safe integer range`, json)
  }
  return Number(n)
}

function decodeScalar(type: ScalarLayout, json: unknown): unknown {
  const scalar = type.scalar
  switch (scalar) {
    case "double":
    case "float": {
      const n = typeof json === "number"
        ? json
        : typeof json === "string"
        ? (json === "NaN" ? NaN : json === "Infinity" ? Infinity : json === "-Infinity" ? -Infinity : decimal(json))
        : undefined
      if (n === undefined || (scalar === "float" && Number.isFinite(n) && Math.abs(n) > FLOAT32_MAX)) {
        expected(scalar, json)
      }
      return n
    }
    case "bool":
      if (typeof json !== "boolean") expected(scalar, json)
      return json
    case "string":
      if (typeof json !== "string") expected(scalar, json)
      return json
    case "bytes":
      return decodeBytes(json)
    default:
      return decodeInteger(type, json)
  }
}

// A finite number in JSON number syntax, or `undefined`.
function decimal(text: string): number | undefined {
  if (!NUMBER.test(text)) return undefined
  const n = Number(text)
  return Number.isFinite(n) ? n : undefined
}

const BASE64 = /^[A-Za-z0-9+/_-]*={0,2}$/

// Standard or URL-safe base64, with or without padding.
function decodeBytes(json: unknown): Uint8Array {
  if (typeof json === "string" && BASE64.test(json)) {
    const text = json.replace(/=+$/, "").replaceAll("-", "+").replaceAll("_", "/")
    if (text.length % 4 !== 1) {
      const result = Base64.decode(text + "=".repeat((4 - text.length % 4) % 4))
      if (Result.isSuccess(result)) return result.success
    }
  }
  throw new WireError("expected base64 bytes", json)
}

function decodeMapKey(type: ScalarLayout, key: string): string {
  switch (type.scalar) {
    case "string":
      return key
    case "bool":
      if (key === "true" || key === "false") return key
      break
    case "double":
    case "float": {
      const n = decodeScalar(type, key) as number
      return String(n)
    }
    default: {
      const n = parseInteger(key)
      if (n !== undefined && inRange(type.scalar, n)) return String(n)
    }
  }
  throw new WireError(`expected a protobuf ${type.scalar} map key`, key)
}

function decodeWkt(wkt: WktName, json: unknown, depth: number): unknown {
  switch (wkt) {
    case "timestamp":
    case "date": {
      const millis = typeof json === "string" ? parseTimestamp(json) : undefined
      if (millis === undefined) throw new WireError("expected an RFC 3339 timestamp", json)
      if (millis < MIN_TIMESTAMP_MILLIS || millis > MAX_TIMESTAMP_MILLIS) {
        throw new WireError("timestamp out of range (years 0001 to 9999)", json)
      }
      return wkt === "date" ? new Date(millis) : DateTime.makeUnsafe(millis)
    }
    case "duration": {
      const m = typeof json === "string" ? DURATION.exec(json) : null
      if (m === null) throw new WireError("expected a duration in seconds, such as \"1.5s\"", json)
      const seconds = BigInt(m[2])
      if (seconds > MAX_DURATION_SECONDS) throw new WireError("duration out of range (±315576000000 seconds)", json)
      const nanos = m[3] === undefined ? 0 : Number(m[3].padEnd(9, "0"))
      return m[1] === "-" ? joinDuration(-seconds, -nanos) : joinDuration(seconds, nanos)
    }
    case "value":
      return copyJson(json, depth)
    case "struct":
      if (!Predicate.isObject(json) || Array.isArray(json)) throw new WireError("expected a JSON object", json)
      return copyJson(json, depth)
    case "listValue":
      if (!Array.isArray(json)) throw new WireError("expected a JSON array", json)
      return copyJson(json, depth)
  }
}

const DURATION = /^(-)?(\d+)(?:\.(\d{1,9}))?s$/
const MAX_DURATION_SECONDS = BigInt(315_576_000_000)
const MAX_DURATION_NANOS = MAX_DURATION_SECONDS * BIGINT_NANOS_PER_SECOND + BigInt(999_999_999)

// 0001-01-01T00:00:00Z and 9999-12-31T23:59:59.999Z
const MIN_TIMESTAMP_MILLIS = -62_135_596_800_000
const MAX_TIMESTAMP_MILLIS = 253_402_300_799_999

// Upper-case `T` and `Z` only, as the spec's strict profile requires.
const TIMESTAMP = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?(?:Z|([+-])(\d{2}):(\d{2}))$/

// The epoch milliseconds of an RFC 3339 timestamp; sub-millisecond digits are
// dropped, as `DateTime.Utc` and `Date` cannot hold them.
function parseTimestamp(text: string): number | undefined {
  const m = TIMESTAMP.exec(text)
  if (m === null) return undefined
  const year = Number(m[1])
  const month = Number(m[2]) - 1
  const day = Number(m[3])
  const hours = Number(m[4])
  const minutes = Number(m[5])
  const seconds = Number(m[6])
  if (hours > 23 || minutes > 59 || seconds > 59) return undefined
  const date = new Date(0)
  date.setUTCFullYear(year, month, day)
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month || date.getUTCDate() !== day) return undefined
  let offset = 0
  if (m[8] !== undefined) {
    const offsetHours = Number(m[9])
    const offsetMinutes = Number(m[10])
    if (offsetHours > 23 || offsetMinutes > 59) return undefined
    offset = (m[8] === "-" ? -1 : 1) * (offsetHours * 60 + offsetMinutes) * 60_000
  }
  const millis = m[7] === undefined ? 0 : Number(m[7].padEnd(9, "0").slice(0, 3))
  return date.getTime() + ((hours * 60 + minutes) * 60 + seconds) * 1000 + millis - offset
}
