/**
 * Proto3 canonical JSON mapping over a compiled layout.
 *
 * https://protobuf.dev/programming-guides/json/
 *
 * PROTOTYPE.
 */
import * as DateTime from "effect/DateTime"
import type * as Duration from "effect/Duration"
import * as Option from "effect/Option"
import type { ScalarType } from "./annotations.ts"
import {
  EncodeError,
  enumNumber,
  enumValue,
  finishMessage,
  joinDuration,
  joinTimestampMillis,
  mapKeyFromString,
  scalarZero,
  splitDuration,
  splitMillis,
  zeroOf
} from "./binary.ts"
import type { FieldEntry, MessageDesc, OneofEntry, Root, ScalarValue, ValueType } from "./layout.ts"
import { base64Decode, base64Encode } from "./wire.ts"

type Json = null | boolean | number | string | ReadonlyArray<Json> | { readonly [key: string]: Json }

/** @internal */
export class JsonError extends Error {
  override readonly name = "Protobuf.JsonError"
}

// -----------------------------------------------------------------------------
// encode
// -----------------------------------------------------------------------------

/** @internal */
export const encodeRootJson = (root: Root, value: unknown): Json =>
  root._ === "void" ? {} : encodeMessageJson(root.desc, value)

const encodeMessageJson = (desc: MessageDesc, value: unknown): Json => {
  if (typeof value !== "object" || value === null) {
    throw new EncodeError(`expected an object for message ${desc.typeName ?? "<anonymous>"}`)
  }
  const obj = value as Record<string, unknown>
  const out: Record<string, Json> = {}
  for (const entry of desc.entries) {
    if (entry._ === "oneof") {
      encodeOneofJson(entry, obj[entry.key], out)
      continue
    }
    let v = obj[entry.key]
    if (v === undefined || v === null) continue
    if (Option.isOption(v)) {
      if (Option.isNone(v)) continue
      v = v.value
    }
    switch (entry.card) {
      case "repeated": {
        const items = v as ReadonlyArray<unknown>
        if (items.length === 0) continue
        out[entry.jsonName] = items.map((item) => encodeValueJson(entry.type, item))
        break
      }
      case "map": {
        const record = v as Record<string, unknown>
        const keys = Object.keys(record)
        if (keys.length === 0) continue
        const m: Record<string, Json> = {}
        for (const k of keys) m[k] = encodeValueJson(entry.type, record[k])
        out[entry.jsonName] = m
        break
      }
      case "singular":
        if (entry.absent === "zero" && isZeroJson(entry, v)) continue
        out[entry.jsonName] = encodeValueJson(entry.type, v)
    }
  }
  return out
}

const encodeOneofJson = (entry: OneofEntry, v: unknown, out: Record<string, Json>) => {
  if (v === undefined || v === null) return
  for (const c of entry.cases) {
    if (!c.guard(v)) continue
    const inner = c.unwrap !== undefined ? (v as Record<string, unknown>)[c.unwrap.key] : v
    out[c.jsonName] = encodeValueJson(c.type, inner)
    return
  }
}

const isZeroJson = (entry: FieldEntry, v: unknown): boolean => {
  const type = entry.type
  if (type._ === "enum") return enumNumber(type.desc, v) === 0
  if (type._ !== "scalar" || type.wrapper) return false
  if (type.scalar === "bytes") return (v as Uint8Array).length === 0
  return v === scalarZero(type.scalar) || (type.int64AsNumber && v === 0)
}

const encodeValueJson = (type: ValueType, v: unknown): Json => {
  switch (type._) {
    case "scalar":
      return encodeScalarJson(type, v)
    case "enum": {
      const n = enumNumber(type.desc, v)
      return type.desc.byNumber.get(n)?.name ?? n
    }
    case "message":
      return encodeMessageJson(type.desc, v)
    case "wkt":
      return encodeWktJson(type.wkt, v)
    case "convert":
      return encodeValueJson(type.inner, type.toWire(v))
  }
}

const encodeScalarJson = (type: ScalarValue, v: unknown): Json => {
  switch (type.scalar) {
    case "double":
    case "float": {
      const n = v as number
      if (Number.isNaN(n)) return "NaN"
      if (n === Infinity) return "Infinity"
      if (n === -Infinity) return "-Infinity"
      return n
    }
    case "int64":
    case "uint64":
    case "sint64":
    case "fixed64":
    case "sfixed64":
      return String(v)
    case "bytes":
      return base64Encode(v as Uint8Array)
    default:
      return v as Json
  }
}

const encodeWktJson = (wkt: string, v: unknown): Json => {
  switch (wkt) {
    case "timestamp":
    case "timestampDate": {
      const millis = wkt === "timestamp" ? DateTime.toEpochMillis(v as DateTime.Utc) : (v as Date).getTime()
      const { nanos } = splitMillis(millis)
      const iso = new Date(millis).toISOString()
      return nanos === 0 ? iso.replace(".000Z", "Z") : iso
    }
    case "duration": {
      const { nanos, seconds } = splitDuration(v as Duration.Duration)
      let text = seconds.toString()
      if (nanos !== 0) {
        let digits = Math.abs(nanos).toString().padStart(9, "0")
        if (digits.endsWith("000000")) digits = digits.slice(0, 3)
        else if (digits.endsWith("000")) digits = digits.slice(0, 6)
        text += "." + digits
        if (nanos < 0 && seconds === BigInt(0)) text = "-" + text
      }
      return text + "s"
    }
    default:
      return v as Json
  }
}

// -----------------------------------------------------------------------------
// decode
// -----------------------------------------------------------------------------

/** @internal */
export const decodeRootJson = (root: Root, json: unknown): unknown => {
  if (root._ === "void") return undefined
  return decodeMessageJson(root.desc, json)
}

const isObject = (u: unknown): u is Record<string, unknown> => typeof u === "object" && u !== null && !Array.isArray(u)

const decodeMessageJson = (desc: MessageDesc, json: unknown): Record<string, unknown> => {
  if (!isObject(json)) {
    throw new JsonError(`expected a JSON object for message ${desc.typeName ?? "<anonymous>"}`)
  }
  const obj: Record<string, unknown> = {}
  for (const jsonKey of Object.keys(json)) {
    const slot = desc.byJsonName.get(jsonKey)
    // unknown fields are ignored, mirroring how structs drop excess keys
    if (slot === undefined) continue
    const v = json[jsonKey]
    if ("case" in slot) {
      if (v === null && !isValueWkt(slot.case.type)) continue
      const value = decodeValueJson(slot.case.type, v)
      if (slot.case.unwrap !== undefined) {
        const member: Record<string, unknown> = {}
        for (const [k, lit] of slot.case.unwrap.literals) member[k] = lit
        member[slot.case.unwrap.key] = value
        obj[slot.entry.key] = member
      } else {
        obj[slot.entry.key] = value
      }
      continue
    }
    const field = slot.entry
    if (v === null && !(field.card === "singular" && isValueWkt(field.type))) continue
    switch (field.card) {
      case "repeated":
        if (!Array.isArray(v)) throw new JsonError(`expected an array for ${field.jsonName}`)
        obj[field.key] = v.map((item) => decodeValueJson(field.type, item))
        break
      case "map": {
        if (!isObject(v)) throw new JsonError(`expected an object for ${field.jsonName}`)
        const record: Record<string, unknown> = {}
        for (const k of Object.keys(v)) {
          record[String(mapKeyFromString(field.mapKey!, k))] = decodeValueJson(field.type, v[k])
        }
        obj[field.key] = record
        break
      }
      case "singular": {
        const value = decodeValueJson(field.type, v)
        obj[field.key] = field.absent === "none" ? Option.some(value) : value
      }
    }
  }
  finishMessage(desc, obj)
  return obj
}

const isValueWkt = (type: ValueType) => type._ === "wkt" && type.wkt === "value"

const decodeValueJson = (type: ValueType, v: unknown): unknown => {
  switch (type._) {
    case "scalar":
      if (v === null) return zeroOf(type)
      return decodeScalarJson(type, v)
    case "enum": {
      if (typeof v === "string") {
        const found = type.desc.byName.get(v)
        if (found === undefined) throw new JsonError(`unknown enum value ${v}`)
        return found.value
      }
      if (typeof v === "number" && Number.isInteger(v)) return enumValue(type.desc, v)
      throw new JsonError(`invalid enum value ${JSON.stringify(v)}`)
    }
    case "message":
      return decodeMessageJson(type.desc, v)
    case "wkt":
      return decodeWktJson(type.wkt, v)
    case "convert":
      return type.fromWire(decodeValueJson(type.inner, v))
  }
}

const decodeScalarJson = (type: ScalarValue, v: unknown): unknown => {
  const scalar: ScalarType = type.scalar
  switch (scalar) {
    case "double":
    case "float":
      if (typeof v === "number") return v
      if (v === "NaN") return NaN
      if (v === "Infinity") return Infinity
      if (v === "-Infinity") return -Infinity
      if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v)
      break
    case "int32":
    case "uint32":
    case "sint32":
    case "fixed32":
    case "sfixed32": {
      const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN
      if (Number.isInteger(n)) return n
      break
    }
    case "int64":
    case "uint64":
    case "sint64":
    case "fixed64":
    case "sfixed64": {
      if ((typeof v === "number" && Number.isInteger(v)) || (typeof v === "string" && /^-?\d+$/.test(v))) {
        const big = BigInt(v)
        return type.int64AsNumber ? Number(big) : big
      }
      break
    }
    case "bool":
      if (typeof v === "boolean") return v
      break
    case "string":
      if (typeof v === "string") return v
      break
    case "bytes":
      if (typeof v === "string") return base64Decode(v)
      break
  }
  throw new JsonError(`invalid ${scalar} value ${JSON.stringify(v)}`)
}

const TIMESTAMP_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?(Z|[+-]\d{2}:\d{2})$/i
const DURATION_RE = /^(-)?(\d+)(?:\.(\d{1,9}))?s$/

const decodeWktJson = (wkt: string, v: unknown): unknown => {
  switch (wkt) {
    case "timestamp":
    case "timestampDate": {
      if (typeof v !== "string") throw new JsonError("expected an RFC 3339 string for google.protobuf.Timestamp")
      const m = TIMESTAMP_RE.exec(v)
      if (m === null) throw new JsonError(`invalid google.protobuf.Timestamp ${v}`)
      const base = Date.parse(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}${m[8].toUpperCase()}`)
      if (Number.isNaN(base)) throw new JsonError(`invalid google.protobuf.Timestamp ${v}`)
      const nanos = m[7] === undefined ? 0 : Number(m[7].padEnd(9, "0"))
      const millis = joinTimestampMillis(BigInt(base / 1000), nanos)
      return wkt === "timestamp" ? DateTime.makeUnsafe(millis) : new Date(millis)
    }
    case "duration": {
      if (typeof v !== "string") throw new JsonError("expected a string for google.protobuf.Duration")
      const m = DURATION_RE.exec(v)
      if (m === null) throw new JsonError(`invalid google.protobuf.Duration ${v}`)
      const sign = m[1] === "-" ? -1 : 1
      const seconds = BigInt(m[2]) * BigInt(sign)
      const nanos = (m[3] === undefined ? 0 : Number(m[3].padEnd(9, "0"))) * sign
      return joinDuration(seconds, nanos)
    }
    default:
      return v
  }
}
