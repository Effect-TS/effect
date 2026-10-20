// Encodes and decodes the encoded side of a schema. `makeCodec` compiles its
// layout into a writer and a reader per field: closures that hold what they
// need, so that the hot paths read no layout. `Protobuf.toCodec` wraps the
// codec in a schema transformation.
//
// Both directions reject what the schema would: an exact schema skips the
// schema pass, so the codec alone must not accept a value the schema rejects,
// nor produce one.
//
// Decoding builds values in place: a later occurrence of a message field
// merges into the value of the earlier one. What can only be settled once all
// occurrences are read is kept on the `Input` of the decode, and settled at its
// end.

import * as Bytes from "../../Bytes.ts"
import * as Predicate from "../../Predicate.ts"
import * as InternalRecord from "../record.ts"
import * as L from "./layout.ts"
import { is64Bit, isUnsigned, type ScalarName } from "./schema.ts"
import * as Wire from "./wire.ts"

/** @internal */
export interface Codec {
  readonly encode: (value: unknown) => Uint8Array<ArrayBuffer>
  readonly decode: (bytes: Uint8Array) => unknown
}

/**
 * Both directions are synchronous, and throw a `WireError` for malformed input
 * or values without a wire representation.
 *
 * @internal
 */
export const makeCodec = (root: L.Root): Codec => {
  const compiled = new Map<L.Message, Compiled>()
  const write = fieldsWriter(compiled, root)
  const read = fieldsReader(compiled, root)
  return {
    encode: (value) => {
      const w = new Wire.Writer()
      write(w, value, 0)
      return w.finish()
    },
    decode: (bytes) => {
      const r = Input.take(bytes)
      try {
        const value = read(r, undefined, bytes.length, undefined, 0)
        r.settle(value)
        return value
      } finally {
        Input.release(r)
      }
    }
  }
}

// Writes a value with its tag.
type ValueWriter = (w: Wire.Writer, value: unknown, depth: number) => void

// Writes a field of a message value. `depth` is that of the message, and
// `cases` holds the case of each of its oneofs.
type FieldWriter = (
  w: Wire.Writer,
  container: any,
  depth: number,
  cases: ReadonlyArray<L.Case | undefined>
) => void

// Reads one occurrence of a field, and returns the new value of its slot.
// `previous` is the value before, which a message merges into.
type FieldReader = (r: Input, previous: unknown, wireType: number, number: number, depth: number) => unknown

// Reads one occurrence of a field into the values of a struct, by the index of
// its slot.
type FieldReaderInto = (r: Input, values: Array<any>, wireType: number, number: number, depth: number) => void

// Write or read the fields of a message value, without its tag or length.
type FieldsWriter = (w: Wire.Writer, value: unknown, depth: number) => void
type FieldsReader = (r: Input, previous: unknown, end: number, group: number | undefined, depth: number) => unknown

/**
 * A message compiled for the codec. It is registered before its fields are
 * compiled, so that recursive messages refer to it.
 */
interface Compiled {
  readonly message: L.Message
  // In field-number order, with the key of each in issue paths.
  readonly writers: Array<FieldWriter>
  readonly writerKeys: Array<PropertyKey | undefined>
  // The case of each oneof. They fail for a value that is no case, before
  // anything is written.
  readonly selectors: Array<(container: any) => L.Case | undefined>
  // Readers by field number, and as an array unless the numbers are large.
  readonly readers: Map<number, FieldReaders>
  table: ReadonlyArray<FieldReaders | undefined> | undefined
  // A struct is read into an array of values, one per key in schema order,
  // and built at the end as a copy of a template that holds the absent value
  // of each key. A copy keeps the fast properties of the template, which
  // assigning many keys one by one does not. There is a template for each
  // combination of present optional keys.
  readonly keys: Array<PropertyKey>
  readonly absent: Array<unknown>
  readonly shapes: Map<number | string, object>
  // The required keys, which fail the decode when they are still absent at
  // the end.
  readonly required: Array<L.Slot>
  readonly requiredKeys: Array<number>
  readonly optional: Array<number>
  readonly unknownKey: number
  // The readers of the extensions that decoding checks, by field number.
  extensions: Map<number, FieldReaders> | undefined
}

interface FieldReaders {
  // Reads into the value of a box, which is the value of its slot.
  readonly read: FieldReader
  // Reads into the values of a struct.
  readonly readInto: FieldReaderInto
  // The key of the field in issue paths.
  readonly path: PropertyKey | undefined
}

const compileMessage = (compiled: Map<L.Message, Compiled>, message: L.Message): Compiled => {
  const cached = compiled.get(message)
  if (cached !== undefined) return cached
  const out: Compiled = {
    message,
    writers: [],
    writerKeys: [],
    selectors: [],
    readers: new Map(),
    table: undefined,
    keys: message.order,
    absent: [],
    shapes: new Map(),
    required: [],
    requiredKeys: [],
    optional: [],
    unknownKey: -1,
    extensions: undefined
  }
  compiled.set(message, out)
  for (const oneof of message.oneofs) out.selectors.push(caseSelector(message, oneof))
  for (const field of message.fields) {
    out.writers.push(fieldWriter(compiled, message, field))
    out.writerKeys.push(pathKey(message, field))
  }
  const index = new Map(message.order.map((key, i) => [key, i]))
  for (const field of message.fields) {
    const key = field._tag === "Case" ? field.oneof.key : field.key
    out.readers.set(field.number, fieldReader(compiled, message, field, index.get(key) ?? -1))
  }
  const max = message.fields.length === 0 ? 0 : message.fields[message.fields.length - 1].number
  if (max <= 1024) {
    const table: Array<FieldReaders | undefined> = new Array(max + 1).fill(undefined)
    for (const [number, reader] of out.readers) table[number] = reader
    out.table = table
  }
  if (message.shape === "struct") compileAbsent(out, message)
  for (const extension of message.extensions) {
    const number = extension.message.fields[0].number
    const reader = compileMessage(compiled, extension.message).readers.get(number)!
    ;(out.extensions ??= new Map()).set(number, reader)
  }
  return out
}

const compileAbsent = (out: Compiled, message: L.Message): void => {
  const slots = new Map(message.slots.map((slot) => [slot.key, slot]))
  message.order.forEach((key, i) => {
    out.absent.push(undefined)
    if (key === message.unknown) {
      ;(out as { unknownKey: number }).unknownKey = i
      out.optional.push(i)
      return
    }
    const slot = slots.get(key)!
    switch (slot.absent) {
      case "omit":
        out.optional.push(i)
        return
      case "required":
        out.required.push(slot)
        out.requiredKeys.push(i)
        return
    }
    out.absent[i] = L.absentValue(slot)
  })
}

// The template of a struct with the optional keys whose values are present.
const shapeOf = (compiled: Compiled, values: Array<unknown>): object => {
  const optional = compiled.optional
  // A bit per optional key, or a character beyond 30 of them.
  let present: number | string = 0
  if (optional.length <= 30) {
    for (let i = 0; i < optional.length; i++) if (values[optional[i]] !== undefined) present |= 1 << i
  } else {
    present = ""
    for (let i = 0; i < optional.length; i++) present += values[optional[i]] === undefined ? "0" : "1"
  }
  const shape = compiled.shapes.get(present)
  return shape !== undefined ? shape : makeShape(compiled, values, present)
}

const makeShape = (compiled: Compiled, values: Array<unknown>, present: number | string): object => {
  const optional = new Set(compiled.optional.filter((i) => values[i] !== undefined))
  const keys: Record<PropertyKey, unknown> = {}
  compiled.keys.forEach((key, i) => {
    if (!compiled.optional.includes(i) || optional.has(i)) InternalRecord.assignProperty(keys, key, compiled.absent[i])
  })
  const shape = { ...keys }
  // Few combinations occur, so the templates of a struct are bounded.
  if (compiled.shapes.size < 64) compiled.shapes.set(present, shape)
  return shape
}

// -----------------------------------------------------------------------------
// shared
// -----------------------------------------------------------------------------

// The key of a field in issue paths.
const pathKey = (message: L.Message, field: L.Field): PropertyKey | undefined => {
  if (message.synthetic) return undefined
  return field._tag === "Case" ? field.oneof.key : field.key
}

// Rethrows a wire error with `key` prepended to its path.
const rethrowAt: (e: unknown, key: PropertyKey | undefined) => never = (e, key) => {
  if (e instanceof Wire.WireError && key !== undefined) e.path.unshift(key)
  throw e
}

const wrongWireType: (actual: number, expected: number) => never = (actual, expected) => {
  throw new Wire.WireError(`wire type ${actual} does not match the field (expected ${expected})`)
}

const missing = (): Wire.WireError => {
  return new Wire.WireError("missing field", undefined, true)
}

// Message values merge with an earlier occurrence; other values replace it.
const merges = (type: L.Type): boolean => {
  return type._tag === "Message" || type._tag === "Converted"
}

// -----------------------------------------------------------------------------
// scalars
// -----------------------------------------------------------------------------

interface ScalarCodec {
  readonly read: (r: Wire.Reader) => unknown
  // Throws for a value outside the range of the scalar.
  readonly write: (w: Wire.Writer, value: unknown) => void
  // Whether an implicit-presence value is the zero value, which is not
  // written.
  readonly isZero: (value: unknown) => boolean
}

const expected: (scalar: ScalarName, value: unknown) => never = (scalar, value) => {
  throw new Wire.WireError(`expected a protobuf ${scalar}`, value)
}

const isNumberZero = (value: unknown) => value === 0
// -0 is written, as other implementations do.
const isFloatZero = (value: unknown) => value === 0 && 1 / value > 0
const isBigIntZero = (value: unknown) => value === Wire.BIGINT_ZERO
const isInt64Zero = (value: unknown) => value === 0 || value === Wire.BIGINT_ZERO

const int32 = (scalar: ScalarName, value: unknown): number => {
  return typeof value === "number" && Wire.isInt32(value) ? value : expected(scalar, value)
}

const uint32 = (scalar: ScalarName, value: unknown): number => {
  return typeof value === "number" && Wire.isUint32(value) ? value : expected(scalar, value)
}

// A 64-bit integer in the range of the scalar: a bigint, a safe integer when the
// scalar holds numbers, or a canonical decimal string when it holds strings.
const int64 = (scalar: ScalarName, as: L.Int64As, value: unknown): bigint | number => {
  const unsigned = isUnsigned(scalar)
  if (as === "string" && typeof value === "string" && CANONICAL_INTEGER.test(value)) value = BigInt(value)
  if (as !== "number" && typeof value === "bigint") {
    const inRange = unsigned
      ? value >= Wire.BIGINT_ZERO && value <= Wire.UINT64_MAX
      : value >= Wire.INT64_MIN && value <= Wire.INT64_MAX
    if (inRange) return value
  } else if (as === "number" && typeof value === "number" && Number.isSafeInteger(value) && !(unsigned && value < 0)) {
    return value
  }
  return expected(scalar, value)
}

const CANONICAL_INTEGER = /^(?:0|-?[1-9]\d*)$/

// Decodes the zigzag encoding of the last `varint64` in place.
const zigzag64 = (r: Wire.Reader): void => {
  const mask = -(r.lo & 1)
  const lo = (((r.lo >>> 1) | (r.hi << 31)) ^ mask) >>> 0
  r.hi = ((r.hi >>> 1) ^ mask) >>> 0
  r.lo = lo
}

// The last 64-bit value read, as a number, which fails outside the safe
// integer range instead of losing precision.
const toNumber = (scalar: ScalarName, r: Wire.Reader, signed: boolean): number => {
  const { hi, lo } = r
  const n = (signed ? hi | 0 : hi) * 4294967296 + lo
  if (Number.isSafeInteger(n)) return n
  const exact = signed ? Wire.int64FromHalves(lo, hi) : Wire.uint64FromHalves(lo, hi)
  throw new Wire.WireError(`${scalar} value ${exact} is outside the safe integer range`)
}

const SCALARS: { readonly [K in ScalarName]: ScalarCodec } = {
  double: {
    read: (r) => r.double(),
    write: (w, v) => w.double(typeof v === "number" ? v : expected("double", v)),
    isZero: isFloatZero
  },
  float: {
    read: (r) => r.float(),
    write: (w, v) => {
      if (typeof v !== "number" || (Number.isFinite(v) && Math.abs(v) > Wire.FLOAT32_MAX)) expected("float", v)
      w.float(v)
    },
    isZero: isFloatZero
  },
  int32: { read: (r) => r.int32(), write: (w, v) => w.int32(int32("int32", v)), isZero: isNumberZero },
  uint32: { read: (r) => r.varint32(), write: (w, v) => w.uint32(uint32("uint32", v)), isZero: isNumberZero },
  sint32: {
    read: (r) => {
      const n = r.varint32()
      return (n >>> 1) ^ -(n & 1)
    },
    write: (w, v) => w.sint32(int32("sint32", v)),
    isZero: isNumberZero
  },
  fixed32: { read: (r) => r.fixed32(), write: (w, v) => w.fixed32(uint32("fixed32", v)), isZero: isNumberZero },
  sfixed32: { read: (r) => r.sfixed32(), write: (w, v) => w.sfixed32(int32("sfixed32", v)), isZero: isNumberZero },
  int64: {
    read: (r) => {
      r.varint64()
      return Wire.int64FromHalves(r.lo, r.hi)
    },
    write: (w, v) => w.int64(int64("int64", "bigint", v)),
    isZero: isBigIntZero
  },
  uint64: {
    read: (r) => {
      r.varint64()
      return Wire.uint64FromHalves(r.lo, r.hi)
    },
    write: (w, v) => w.int64(int64("uint64", "bigint", v)),
    isZero: isBigIntZero
  },
  sint64: {
    read: (r) => {
      r.varint64()
      zigzag64(r)
      return Wire.int64FromHalves(r.lo, r.hi)
    },
    write: (w, v) => w.sint64(int64("sint64", "bigint", v)),
    isZero: isBigIntZero
  },
  fixed64: {
    read: (r) => {
      r.fixed64()
      return Wire.uint64FromHalves(r.lo, r.hi)
    },
    write: (w, v) => w.fixed64(int64("fixed64", "bigint", v)),
    isZero: isBigIntZero
  },
  sfixed64: {
    read: (r) => {
      r.fixed64()
      return Wire.int64FromHalves(r.lo, r.hi)
    },
    write: (w, v) => w.fixed64(int64("sfixed64", "bigint", v)),
    isZero: isBigIntZero
  },
  bool: {
    read: (r) => r.bool(),
    write: (w, v) => w.uint32(typeof v === "boolean" ? (v ? 1 : 0) : expected("bool", v)),
    isZero: (v) => v === false
  },
  string: {
    read: (r) => r.string(),
    write: (w, v) => w.string(typeof v === "string" ? v : expected("string", v)),
    isZero: (v) => v === ""
  },
  bytes: {
    read: (r) => r.bytes(),
    write: (w, v) => w.bytes(v instanceof Uint8Array ? v : expected("bytes", v)),
    isZero: (v) => v instanceof Uint8Array && v.length === 0
  }
}

// Strings that are not validated, as with `validateUtf8: false`.
const LAX_STRING: ScalarCodec = { ...SCALARS.string, read: (r) => r.laxString() }

// 64-bit integers held in numbers, like `[jstype = JS_NUMBER]`.
const NUMBER_SCALARS: { readonly [K in "int64" | "uint64" | "sint64" | "fixed64" | "sfixed64"]: ScalarCodec } = {
  int64: {
    read: (r) => {
      r.varint64()
      return toNumber("int64", r, true)
    },
    write: (w, v) => w.int64(int64("int64", "number", v)),
    isZero: isInt64Zero
  },
  uint64: {
    read: (r) => {
      r.varint64()
      return toNumber("uint64", r, false)
    },
    write: (w, v) => w.int64(int64("uint64", "number", v)),
    isZero: isInt64Zero
  },
  sint64: {
    read: (r) => {
      r.varint64()
      zigzag64(r)
      return toNumber("sint64", r, true)
    },
    write: (w, v) => w.sint64(int64("sint64", "number", v)),
    isZero: isInt64Zero
  },
  fixed64: {
    read: (r) => {
      r.fixed64()
      return toNumber("fixed64", r, false)
    },
    write: (w, v) => w.fixed64(int64("fixed64", "number", v)),
    isZero: isInt64Zero
  },
  sfixed64: {
    read: (r) => {
      r.fixed64()
      return toNumber("sfixed64", r, true)
    },
    write: (w, v) => w.fixed64(int64("sfixed64", "number", v)),
    isZero: isInt64Zero
  }
}

const stringScalar = (scalar: keyof typeof NUMBER_SCALARS): ScalarCodec => {
  const codec = SCALARS[scalar]
  return {
    read: (r) => String(codec.read(r)),
    write: (w, v) => codec.write(w, int64(scalar, "string", v)),
    isZero: (v) => v === "0"
  }
}

// 64-bit integers held in decimal strings, like `[jstype = JS_STRING]`.
const STRING_SCALARS: { readonly [K in keyof typeof NUMBER_SCALARS]: ScalarCodec } = {
  int64: stringScalar("int64"),
  uint64: stringScalar("uint64"),
  sint64: stringScalar("sint64"),
  fixed64: stringScalar("fixed64"),
  sfixed64: stringScalar("sfixed64")
}

const scalarCodec = (type: L.Scalar): ScalarCodec => {
  if (is64Bit(type.scalar) && type.int64As !== "bigint") {
    return (type.int64As === "number" ? NUMBER_SCALARS : STRING_SCALARS)[type.scalar as keyof typeof NUMBER_SCALARS]
  }
  return type.scalar === "string" && !type.validateUtf8 ? LAX_STRING : SCALARS[type.scalar]
}

const enumNumber = (type: L.Enum, value: unknown): number => {
  const n = type.toNumber.get(value)
  if (n !== undefined) return n
  if (type.open && typeof value === "number" && Wire.isInt32(value)) return value
  throw new Wire.WireError("expected an enum value", value)
}

// -----------------------------------------------------------------------------
// encode
// -----------------------------------------------------------------------------

// The value of a slot in a message value.
const getter = (message: L.Message, slot: L.Slot): (container: any) => unknown => {
  const key = slot.key
  if (message.shape === "box") return (c) => c
  return slot.guarded ? (c) => Object.hasOwn(c, key) ? c[key] : undefined : (c) => c[key]
}

// Whether an `undefined` slot of a struct is absent. A required key that is
// missing fails, and an `undefined` that the slot does not admit is written,
// for its writer to reject.
const isAbsent = (slot: L.Slot, container: object): boolean => {
  if (slot.absent === "omit") return !Object.hasOwn(container, slot.key)
  if (!Object.hasOwn(container, slot.key)) throw missing()
  return false
}

const fieldsWriter = (compiled: Map<L.Message, Compiled>, type: L.MessageType | L.Converted): FieldsWriter => {
  const message = compileMessage(compiled, type.message)
  if (type._tag === "Message") return (w, value, depth) => writeMessage(w, message, value, depth)
  const toMessage = type.toMessage
  return (w, value, depth) => writeMessage(w, message, toMessage(value), depth)
}

// `depth` is limited like it is when decoding, so that whatever is written can
// be read back.
const writeMessage = (w: Wire.Writer, compiled: Compiled, value: any, depth: number): void => {
  if (depth > Wire.MAX_DEPTH) throw new Wire.WireError(`nesting deeper than ${Wire.MAX_DEPTH}`)
  const message = compiled.message
  if (message.shape === "struct" && !Predicate.isObject(value)) {
    throw new Wire.WireError(`expected an object for ${message.name}`, value)
  }
  let key: PropertyKey | undefined
  try {
    const selectors = compiled.selectors
    let cases: Array<L.Case | undefined> = NO_CASES
    if (selectors.length > 0) {
      cases = []
      for (let i = 0; i < selectors.length; i++) {
        key = message.synthetic ? undefined : message.oneofs[i].key
        cases.push(selectors[i](value))
      }
    }
    const writers = compiled.writers
    const keys = compiled.writerKeys
    for (let i = 0; i < writers.length; i++) {
      key = keys[i]
      writers[i](w, value, depth, cases)
    }
    if (message.unknown !== undefined) {
      key = message.unknown
      const bytes = Object.hasOwn(value, key) ? value[key] : undefined
      if (bytes !== undefined) writeUnknown(w, message, bytes, depth)
    }
  } catch (e) {
    rethrowAt(e, key)
  }
}

const NO_CASES: Array<L.Case | undefined> = []

const caseSelector = (message: L.Message, oneof: L.Oneof): (container: any) => L.Case | undefined => {
  const get = getter(message, oneof)
  const select = oneof.select
  return (container) => {
    const v = get(container)
    if (v === undefined && isAbsent(oneof, container)) return undefined
    const c = select(v)
    if (c === undefined) throw new Wire.WireError("value matches no oneof case", v)
    return c
  }
}

// The value of a case, without the tag of its tagged struct.
const caseValue = (value: unknown): unknown => (value as { readonly value: unknown }).value

// Unknown fields must be well-formed, and must not hold declared fields, which
// would be read back into them.
const writeUnknown = (w: Wire.Writer, message: L.Message, bytes: unknown, depth: number): void => {
  if (!(bytes instanceof Uint8Array)) throw new Wire.WireError("expected the bytes of unknown fields", bytes)
  const r = new Wire.Reader(bytes)
  while (r.pos < bytes.length) {
    const tag = r.tag()
    if (message.byNumber.has(tag >>> 3)) throw new Wire.WireError(`unknown fields hold declared field ${tag >>> 3}`)
    r.skip(tag & 7, tag >>> 3, depth)
  }
  w.raw(bytes)
}

const fieldWriter = (compiled: Map<L.Message, Compiled>, message: L.Message, field: L.Field): FieldWriter => {
  switch (field._tag) {
    case "Singular":
      return singularWriter(compiled, message, field)
    case "Repeated": {
      const writeList = listWriter(compiled, field)
      const write = (w: Wire.Writer, container: any, v: unknown, depth: number) => {
        if (v === undefined && message.shape === "struct" && isAbsent(field, container)) return
        if (!Array.isArray(v)) throw new Wire.WireError("expected an array", v)
        if (v.length > 0) writeList(w, v, depth)
      }
      if (message.shape === "box") return (w, value, depth) => write(w, value, value, depth)
      const key = field.key
      if (field.guarded) {
        return (w, container, depth) =>
          write(w, container, Object.hasOwn(container, key) ? container[key] : undefined, depth)
      }
      return (w, container, depth) => {
        const v = container[key]
        // Most repeated fields are empty.
        if (v !== L.EMPTY_LIST) write(w, container, v, depth)
      }
    }
    case "Map": {
      const writeEntry = entryWriter(compiled, field)
      const entries = numberKeys(field)
      const write = (w: Wire.Writer, container: any, v: unknown, depth: number) => {
        if (v === undefined && message.shape === "struct" && isAbsent(field, container)) return
        if (!Predicate.isObject(v) || Array.isArray(v)) throw new Wire.WireError("expected a record", v)
        const record = entries === undefined ? v as Record<string, unknown> : entries(v as Record<string, unknown>)
        for (const k of Object.keys(record)) writeEntry(w, k, record[k], depth)
      }
      if (message.shape === "box") return (w, value, depth) => write(w, value, value, depth)
      const key = field.key
      if (field.guarded) {
        return (w, container, depth) =>
          write(w, container, Object.hasOwn(container, key) ? container[key] : undefined, depth)
      }
      return (w, container, depth) => {
        const v = container[key]
        // Most maps are empty.
        if (v !== L.EMPTY_RECORD) write(w, container, v, depth)
      }
    }
    case "Case": {
      const oneof = field.oneof
      const index = message.oneofs.indexOf(oneof)
      const get = getter(message, oneof)
      const write = valueWriter(compiled, field.type, field.number, field.delimited)
      return (w, container, depth, cases) => {
        if (cases[index] === field) write(w, caseValue(get(container)), depth)
      }
    }
  }
}

const singularWriter = (compiled: Map<L.Message, Compiled>, message: L.Message, field: L.Singular): FieldWriter => {
  const skipZero = field.absent === "zero" && !field.always
  const write = valueWriter(compiled, field.type, field.number, field.delimited, skipZero)
  if (message.shape === "box") return write
  const key = field.key
  if (!field.guarded) {
    // The zero value of an implicit-presence scalar is skipped before the
    // writer is called; -0 is written.
    const type = field.type
    const zero = skipZero && (type._tag === "Scalar" || type._tag === "Enum") ? L.zeroOf(type) : NO_ZERO
    if (zero === 0 && type._tag === "Scalar" && (type.scalar === "double" || type.scalar === "float")) {
      return (w, container, depth) => {
        const v = container[key]
        if (v === 0 && 1 / v > 0) return
        if (v !== undefined || !isAbsent(field, container)) write(w, v, depth)
      }
    }
    return (w, container, depth) => {
      const v = container[key]
      if (v === zero) return
      if (v !== undefined || !isAbsent(field, container)) write(w, v, depth)
    }
  }
  return (w, container, depth) => {
    const v = Object.hasOwn(container, key) ? container[key] : undefined
    if (v !== undefined || !isAbsent(field, container)) write(w, v, depth)
  }
}

// A value that no field holds.
const NO_ZERO = Symbol("Protobuf/noZero")

// Writes the elements of a list, reporting the index of a failing one.
const listWriter = (
  compiled: Map<L.Message, Compiled>,
  field: L.Repeated
): (w: Wire.Writer, list: ReadonlyArray<unknown>, depth: number) => void => {
  const element = field.element
  if (field.packed && L.isPackable(element)) {
    const tag = field.number * 8 + Wire.WIRE_LEN
    const write = packableWriter(element)
    const size = element._tag === "Scalar" ? fixedSize(element) : 0
    const double = element._tag === "Scalar" && element.scalar === "double"
    return (w, list) => {
      if (list.length === 0) return
      let i = 0
      try {
        w.uint32(tag)
        if (size > 0) {
          // The length of fixed-width elements is known up front.
          w.uint32(list.length * size)
          w.ensure(list.length * size)
          if (double) {
            for (; i < list.length; i++) {
              const v = list[i]
              if (typeof v !== "number") expected("double", v)
              w.view.setFloat64(w.pos, v, true)
              w.pos += 8
            }
          } else {
            for (; i < list.length; i++) write(w, list[i])
          }
        } else {
          const begin = w.begin()
          for (; i < list.length; i++) write(w, list[i])
          w.end(begin)
        }
      } catch (e) {
        rethrowAt(e, i)
      }
    }
  }
  const write = valueWriter(compiled, element, field.number, field.delimited)
  return (w, list, depth) => {
    let i = 0
    try {
      for (; i < list.length; i++) write(w, list[i], depth)
    } catch (e) {
      rethrowAt(e, i)
    }
  }
}

const packableWriter = (type: L.Scalar | L.Enum): (w: Wire.Writer, value: unknown) => void => {
  if (type._tag === "Scalar") return scalarCodec(type).write
  return (w, v) => w.int32(enumNumber(type, v))
}

const fixedSize = (type: L.Scalar): number => {
  switch (type.wireType) {
    case Wire.WIRE_I64:
      return 8
    case Wire.WIRE_I32:
      return 4
    default:
      return 0
  }
}

// The entries of a map of number keys as the schema pass of `Schema.Record`
// leaves them: under the canonical spelling of each key (`"+7"` and `"7.0"` are
// `"7"`), the last of the same key winning, in the order of an object of those
// keys. A record of canonical keys already is that.
const numberKeys = (
  field: L.MapField
): ((record: Record<string, unknown>) => Record<string, unknown>) | undefined => {
  const scalar = field.keyType.scalar
  if (scalar === "string" || scalar === "bool" || is64Bit(scalar)) return undefined
  const toKey = field.wireKey
  return (record) => {
    const keys = Object.keys(record)
    if (
      keys.every((k) => {
        const n = toKey(k)
        return n === undefined || String(n) === k
      })
    ) return record
    const out: Record<string, unknown> = {}
    for (const k of keys) {
      const n = toKey(k)
      if (n !== undefined) out[String(n)] = record[k]
    }
    return out
  }
}

// Writes a map entry, reporting its key when it fails. Both the key and the
// value are written, even when they are zero. An entry whose key the key schema
// rejects is left out, as the schema pass of `Schema.Record` leaves it out.
const entryWriter = (
  compiled: Map<L.Message, Compiled>,
  field: L.MapField
): (w: Wire.Writer, key: string, value: unknown, depth: number) => void => {
  const tag = field.number * 8 + Wire.WIRE_LEN
  const keyType = field.keyType
  const keyTag = 8 + keyType.wireType
  const writeKey = scalarCodec(keyType).write
  const writeValue = valueWriter(compiled, field.value, 2, false)
  const toKey = field.wireKey
  return (w, key, value, depth) => {
    const k = toKey(key)
    if (k === undefined) return
    try {
      w.uint32(tag)
      const start = w.begin()
      w.uint32(keyTag)
      writeKey(w, k)
      writeValue(w, value, depth)
      w.end(start)
    } catch (e) {
      rethrowAt(e, key)
    }
  }
}

// Writes a value with its tag. With `skipZero`, the zero value of an
// implicit-presence field is not written.
const valueWriter = (
  compiled: Map<L.Message, Compiled>,
  type: L.Type,
  number: number,
  delimited: boolean,
  skipZero = false
): ValueWriter => {
  switch (type._tag) {
    case "Scalar":
      return scalarWriter(type, number * 8 + type.wireType, skipZero)
    case "Enum": {
      const tag = number * 8 + Wire.WIRE_VARINT
      return (w, value) => {
        const n = enumNumber(type, value)
        if (skipZero && n === 0) return
        w.uint32(tag)
        w.int32(n)
      }
    }
    default: {
      const writeFields = fieldsWriter(compiled, type)
      if (delimited) {
        const start = number * 8 + Wire.WIRE_SGROUP
        const end = number * 8 + Wire.WIRE_EGROUP
        return (w, value, depth) => {
          w.uint32(start)
          writeFields(w, value, depth + 1)
          w.uint32(end)
        }
      }
      const tag = number * 8 + Wire.WIRE_LEN
      return (w, value, depth) => {
        w.uint32(tag)
        const start = w.begin()
        writeFields(w, value, depth + 1)
        w.end(start)
      }
    }
  }
}

// The common scalars have their own writers, which skip the indirection of the
// others.
const scalarWriter = (type: L.Scalar, tag: number, skipZero: boolean): ValueWriter => {
  switch (type.int64As === "bigint" ? type.scalar : undefined) {
    case "string":
      return (w, value) => {
        if (typeof value !== "string") expected("string", value)
        if (skipZero && value === "") return
        w.uint32(tag)
        w.string(value)
      }
    case "bool":
      return (w, value) => {
        if (typeof value !== "boolean") expected("bool", value)
        if (skipZero && !value) return
        w.uint32(tag)
        w.uint32(value ? 1 : 0)
      }
    case "double":
      return (w, value) => {
        if (typeof value !== "number") expected("double", value)
        if (skipZero && isFloatZero(value)) return
        w.uint32(tag)
        w.double(value)
      }
    case "int32":
      return (w, value) => {
        if (skipZero && value === 0) return
        w.uint32(tag)
        w.int32(int32("int32", value))
      }
    case "uint32":
      return (w, value) => {
        if (skipZero && value === 0) return
        w.uint32(tag)
        w.uint32(uint32("uint32", value))
      }
    case "int64":
    case "uint64": {
      const scalar = type.scalar
      return (w, value) => {
        if (skipZero && value === Wire.BIGINT_ZERO) return
        w.uint32(tag)
        w.int64(int64(scalar, "bigint", value))
      }
    }
  }
  const { isZero, write } = scalarCodec(type)
  return (w, value) => {
    if (skipZero && isZero(value)) return
    w.uint32(tag)
    write(w, value)
  }
}

// -----------------------------------------------------------------------------
// decode
// -----------------------------------------------------------------------------

/**
 * A `Converted` value whose fields are not a value, such as a Timestamp out of
 * range. A later occurrence can still merge into it, so it only fails the
 * decode if it is still there at the end.
 */
class Invalid {
  readonly reason: string
  readonly fields: unknown
  constructor(reason: string, fields: unknown) {
    this.reason = reason
    this.fields = fields
  }
}

// The input of one decode, and what is settled once all of it is read.
class Input extends Wire.Reader {
  // The input of the last decode, which the next one starts with, like the
  // buffer of `Wire.Writer`. Decoding runs no other code, so it is never taken
  // twice.
  private static spare: Input | undefined = undefined

  static take(bytes: Uint8Array): Input {
    const r = Input.spare ?? new Input(bytes)
    Input.spare = undefined
    r.buf = bytes
    return r
  }

  // Resets the input, which keeps no reference to the bytes it read.
  static release(r: Input): void {
    r.buf = Wire.EMPTY_BYTES
    r.pos = 0
    r.dataView = undefined
    r.unknown = undefined
    r.invalid = 0
    r.drop = false
    r.extra = undefined
    r.incomplete = undefined
    Input.spare = r
  }

  // The unknown fields of structs that occurred several times, joined at the
  // end, which keeps merging linear.
  unknown: Map<object, { readonly key: PropertyKey; readonly chunks: Array<Uint8Array> }> | undefined = undefined
  // The number of `Invalid` values read.
  invalid = 0
  // Set by a field that is kept as an unknown field instead, such as a number
  // that a closed enum does not have.
  drop = false
  // Fields that the last field read leaves for the unknown fields, such as the
  // unknown numbers of a packed closed enum.
  extra: Array<Uint8Array> | undefined = undefined
  // Structs that lack a required field, which a later occurrence can still
  // merge in, so they only fail the decode if it is still missing at the end.
  incomplete: Map<object, Compiled> | undefined = undefined

  settle(value: unknown): void {
    if (this.unknown !== undefined) {
      for (const [target, { chunks, key }] of this.unknown) {
        InternalRecord.assignProperty(target, key, Bytes.concat(chunks))
      }
    }
    if (this.incomplete !== undefined) {
      for (const [target, compiled] of this.incomplete) {
        const slot = missingSlot(compiled, target)
        if (slot === undefined) continue
        // A struct that a later occurrence replaced is not part of the value.
        const path = pathTo(value, target)
        if (path === undefined) continue
        const e = missing()
        e.path.push(...path, slot.key)
        throw e
      }
    }
    if (this.invalid > 0) rejectInvalid(value)
  }
}

const missingSlot = (compiled: Compiled, target: any): L.Slot | undefined => {
  const required = compiled.required
  for (let i = 0; i < required.length; i++) {
    if (target[required[i].key] === undefined) return required[i]
  }
  return undefined
}

// Reads the fields of a message value up to `end`, or up to the end group tag
// of field `group`.
const fieldsReader = (compiled: Map<L.Message, Compiled>, type: L.MessageType | L.Converted): FieldsReader => {
  const message = compileMessage(compiled, type.message)
  if (type._tag === "Message") {
    return (r, previous, end, group, depth) => readMessage(r, message, previous, end, group, depth)
  }
  const { fromMessage, invalid, toMessage } = type
  return (r, previous, end, group, depth) => {
    const before = previous === undefined
      ? undefined
      : previous instanceof Invalid
      ? previous.fields
      : toMessage(previous)
    const fields = readMessage(r, message, before, end, group, depth)
    const reason = invalid(fields)
    if (reason === undefined) return fromMessage(fields)
    r.invalid++
    return new Invalid(reason, fields)
  }
}

// Reads a message value: a struct, built in place, or the value of a box.
const readMessage = (
  r: Input,
  compiled: Compiled,
  previous: unknown,
  end: number,
  group: number | undefined,
  depth: number
): unknown => {
  if (depth > Wire.MAX_DEPTH) throw new Wire.WireError(`nesting deeper than ${Wire.MAX_DEPTH}`)
  const message = compiled.message
  if (message.shape === "struct") return readStruct(r, compiled, previous, end, group, depth)
  // The value of a box is that of its slot. Being synthetic, it adds no key to
  // issue paths, and keeps no unknown fields.
  const table = compiled.table
  let value = previous
  for (let tag = nextTag(r, end, group); tag !== 0; tag = nextTag(r, end, group)) {
    const reader = table !== undefined ? table[tag >>> 3] : compiled.readers.get(tag >>> 3)
    if (reader === undefined) r.skip(tag & 7, tag >>> 3, depth)
    else value = reader.read(r, value, tag & 7, tag >>> 3, depth)
    r.drop = false
    r.extra = undefined
  }
  if (group === undefined && r.pos !== end) throw new Wire.WireError("field overruns its message")
  if (value !== undefined) return value
  const slot = message.slots[0]
  if (slot.absent === "required") throw missing()
  return L.absentValue(slot)
}

// Reads a struct into an array of values, and builds it in schema order, as
// the schema would build it. A later occurrence merges into the values of the
// struct before, and builds a new struct.
const readStruct = (
  r: Input,
  compiled: Compiled,
  previous: unknown,
  end: number,
  group: number | undefined,
  depth: number
): unknown => {
  const keys = compiled.keys
  const values: Array<unknown> = new Array(keys.length)
  const merging = Predicate.isObject(previous)
  if (merging) {
    for (let i = 0; i < keys.length; i++) {
      const value = Object.hasOwn(previous, keys[i]) ? (previous as any)[keys[i]] : undefined
      // The shared empty collections stay out, so that a field read starts a
      // new one rather than adding to them.
      if (value !== L.EMPTY_LIST && value !== L.EMPTY_RECORD) values[i] = value
    }
  }
  const unknown = readInto(r, compiled, values, end, group, depth)
  // The unknown fields of earlier occurrences are joined at the end of the
  // decode, which keeps merging linear.
  let before: Uint8Array | undefined
  if (unknown !== undefined) {
    const current = values[compiled.unknownKey]
    if (current instanceof Uint8Array && current.length > 0) before = current
    else values[compiled.unknownKey] = Bytes.concat(unknown)
  }
  const out = build(compiled, values)
  if (merging) {
    const merged = r.unknown?.get(previous)
    if (merged !== undefined) {
      r.unknown!.delete(previous)
      r.unknown!.set(out, merged)
    }
    r.incomplete?.delete(previous)
  }
  if (before !== undefined) {
    const merged = r.unknown ??= new Map()
    let entry = merged.get(out)
    if (entry === undefined) merged.set(out, entry = { key: keys[compiled.unknownKey], chunks: [before] })
    for (let i = 0; i < unknown!.length; i++) entry.chunks.push(unknown![i])
  }
  const required = compiled.requiredKeys
  for (let i = 0; i < required.length; i++) {
    if (values[required[i]] === undefined) {
      ;(r.incomplete ??= new Map()).set(out, compiled)
      break
    }
  }
  return out
}

// Builds a struct from its values. Every key is already a property of the
// template, so assigning it keeps the template's fast properties, and defines
// an own `__proto__` rather than setting the prototype.
const build = (compiled: Compiled, values: Array<unknown>): object => {
  const out: any = { ...shapeOf(compiled, values) }
  const keys = compiled.keys
  for (let i = 0; i < values.length; i++) {
    const value = values[i]
    if (value !== undefined) out[keys[i]] = value
  }
  return out
}

// Reads the fields of a struct into its values, and returns its unknown fields.
const readInto = (
  r: Input,
  compiled: Compiled,
  values: Array<unknown>,
  end: number,
  group: number | undefined,
  depth: number
): Array<Uint8Array> | undefined => {
  const table = compiled.table
  const keepUnknown = compiled.unknownKey !== -1
  let unknown: Array<Uint8Array> | undefined
  let path: PropertyKey | undefined
  try {
    let start = r.pos
    for (let tag = nextTag(r, end, group); tag !== 0; start = r.pos, tag = nextTag(r, end, group)) {
      const number = tag >>> 3
      const reader = table !== undefined ? table[number] : compiled.readers.get(number)
      if (reader === undefined) {
        // An extension is checked like a field, and kept as an unknown field.
        const extension = compiled.extensions?.get(number)
        if (extension === undefined) r.skip(tag & 7, number, depth)
        else readExtension(r, extension, tag, depth)
        if (keepUnknown) (unknown ??= []).push(r.buf.subarray(start, r.pos))
        continue
      }
      path = reader.path
      reader.readInto(r, values, tag & 7, number, depth)
      path = undefined
      if (r.drop) {
        r.drop = false
        if (keepUnknown) (unknown ??= []).push(r.buf.subarray(start, r.pos))
      }
      if (r.extra !== undefined) {
        if (keepUnknown) (unknown ??= []).push(...r.extra)
        r.extra = undefined
      }
    }
    if (group === undefined && r.pos !== end) throw new Wire.WireError("field overruns its message")
  } catch (e) {
    rethrowAt(e, path)
  }
  return unknown
}

const readExtension = (r: Input, extension: FieldReaders, tag: number, depth: number): void => {
  try {
    extension.read(r, undefined, tag & 7, tag >>> 3, depth)
  } finally {
    r.drop = false
    r.extra = undefined
  }
}

// Reads the next tag of a message that ends at `end`, or of a group of field
// `group`, or returns 0 at its end.
const nextTag = (r: Input, end: number, group: number | undefined): number => {
  const pos = r.pos
  if (pos >= end) {
    if (group !== undefined) throw new Wire.WireError("premature end of input")
    return 0
  }
  // Tags of fields 1 through 15 are a single byte.
  const byte = r.buf[pos]
  let tag: number
  if (byte < 0x80 && byte >= 8 && (byte & 7) <= Wire.WIRE_I32) {
    tag = byte
    r.pos = pos + 1
  } else {
    tag = r.tag()
  }
  if ((tag & 7) !== Wire.WIRE_EGROUP) return tag
  if (tag >>> 3 === group) return 0
  throw new Wire.WireError(`unexpected end group tag for field ${tag >>> 3}`)
}

// Each slot has a reader that returns its new value, for boxes, and one that
// reads into the values of a struct, at `index`. They bind the slot to a plain
// function, which reads one occurrence given the value before.
const fieldReader = (
  compiled: Map<L.Message, Compiled>,
  message: L.Message,
  field: L.Field,
  index: number
): FieldReaders => {
  const path = pathKey(message, field)
  switch (field._tag) {
    case "Singular": {
      const type = field.type
      const read = valueReader(compiled, type)
      if (type._tag === "Enum" && !type.open) {
        // An unknown number keeps the value before.
        return { read, readInto: keepingReader(index, read), path }
      }
      const readInto = (type._tag === "Scalar" ? scalarReaderInto(type, index) : undefined) ??
        plainReader(index, read, merges(type))
      return { read, readInto, path }
    }
    case "Repeated": {
      const read = valueReader(compiled, field.element)
      const readPacked = L.isPackable(field.element) ? packedReader(field.element) : undefined
      return {
        read: (r, previous, wireType, number, depth) => {
          const list = (previous === undefined || previous === L.EMPTY_LIST ? [] : previous) as Array<unknown>
          readElements(r, list, read, readPacked, wireType, number, depth)
          return list
        },
        readInto: (r, values, wireType, number, depth) => {
          readElements(r, values[index] ??= [], read, readPacked, wireType, number, depth)
        },
        path
      }
    }
    case "Map": {
      const readEntry = entryReader(compiled, field)
      return {
        read: (r, previous, wireType, _, depth) => {
          const record = previous === undefined || previous === L.EMPTY_RECORD ? {} : previous
          readEntry(r, record, wireType, depth)
          return record
        },
        readInto: (r, values, wireType, _, depth) => {
          readEntry(r, values[index] ??= {}, wireType, depth)
        },
        path
      }
    }
    case "Case": {
      const info = caseInfo(compiled, field)
      const value: FieldReader = (r, previous, wireType, _, depth) => readCase(r, previous, info, wireType, depth)
      return { read: value, readInto: keepingReader(index, value), path }
    }
  }
}

const plainReader = (index: number, read: FieldReader, loads: boolean): FieldReaderInto => {
  return loads
    ? (r, values, wireType, number, depth) => {
      values[index] = read(r, values[index], wireType, number, depth)
    }
    : (r, values, wireType, number, depth) => {
      values[index] = read(r, undefined, wireType, number, depth)
    }
}

// Reads a field that may be kept as an unknown field instead, which leaves the
// value as it was.
const keepingReader = (index: number, read: FieldReader): FieldReaderInto => {
  return (r, values, wireType, number, depth) => {
    const value = read(r, values[index], wireType, number, depth)
    if (!r.drop) values[index] = value
  }
}

// Reads the common scalars into the value at `index`. Each has its own reader,
// which skips the indirection of the others.
const scalarReaderInto = (type: L.Scalar, index: number): FieldReaderInto | undefined => {
  switch (type.int64As === "bigint" ? type.scalar : undefined) {
    case "string":
      if (!type.validateUtf8) return undefined
      return (r, values, wireType) => {
        values[index] = wireType === Wire.WIRE_LEN ? r.string() : wrongWireType(wireType, Wire.WIRE_LEN)
      }
    case "bool":
      return (r, values, wireType) => {
        values[index] = wireType === Wire.WIRE_VARINT ? r.bool() : wrongWireType(wireType, Wire.WIRE_VARINT)
      }
    case "double":
      return (r, values, wireType) => {
        values[index] = wireType === Wire.WIRE_I64 ? r.double() : wrongWireType(wireType, Wire.WIRE_I64)
      }
    case "int32":
      return (r, values, wireType) => {
        values[index] = wireType === Wire.WIRE_VARINT ? r.int32() : wrongWireType(wireType, Wire.WIRE_VARINT)
      }
    case "uint32":
      return (r, values, wireType) => {
        values[index] = wireType === Wire.WIRE_VARINT ? r.varint32() : wrongWireType(wireType, Wire.WIRE_VARINT)
      }
    case "int64":
      return (r, values, wireType) => {
        if (wireType !== Wire.WIRE_VARINT) wrongWireType(wireType, Wire.WIRE_VARINT)
        r.varint64()
        values[index] = Wire.int64FromHalves(r.lo, r.hi)
      }
    case "uint64":
      return (r, values, wireType) => {
        if (wireType !== Wire.WIRE_VARINT) wrongWireType(wireType, Wire.WIRE_VARINT)
        r.varint64()
        values[index] = Wire.uint64FromHalves(r.lo, r.hi)
      }
  }
  return undefined
}

interface CaseInfo {
  readonly field: L.Case
  readonly number: number
  readonly read: FieldReader
  // Set when the case merges with an earlier occurrence of itself.
  readonly select: ((value: unknown) => L.Case | undefined) | undefined
  readonly tag: string
}

const caseInfo = (compiled: Map<L.Message, Compiled>, field: L.Case): CaseInfo => {
  return {
    field,
    number: field.number,
    read: valueReader(compiled, field.type),
    select: merges(field.type) ? field.oneof.select : undefined,
    tag: field.tag
  }
}

// A later occurrence of a case merges into its value, and an occurrence of
// another case replaces it.
const readCase = (r: Input, previous: unknown, info: CaseInfo, wireType: number, depth: number): unknown => {
  let before: unknown = undefined
  if (info.select !== undefined && previous !== undefined && info.select(previous) === info.field) {
    before = caseValue(previous)
  }
  const value = info.read(r, before, wireType, info.number, depth)
  if (r.drop) return previous
  return { _tag: info.tag, value }
}

// Reads one occurrence of a repeated field into `list`: an element, or the
// elements of a packed field.
const readElements = (
  r: Input,
  list: Array<unknown>,
  read: FieldReader,
  readPacked: PackedReader | undefined,
  wireType: number,
  number: number,
  depth: number
): void => {
  try {
    if (wireType === Wire.WIRE_LEN && readPacked !== undefined) {
      const end = r.delimited()
      readPacked(r, end, list, number)
      if (r.pos !== end) throw new Wire.WireError("packed element overruns its field")
    } else {
      const value = read(r, undefined, wireType, number, depth)
      if (!r.drop) list.push(value)
    }
  } catch (e) {
    rethrowAt(e, list.length)
  }
}

// Reads the elements of a packed field up to `end`.
type PackedReader = (r: Input, end: number, list: Array<unknown>, number: number) => void

const packedReader = (type: L.Scalar | L.Enum): PackedReader => {
  if (type._tag === "Enum") {
    // The unknown numbers of a closed enum are kept as unpacked fields.
    return (r, end, list, number) => {
      while (r.pos < end) {
        const n = r.int32()
        const value = L.enumValue(type, n)
        if (value !== L.UNKNOWN_ENUM) list.push(value)
        else (r.extra ??= []).push(varintField(number, n))
      }
    }
  }
  const read = scalarCodec(type).read
  const size = type.scalar === "double" || type.scalar === "float" ? fixedSize(type) : 0
  if (size === 0) {
    return (r, end, list) => {
      while (r.pos < end) list.push(read(r))
    }
  }
  // Elements that fill the field exactly are read without bounds checks.
  return (r, end, list) => {
    if ((end - r.pos) % size !== 0) {
      while (r.pos < end) list.push(read(r))
      return
    }
    const view = r.view
    if (size === 8) {
      for (let p = r.pos; p < end; p += 8) list.push(view.getFloat64(p, true))
    } else {
      for (let p = r.pos; p < end; p += 4) list.push(view.getFloat32(p, true))
    }
    r.pos = end
  }
}

const varintField = (number: number, n: number): Uint8Array => {
  const w = new Wire.Writer()
  w.uint32(number * 8 + Wire.WIRE_VARINT)
  w.int32(n)
  return w.finish()
}

// Reads a map entry into `record`. A missing key or value is its zero value.
type EntryReader = (r: Input, record: any, wireType: number, depth: number) => void

const entryReader = (compiled: Map<L.Message, Compiled>, field: L.MapField): EntryReader => {
  const readKey = valueReader(compiled, field.keyType)
  const readValue = valueReader(compiled, field.value)
  const keyZero = L.zeroOf(field.keyType)
  const valueZero = zeroReader(compiled, field.value)
  return (r, record, wireType, depth) => {
    if (wireType !== Wire.WIRE_LEN) wrongWireType(wireType, Wire.WIRE_LEN)
    const end = r.delimited()
    let key: unknown = undefined
    let value: unknown = undefined
    // A closed enum value that is unknown keeps the whole entry as an unknown
    // field.
    let drop = false
    try {
      while (r.pos < end) {
        const tag = r.tag()
        switch (tag >>> 3) {
          case 1:
            key = readKey(r, undefined, tag & 7, 1, depth)
            break
          case 2:
            value = readValue(r, value, tag & 7, 2, depth)
            if (r.drop) {
              drop = true
              r.drop = false
              value = undefined
            }
            break
          default:
            r.skip(tag & 7, tag >>> 3, depth)
        }
      }
      if (r.pos !== end) throw new Wire.WireError("map entry overruns its field")
    } catch (e) {
      rethrowAt(e, key === undefined ? undefined : String(key))
    }
    if (drop) {
      r.drop = true
      return
    }
    const k = String(key === undefined ? keyZero : key)
    InternalRecord.assignProperty(record, k, value === undefined ? valueZero(r, depth) : value)
  }
}

// The value of a field without content: a message read from no bytes.
const zeroReader = (compiled: Map<L.Message, Compiled>, type: L.Type): (r: Input, depth: number) => unknown => {
  switch (type._tag) {
    case "Message":
    case "Converted": {
      const read = fieldsReader(compiled, type)
      return (r, depth) => read(r, undefined, r.pos, undefined, depth + 1)
    }
    default: {
      const zero = L.zeroOf(type)
      return () => zero
    }
  }
}

// Reads a value of a field, given the value of an earlier occurrence. Messages
// are read in either encoding, whichever the field declares.
const valueReader = (compiled: Map<L.Message, Compiled>, type: L.Type): FieldReader => {
  switch (type._tag) {
    case "Scalar":
      return scalarReader(type)
    case "Enum":
      return (r, previous, wireType) => {
        if (wireType !== Wire.WIRE_VARINT) wrongWireType(wireType, Wire.WIRE_VARINT)
        const value = L.enumValue(type, r.int32())
        if (value !== L.UNKNOWN_ENUM) return value
        r.drop = true
        return previous
      }
    default: {
      const read = fieldsReader(compiled, type)
      return (r, previous, wireType, number, depth) => {
        if (wireType === Wire.WIRE_SGROUP) return read(r, previous, r.buf.length, number, depth + 1)
        if (wireType !== Wire.WIRE_LEN) wrongWireType(wireType, Wire.WIRE_LEN)
        return read(r, previous, r.delimited(), undefined, depth + 1)
      }
    }
  }
}

// The common scalars have their own readers, which skip the indirection of the
// others.
const scalarReader = (type: L.Scalar): FieldReader => {
  switch (type.int64As === "bigint" ? type.scalar : undefined) {
    case "string":
      if (!type.validateUtf8) break
      return (r, _, wireType) => wireType === Wire.WIRE_LEN ? r.string() : wrongWireType(wireType, Wire.WIRE_LEN)
    case "bool":
      return (r, _, wireType) => wireType === Wire.WIRE_VARINT ? r.bool() : wrongWireType(wireType, Wire.WIRE_VARINT)
    case "double":
      return (r, _, wireType) => wireType === Wire.WIRE_I64 ? r.double() : wrongWireType(wireType, Wire.WIRE_I64)
    case "int32":
      return (r, _, wireType) => wireType === Wire.WIRE_VARINT ? r.int32() : wrongWireType(wireType, Wire.WIRE_VARINT)
    case "uint32":
      return (r, _, wireType) =>
        wireType === Wire.WIRE_VARINT ? r.varint32() : wrongWireType(wireType, Wire.WIRE_VARINT)
  }
  const expected = type.wireType
  const read = scalarCodec(type).read
  return (r, _, wireType) => wireType === expected ? read(r) : wrongWireType(wireType, expected)
}

// The path of `target` in a decoded value.
const pathTo = (value: unknown, target: object): Array<PropertyKey> | undefined => {
  if (value === target) return []
  if (typeof value !== "object" || value === null || !isDecodedCollection(value)) return undefined
  for (const key of Reflect.ownKeys(value)) {
    if (key === "length" && Array.isArray(value)) continue
    const path = pathTo((value as Record<PropertyKey, unknown>)[key], target)
    if (path !== undefined) {
      path.unshift(Array.isArray(value) ? Number(key) : key)
      return path
    }
  }
  return undefined
}

// Decoded collections are arrays and plain objects.
const isDecodedCollection = (value: object): boolean => {
  const proto = Object.getPrototypeOf(value)
  return Array.isArray(value) || proto === Object.prototype || proto === null
}

// Fails for the first `Invalid` value in a decoded value, with its path.
const rejectInvalid = (value: unknown): void => {
  const path: Array<PropertyKey> = []
  const found = findInvalid(value, path)
  if (found === undefined) return
  const e = new Wire.WireError(found.reason)
  e.path.push(...path)
  throw e
}

const findInvalid = (value: unknown, path: Array<PropertyKey>): Invalid | undefined => {
  if (value instanceof Invalid) return value
  if (typeof value !== "object" || value === null || !isDecodedCollection(value)) return undefined
  for (const key of Reflect.ownKeys(value)) {
    if (key === "length" && Array.isArray(value)) continue
    const found = findInvalid((value as Record<PropertyKey, unknown>)[key], path)
    if (found !== undefined) {
      path.unshift(Array.isArray(value) ? Number(key) : key)
      return found
    }
  }
  return undefined
}
