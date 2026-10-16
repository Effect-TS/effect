/**
 * Binary wire format over a compiled layout. Values are on the encoded side of
 * the schema.
 *
 * PROTOTYPE.
 */
import * as DateTime from "effect/DateTime"
import * as Duration from "effect/Duration"
import * as Option from "effect/Option"
import type { ScalarType } from "./annotations.ts"
import type { EnumDesc, FieldEntry, MessageDesc, OneofEntry, Root, ScalarValue, ValueType } from "./layout.ts"
import { BinaryReader, BinaryWriter, WireError, WireType } from "./wire.ts"

const BIG_0 = BigInt(0)
const BIG_1E9 = BigInt(1_000_000_000)
const BIG_1E6 = BigInt(1_000_000)

/** @internal */
export class EncodeError extends Error {
  override readonly name = "Protobuf.EncodeError"
}

// -----------------------------------------------------------------------------
// encode
// -----------------------------------------------------------------------------

/** @internal */
export const encodeRoot = (root: Root, value: unknown): Uint8Array<ArrayBuffer> => {
  const w = new BinaryWriter()
  if (root._ === "message") encodeMessage(root.desc, value, w)
  return w.finish()
}

/** @internal */
export const encodeMessage = (desc: MessageDesc, value: unknown, w: BinaryWriter): void => {
  if (typeof value !== "object" || value === null) {
    throw new EncodeError(`expected an object for message ${desc.typeName ?? "<anonymous>"}`)
  }
  const obj = value as Record<string, unknown>
  for (const slot of desc.sorted) {
    if ("case" in slot) {
      encodeOneofCase(slot.entry, slot.case, obj, w)
    } else {
      encodeField(slot.entry, obj[slot.entry.key], w)
    }
  }
}

const encodeOneofCase = (
  entry: OneofEntry,
  c: OneofEntry["cases"][number],
  obj: Record<string, unknown>,
  w: BinaryWriter
) => {
  const v = obj[entry.key]
  if (v === undefined || v === null || !matchesCase(entry, c, v)) return
  const inner = c.unwrap !== undefined ? (v as Record<string, unknown>)[c.unwrap.key] : v
  writeValueField(c.number, c.type, inner, w)
}

/** Each oneof value is written by the first case whose guard accepts it. */
const matchesCase = (entry: OneofEntry, c: OneofEntry["cases"][number], v: unknown): boolean => {
  for (const candidate of entry.cases) {
    if (candidate.guard(v)) return candidate === c
  }
  return false
}

const encodeField = (field: FieldEntry, v: unknown, w: BinaryWriter): void => {
  if (v === undefined || v === null) return
  if (Option.isOption(v)) {
    if (Option.isNone(v)) return
    v = v.value
  }
  switch (field.card) {
    case "repeated": {
      const items = v as ReadonlyArray<unknown>
      if (items.length === 0) return
      if (field.packed) {
        w.tag(field.number, WireType.LengthDelimited).fork((inner) => {
          for (const item of items) writePackedElement(field.type, item, inner)
        })
      } else {
        for (const item of items) writeValueField(field.number, field.type, item, w)
      }
      return
    }
    case "map": {
      const record = v as Record<string, unknown>
      for (const k of Object.keys(record)) {
        w.tag(field.number, WireType.LengthDelimited).fork((entry) => {
          writeScalarField(1, field.mapKey!, mapKeyFromString(field.mapKey!, k), entry)
          writeValueField(2, field.type, record[k], entry)
        })
      }
      return
    }
    case "singular": {
      if (field.absent === "zero" && isZeroValue(field.type, v)) return
      writeValueField(field.number, field.type, v, w)
    }
  }
}

const writePackedElement = (type: ValueType, v: unknown, w: BinaryWriter) => {
  if (type._ === "enum") {
    w.int32(enumNumber(type.desc, v))
  } else {
    writeScalarRaw((type as ScalarValue).scalar, toScalar(type as ScalarValue, v), w)
  }
}

const writeValueField = (no: number, type: ValueType, v: unknown, w: BinaryWriter): void => {
  switch (type._) {
    case "scalar":
      if (type.wrapper) {
        w.tag(no, WireType.LengthDelimited).fork((inner) => {
          const s = toScalar(type, v)
          if (!isScalarZero(type.scalar, s)) writeScalarField(1, type.scalar, s, inner)
        })
      } else {
        writeScalarField(no, type.scalar, toScalar(type, v), w)
      }
      return
    case "enum":
      w.tag(no, WireType.Varint).int32(enumNumber(type.desc, v))
      return
    case "message":
      w.tag(no, WireType.LengthDelimited).fork((inner) => encodeMessage(type.desc, v, inner))
      return
    case "wkt":
      w.tag(no, WireType.LengthDelimited).fork((inner) => encodeWkt(type.wkt, v, inner))
      return
    case "convert":
      writeValueField(no, type.inner, type.toWire(v), w)
      return
  }
}

/** @internal */
export const encodeWkt = (wkt: string, v: unknown, w: BinaryWriter): void => {
  switch (wkt) {
    case "timestamp":
    case "timestampDate": {
      const millis = wkt === "timestamp" ? DateTime.toEpochMillis(v as DateTime.Utc) : (v as Date).getTime()
      const { nanos, seconds } = splitMillis(millis)
      if (seconds !== BIG_0) w.tag(1, WireType.Varint).int64(seconds)
      if (nanos !== 0) w.tag(2, WireType.Varint).int32(nanos)
      return
    }
    case "duration": {
      const { nanos, seconds } = splitDuration(v as Duration.Duration)
      if (seconds !== BIG_0) w.tag(1, WireType.Varint).int64(seconds)
      if (nanos !== 0) w.tag(2, WireType.Varint).int32(nanos)
      return
    }
    case "value":
      encodeJsonValue(v, w)
      return
    case "struct":
      encodeJsonStruct(v as Record<string, unknown>, w)
      return
    case "listValue":
      encodeJsonList(v as ReadonlyArray<unknown>, w)
      return
  }
}

/** @internal */
export const splitMillis = (millis: number): { seconds: bigint; nanos: number } => {
  const seconds = Math.floor(millis / 1000)
  return { seconds: BigInt(seconds), nanos: (millis - seconds * 1000) * 1_000_000 }
}

/** @internal */
export const splitDuration = (d: Duration.Duration): { seconds: bigint; nanos: number } => {
  const total = Duration.toNanosUnsafe(d)
  const seconds = total / BIG_1E9
  return { seconds, nanos: Number(total - seconds * BIG_1E9) }
}

/** @internal */
export const joinDuration = (seconds: bigint, nanos: number): Duration.Duration => {
  const total = seconds * BIG_1E9 + BigInt(nanos)
  // prefer the millisecond representation when it is exact
  return total % BIG_1E6 === BIG_0 && seconds <= BIG_MAX_SAFE_SECONDS && seconds >= -BIG_MAX_SAFE_SECONDS
    ? Duration.millis(Number(total / BIG_1E6))
    : Duration.nanos(total)
}

const BIG_MAX_SAFE_SECONDS = BigInt(9007199254740)

/** @internal */
export const joinTimestampMillis = (seconds: bigint, nanos: number): number =>
  Number(seconds) * 1000 + Math.floor(nanos / 1_000_000)

const encodeJsonValue = (v: unknown, w: BinaryWriter): void => {
  if (v === null) {
    w.tag(1, WireType.Varint).int32(0)
  } else if (typeof v === "number") {
    w.tag(2, WireType.Bit64).double(v)
  } else if (typeof v === "string") {
    w.tag(3, WireType.LengthDelimited).string(v)
  } else if (typeof v === "boolean") {
    w.tag(4, WireType.Varint).bool(v)
  } else if (Array.isArray(v)) {
    w.tag(6, WireType.LengthDelimited).fork((inner) => encodeJsonList(v, inner))
  } else if (typeof v === "object") {
    w.tag(5, WireType.LengthDelimited).fork((inner) => encodeJsonStruct(v as Record<string, unknown>, inner))
  } else {
    throw new EncodeError(`google.protobuf.Value cannot represent ${typeof v}`)
  }
}

const encodeJsonStruct = (v: Record<string, unknown>, w: BinaryWriter) => {
  for (const key of Object.keys(v)) {
    w.tag(1, WireType.LengthDelimited).fork((entry) => {
      entry.tag(1, WireType.LengthDelimited).string(key)
      entry.tag(2, WireType.LengthDelimited).fork((inner) => encodeJsonValue(v[key], inner))
    })
  }
}

const encodeJsonList = (v: ReadonlyArray<unknown>, w: BinaryWriter) => {
  for (const item of v) w.tag(1, WireType.LengthDelimited).fork((inner) => encodeJsonValue(item, inner))
}

/** @internal */
export const enumNumber = (desc: EnumDesc, v: unknown): number => {
  const found = desc.byValue.get(v)
  if (found !== undefined) return found.number
  if (typeof v === "number" && Number.isInteger(v)) return v
  throw new EncodeError(`value ${String(v)} is not a member of enum ${desc.typeName ?? "<anonymous>"}`)
}

/** Normalizes a value to the JS type the scalar writer expects. */
const toScalar = (type: ScalarValue, v: unknown): unknown => {
  if (type.int64AsNumber && typeof v === "number") return BigInt(v)
  return v
}

const isZeroValue = (type: ValueType, v: unknown): boolean => {
  switch (type._) {
    case "scalar":
      return !type.wrapper && isScalarZero(type.scalar, toScalar(type, v))
    case "enum":
      return enumNumber(type.desc, v) === 0
    default:
      return false
  }
}

const isScalarZero = (scalar: ScalarType, v: unknown): boolean => {
  switch (scalar) {
    case "bool":
      return v === false
    case "string":
      return v === ""
    case "bytes":
      return (v as Uint8Array).length === 0
    default:
      return v === 0 || v === BIG_0
  }
}

const wireTypeOf = (scalar: ScalarType): WireType => {
  switch (scalar) {
    case "double":
    case "fixed64":
    case "sfixed64":
      return WireType.Bit64
    case "float":
    case "fixed32":
    case "sfixed32":
      return WireType.Bit32
    case "string":
    case "bytes":
      return WireType.LengthDelimited
    default:
      return WireType.Varint
  }
}

const writeScalarField = (no: number, scalar: ScalarType, v: unknown, w: BinaryWriter) => {
  w.tag(no, wireTypeOf(scalar))
  writeScalarRaw(scalar, v, w)
}

const expect = (ok: boolean, scalar: ScalarType, v: unknown) => {
  if (!ok) throw new EncodeError(`expected a ${scalar} value, got ${typeof v}`)
}

const writeScalarRaw = (scalar: ScalarType, v: unknown, w: BinaryWriter) => {
  switch (scalar) {
    case "double":
      expect(typeof v === "number", scalar, v)
      w.double(v as number)
      return
    case "float":
      expect(typeof v === "number", scalar, v)
      w.float(v as number)
      return
    case "int32":
      expect(typeof v === "number", scalar, v)
      w.int32(v as number)
      return
    case "uint32":
      expect(typeof v === "number", scalar, v)
      w.uint32(v as number)
      return
    case "sint32":
      expect(typeof v === "number", scalar, v)
      w.sint32(v as number)
      return
    case "fixed32":
      expect(typeof v === "number", scalar, v)
      w.fixed32(v as number)
      return
    case "sfixed32":
      expect(typeof v === "number", scalar, v)
      w.sfixed32(v as number)
      return
    case "int64":
      expect(typeof v === "bigint", scalar, v)
      w.int64(v as bigint)
      return
    case "uint64":
      expect(typeof v === "bigint", scalar, v)
      w.uint64(v as bigint)
      return
    case "sint64":
      expect(typeof v === "bigint", scalar, v)
      w.sint64(v as bigint)
      return
    case "fixed64":
      expect(typeof v === "bigint", scalar, v)
      w.fixed64(v as bigint)
      return
    case "sfixed64":
      expect(typeof v === "bigint", scalar, v)
      w.sfixed64(v as bigint)
      return
    case "bool":
      expect(typeof v === "boolean", scalar, v)
      w.bool(v as boolean)
      return
    case "string":
      expect(typeof v === "string", scalar, v)
      w.string(v as string)
      return
    case "bytes":
      expect(v instanceof Uint8Array, scalar, v)
      w.bytes(v as Uint8Array)
      return
  }
}

/** @internal */
export const mapKeyFromString = (scalar: ScalarType, key: string): unknown => {
  switch (scalar) {
    case "string":
      return key
    case "bool":
      return key === "true"
    case "int64":
    case "uint64":
    case "sint64":
    case "fixed64":
    case "sfixed64":
      return BigInt(key)
    default:
      return Number(key)
  }
}

// -----------------------------------------------------------------------------
// decode
// -----------------------------------------------------------------------------

/** @internal */
export const decodeRoot = (root: Root, bytes: Uint8Array): unknown => {
  if (root._ === "void") return undefined
  const r = new BinaryReader(bytes)
  return decodeMessage(root.desc, r, r.len, undefined)
}

/**
 * Decodes a message into `target` (merging, as the spec requires for repeated
 * occurrences of a message field), then fills in absent fields.
 *
 * @internal
 */
export const decodeMessage = (
  desc: MessageDesc,
  r: BinaryReader,
  end: number,
  target: Record<string, unknown> | undefined
): Record<string, unknown> => {
  const obj: Record<string, unknown> = target ? { ...target } : {}
  while (r.pos < end) {
    const [no, wt] = r.tag()
    const slot = desc.byNumber.get(no)
    if (slot === undefined) {
      r.skip(wt, no)
      continue
    }
    if ("case" in slot) {
      const c = slot.case
      const prev = obj[slot.entry.key]
      const prevInner = c.unwrap !== undefined && prev !== undefined && prev !== null
        ? (prev as Record<string, unknown>)[c.unwrap.key]
        : prev
      const value = readValue(c.type, wt, r, prevInnerIfCase(slot.entry, c, prev, prevInner))
      if (c.unwrap !== undefined) {
        const member: Record<string, unknown> = {}
        for (const [k, lit] of c.unwrap.literals) member[k] = lit
        member[c.unwrap.key] = value
        obj[slot.entry.key] = member
      } else {
        obj[slot.entry.key] = value
      }
      continue
    }
    const field = slot.entry
    switch (field.card) {
      case "repeated": {
        const list = Array.isArray(obj[field.key]) ? [...(obj[field.key] as Array<unknown>)] : []
        if (wt === WireType.LengthDelimited && isPackedType(field.type)) {
          const sectionEnd = r.delimitedEnd()
          while (r.pos < sectionEnd) list.push(readPackedElement(field.type, r))
        } else {
          list.push(readValue(field.type, wt, r, undefined))
        }
        obj[field.key] = list
        break
      }
      case "map": {
        expectWire(wt, WireType.LengthDelimited, field.name)
        const entryEnd = r.delimitedEnd()
        let key: unknown = undefined
        let value: unknown = undefined
        while (r.pos < entryEnd) {
          const [eno, ewt] = r.tag()
          if (eno === 1) key = readScalar(field.mapKey!, ewt, r)
          else if (eno === 2) value = readValue(field.type, ewt, r, undefined)
          else r.skip(ewt, eno)
        }
        key ??= scalarZero(field.mapKey!)
        value ??= zeroOf(field.type)
        const record = { ...(obj[field.key] as Record<string, unknown> | undefined) }
        record[String(key)] = value
        obj[field.key] = record
        break
      }
      case "singular": {
        const prev = obj[field.key]
        const prevInner = Option.isOption(prev) ? Option.getOrUndefined(prev) : prev
        const value = readValue(field.type, wt, r, prevInner)
        obj[field.key] = field.absent === "none" ? Option.some(value) : value
        break
      }
    }
  }
  finishMessage(desc, obj)
  return obj
}

const prevInnerIfCase = (entry: OneofEntry, c: OneofEntry["cases"][number], prev: unknown, prevInner: unknown) =>
  prev !== undefined && prev !== null && matchesCase(entry, c, prev) ? prevInner : undefined

/** @internal */
export const finishMessage = (desc: MessageDesc, obj: Record<string, unknown>): void => {
  for (const [key, literal] of desc.literals) obj[key] = literal
  for (const entry of desc.entries) {
    if (entry.key in obj) continue
    if (entry._ === "field" && entry.card !== "singular") {
      if (entry.absent === "zero" || entry.absent === "required") {
        obj[entry.key] = entry.card === "repeated" ? [] : {}
        continue
      }
    }
    switch (entry.absent) {
      case "zero":
        obj[entry.key] = zeroOf((entry as FieldEntry).type)
        break
      case "null":
        obj[entry.key] = null
        break
      case "undefined":
        obj[entry.key] = undefined
        break
      case "none":
        obj[entry.key] = Option.none()
        break
    }
  }
}

const isPackedType = (type: ValueType) =>
  (type._ === "scalar" && !type.wrapper && type.scalar !== "string" && type.scalar !== "bytes") || type._ === "enum"

const readPackedElement = (type: ValueType, r: BinaryReader): unknown => {
  if (type._ === "enum") return enumValue(type.desc, r.int32())
  const scalar = type as ScalarValue
  return fromScalar(scalar, readScalarRaw(scalar.scalar, r))
}

const expectWire = (actual: WireType, expected: WireType, name: string) => {
  if (actual !== expected) throw new WireError(`wire type ${actual} does not match field ${name}`)
}

const readValue = (type: ValueType, wt: WireType, r: BinaryReader, prev: unknown): unknown => {
  switch (type._) {
    case "scalar": {
      if (type.wrapper) {
        expectWire(wt, WireType.LengthDelimited, "wrapper")
        const end = r.delimitedEnd()
        let value: unknown = scalarZero(type.scalar)
        while (r.pos < end) {
          const [no, ewt] = r.tag()
          if (no === 1) value = readScalar(type.scalar, ewt, r)
          else r.skip(ewt, no)
        }
        return fromScalar(type, value)
      }
      return fromScalar(type, readScalar(type.scalar, wt, r))
    }
    case "enum":
      expectWire(wt, WireType.Varint, "enum")
      return enumValue(type.desc, r.int32())
    case "message": {
      expectWire(wt, WireType.LengthDelimited, type.desc.typeName ?? "message")
      const end = r.delimitedEnd()
      const target = typeof prev === "object" && prev !== null ? prev as Record<string, unknown> : undefined
      return decodeMessage(type.desc, r, end, target)
    }
    case "wkt": {
      expectWire(wt, WireType.LengthDelimited, type.wkt)
      const end = r.delimitedEnd()
      return decodeWkt(type.wkt, r, end)
    }
    case "convert":
      return type.fromWire(readValue(type.inner, wt, r, undefined))
  }
}

/** @internal */
export const decodeWkt = (wkt: string, r: BinaryReader, end: number): unknown => {
  switch (wkt) {
    case "timestamp":
    case "timestampDate":
    case "duration": {
      let seconds = BIG_0
      let nanos = 0
      while (r.pos < end) {
        const [no, wt] = r.tag()
        if (no === 1 && wt === WireType.Varint) seconds = r.int64()
        else if (no === 2 && wt === WireType.Varint) nanos = r.int32()
        else r.skip(wt, no)
      }
      if (wkt === "duration") return joinDuration(seconds, nanos)
      const millis = joinTimestampMillis(seconds, nanos)
      return wkt === "timestamp" ? DateTime.makeUnsafe(millis) : new Date(millis)
    }
    case "value":
      return decodeJsonValue(r, end)
    case "struct":
      return decodeJsonStruct(r, end)
    case "listValue":
      return decodeJsonList(r, end)
  }
  throw new WireError(`unknown well-known type ${wkt}`)
}

const decodeJsonValue = (r: BinaryReader, end: number): unknown => {
  let value: unknown = null
  while (r.pos < end) {
    const [no, wt] = r.tag()
    switch (no) {
      case 1:
        r.int32()
        value = null
        break
      case 2:
        value = r.double()
        break
      case 3:
        value = r.string()
        break
      case 4:
        value = r.bool()
        break
      case 5:
        value = decodeJsonStruct(r, r.delimitedEnd())
        break
      case 6:
        value = decodeJsonList(r, r.delimitedEnd())
        break
      default:
        r.skip(wt, no)
    }
  }
  return value
}

const decodeJsonStruct = (r: BinaryReader, end: number): Record<string, unknown> => {
  const out: Record<string, unknown> = {}
  while (r.pos < end) {
    const [no, wt] = r.tag()
    if (no !== 1) {
      r.skip(wt, no)
      continue
    }
    const entryEnd = r.delimitedEnd()
    let key = ""
    let value: unknown = null
    while (r.pos < entryEnd) {
      const [eno, ewt] = r.tag()
      if (eno === 1) key = r.string()
      else if (eno === 2) value = decodeJsonValue(r, r.delimitedEnd())
      else r.skip(ewt, eno)
    }
    out[key] = value
  }
  return out
}

const decodeJsonList = (r: BinaryReader, end: number): Array<unknown> => {
  const out: Array<unknown> = []
  while (r.pos < end) {
    const [no, wt] = r.tag()
    if (no === 1) out.push(decodeJsonValue(r, r.delimitedEnd()))
    else r.skip(wt, no)
  }
  return out
}

/** @internal */
export const enumValue = (desc: EnumDesc, n: number): unknown => {
  const found = desc.byNumber.get(n)
  // open enums: unknown numbers pass through for the schema to judge
  return found !== undefined ? found.value : n
}

const fromScalar = (type: ScalarValue, v: unknown): unknown =>
  type.int64AsNumber && typeof v === "bigint" ? Number(v) : v

const readScalar = (scalar: ScalarType, wt: WireType, r: BinaryReader): unknown => {
  expectWire(wt, wireTypeOf(scalar), scalar)
  return readScalarRaw(scalar, r)
}

const readScalarRaw = (scalar: ScalarType, r: BinaryReader): unknown => {
  switch (scalar) {
    case "double":
      return r.double()
    case "float":
      return r.float()
    case "int32":
      return r.int32()
    case "uint32":
      return r.uint32()
    case "sint32":
      return r.sint32()
    case "fixed32":
      return r.fixed32()
    case "sfixed32":
      return r.sfixed32()
    case "int64":
      return r.int64()
    case "uint64":
      return r.uint64()
    case "sint64":
      return r.sint64()
    case "fixed64":
      return r.fixed64()
    case "sfixed64":
      return r.sfixed64()
    case "bool":
      return r.bool()
    case "string":
      return r.string()
    case "bytes":
      return r.bytes()
  }
}

/** @internal */
export const scalarZero = (scalar: ScalarType): unknown => {
  switch (scalar) {
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
      return BIG_0
    default:
      return 0
  }
}

/** @internal */
export const zeroOf = (type: ValueType): unknown => {
  switch (type._) {
    case "scalar":
      return fromScalar(type, scalarZero(type.scalar))
    case "enum":
      return enumValue(type.desc, 0)
    case "message":
      return decodeMessage(type.desc, new BinaryReader(new Uint8Array(0)), 0, undefined)
    case "wkt":
      return decodeWkt(type.wkt, new BinaryReader(new Uint8Array(0)), 0)
    case "convert":
      return type.fromWire(zeroOf(type.inner))
  }
}
