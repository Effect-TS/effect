// The layout of a schema on the wire: its messages, their fields and oneofs,
// and how each property is present. `compile.ts` builds it from the protobuf
// annotations of a schema, and the codec interprets it without reading the
// schema.

import type { ScalarName } from "./schema.ts"
import { is64Bit } from "./schema.ts"
import * as Wire from "./wire.ts"

// -----------------------------------------------------------------------------
// types
// -----------------------------------------------------------------------------

/**
 * How a single value is written, without its tag.
 *
 * @internal
 */
export type Type = Scalar | Enum | MessageType | Converted

/** @internal */
export interface Scalar {
  readonly _tag: "Scalar"
  readonly scalar: ScalarName
  readonly wireType: number
  // How a 64-bit integer is held: a `bigint`, or a safe integer `number`, or a
  // decimal `string`, like `[jstype = JS_NUMBER]` and `[jstype = JS_STRING]`.
  readonly int64As: Int64As
  // Whether a string fails to decode for invalid UTF-8, rather than holding
  // replacement characters.
  readonly validateUtf8: boolean
}

/** @internal */
export interface Enum {
  readonly _tag: "Enum"
  readonly wireType: typeof Wire.WIRE_VARINT
  readonly toNumber: ReadonlyMap<unknown, number>
  readonly fromNumber: ReadonlyMap<number, unknown>
  // An open enum decodes an unknown number to itself; a closed one keeps it in
  // the unknown fields.
  readonly open: boolean
  // The value of an absent field: that of 0, or for a closed enum without 0,
  // its first value, as in proto2.
  readonly zero: unknown
}

/** @internal */
export interface MessageType {
  readonly _tag: "Message"
  readonly wireType: typeof Wire.WIRE_LEN
  readonly message: Message
}

/**
 * A value written as a message of another shape, such as a `DateTime.Utc`
 * written as the seconds and nanos of a `google.protobuf.Timestamp`.
 *
 * @internal
 */
export interface Converted {
  readonly _tag: "Converted"
  readonly wireType: typeof Wire.WIRE_LEN
  readonly message: Message
  // Throws a `WireError` for a value without a representation.
  readonly toMessage: (value: unknown) => unknown
  // Why decoded fields are not a value, such as "timestamp out of range".
  readonly invalid: (fields: any) => string | undefined
  readonly fromMessage: (fields: any) => unknown
}

/**
 * What a property holds when its field is absent:
 *
 * - `"zero"`: implicit presence, the zero value
 * - `"omit"`: the key is left out
 * - `"required"`: nothing, which fails to decode
 *
 * @internal
 */
export type Absent = "zero" | "omit" | "required"

interface SlotBase {
  readonly key: PropertyKey
  readonly absent: Absent
  // The key is a member of `Object.prototype`, so it is only read when own, and
  // `__proto__` is defined rather than assigned.
  readonly guarded: boolean
}

/** @internal */
export interface Singular extends SlotBase {
  readonly _tag: "Singular"
  readonly number: number
  readonly type: Type
  // Writes the zero value of an implicit-presence field.
  readonly always: boolean
  readonly delimited: boolean
}

/** @internal */
export interface Repeated extends SlotBase {
  readonly _tag: "Repeated"
  readonly number: number
  readonly element: Type
  readonly packed: boolean
  readonly delimited: boolean
}

/** @internal */
export interface MapField extends SlotBase {
  readonly _tag: "Map"
  readonly number: number
  readonly keyType: Scalar
  // The wire value of a key of a value to encode, or `undefined` for a key that
  // the key schema rejects, which is left out, as `Schema.Record` leaves it.
  readonly wireKey: (key: string) => unknown
  readonly value: Type
}

/** @internal */
export interface Oneof extends SlotBase {
  readonly _tag: "Oneof"
  readonly cases: ReadonlyArray<Case>
  // The case of a present value, a tagged struct `{ _tag, value }`.
  readonly select: (value: unknown) => Case | undefined
}

/** @internal */
export interface Case {
  readonly _tag: "Case"
  readonly oneof: Oneof
  readonly number: number
  readonly type: Type
  readonly delimited: boolean
  // The `_tag` of the case.
  readonly tag: string
}

/**
 * A property of a message.
 *
 * @internal
 */
export type Slot = Singular | Repeated | MapField | Oneof

/**
 * A numbered field of a message.
 *
 * @internal
 */
export type Field = Singular | Repeated | MapField | Case

/** @internal */
export interface Message {
  readonly name: string
  // - `struct`: an object with a slot per property
  // - `box`: a wrapper message whose one slot holds the value itself
  readonly shape: "struct" | "box"
  // A message the schema does not name, such as a box: its keys are not part
  // of issue paths.
  readonly synthetic: boolean
  readonly slots: Array<Slot>
  readonly oneofs: Array<Oneof>
  // The keys of the struct in schema order, which decoded values follow.
  readonly order: Array<PropertyKey>
  // The optional property that keeps the fields the message does not declare.
  unknown: PropertyKey | undefined
  // The extensions that decoding checks, each the box of its field. They stay
  // in the unknown fields.
  readonly extensions: Array<MessageType>
  // In field-number order, the order fields are written in.
  readonly fields: Array<Field>
  readonly byNumber: Map<number, Field>
}

// The slot key of a box, never part of an issue path.
/** @internal */
export const BOX_VALUE = Symbol("Protobuf/box")

/**
 * What `toCodec` writes: the fields of a message, or of a converted value at
 * the root.
 *
 * @internal
 */
export type Root = MessageType | Converted

// -----------------------------------------------------------------------------
// values
// -----------------------------------------------------------------------------

/** @internal */
export type Int64As = "bigint" | "number" | "string"

/** @internal */
export const scalar = (scalar: ScalarName, int64As: Int64As = "bigint", validateUtf8 = true): Scalar => {
  return { _tag: "Scalar", scalar, wireType: scalarWireType(scalar), int64As, validateUtf8 }
}

const scalarWireType = (scalar: ScalarName): number => {
  switch (scalar) {
    case "double":
    case "fixed64":
    case "sfixed64":
      return Wire.WIRE_I64
    case "float":
    case "fixed32":
    case "sfixed32":
      return Wire.WIRE_I32
    case "string":
    case "bytes":
      return Wire.WIRE_LEN
    default:
      return Wire.WIRE_VARINT
  }
}

/** @internal */
export const isPackable = (type: Type): type is Scalar | Enum => {
  return type._tag === "Enum" || (type._tag === "Scalar" && type.wireType !== Wire.WIRE_LEN)
}

/** @internal */
export const messageType = (message: Message): MessageType => {
  return { _tag: "Message", wireType: Wire.WIRE_LEN, message }
}

/**
 * The zero value of a type that is not a message.
 *
 * @internal
 */
export const zeroOf = (type: Scalar | Enum): unknown => {
  switch (type._tag) {
    case "Scalar":
      switch (type.scalar) {
        case "bool":
          return false
        case "string":
          return ""
        case "bytes":
          return Wire.EMPTY_BYTES
        default:
          if (!is64Bit(type.scalar)) return 0
          return type.int64As === "bigint" ? Wire.BIGINT_ZERO : type.int64As === "number" ? 0 : "0"
      }
    case "Enum":
      return type.zero
  }
}

/**
 * The value of an enum number, or `UNKNOWN_ENUM` for a number that a closed
 * enum does not have.
 *
 * @internal
 */
export const enumValue = (type: Enum, n: number): unknown => {
  const value = type.fromNumber.get(n)
  return value !== undefined ? value : type.open ? n : UNKNOWN_ENUM
}

/** @internal */
export const UNKNOWN_ENUM = Symbol("Protobuf/unknownEnum")

/**
 * The value of an absent repeated or map field, shared like the empty bytes of
 * `Wire.EMPTY_BYTES`, and frozen so that no one can change it.
 *
 * @internal
 */
export const EMPTY_LIST: ReadonlyArray<never> = Object.freeze([])

/** @internal */
export const EMPTY_RECORD: Readonly<Record<string, never>> = Object.freeze({})

/**
 * The absent value of a slot that is not a message, or `undefined` when the
 * key is left out.
 *
 * @internal
 */
export const absentValue = (slot: Slot): unknown => {
  switch (slot.absent) {
    case "zero":
      switch (slot._tag) {
        case "Repeated":
          return EMPTY_LIST
        case "Map":
          return EMPTY_RECORD
        case "Singular":
          return zeroOf(slot.type as Scalar | Enum)
        default:
          return undefined
      }
    default:
      return undefined
  }
}

/**
 * Creates an empty message. Its slots are added with `addSlot`, which rejects
 * duplicate field numbers, and `finishMessage` prepares it for the codec.
 *
 * @internal
 */
export const makeMessage = (
  name: string,
  shape: Message["shape"],
  options?: { readonly synthetic?: boolean }
): Message => {
  return {
    name,
    shape,
    synthetic: options?.synthetic ?? shape === "box",
    slots: [],
    oneofs: [],
    order: [],
    unknown: undefined,
    extensions: [],
    fields: [],
    byNumber: new Map()
  }
}

/** @internal */
export const addSlot = (message: Message, slot: Slot): void => {
  message.slots.push(slot)
  if (slot._tag === "Oneof") {
    message.oneofs.push(slot)
    for (const c of slot.cases) addField(message, c, describeKey(slot.key))
  } else {
    addField(message, slot, describeKey(slot.key))
  }
}

const addField = (message: Message, field: Field, describe: string): void => {
  if (message.byNumber.has(field.number)) {
    throw layoutError(`duplicate field number ${field.number} in ${message.name} (${describe})`)
  }
  message.byNumber.set(field.number, field)
  message.fields.push(field)
}

/** @internal */
export const finishMessage = (message: Message): Message => {
  message.fields.sort((a, b) => a.number - b.number)
  return message
}

/** @internal */
export const layoutError = (message: string): Error => {
  return new Error(`Protobuf layout: ${message}`)
}

/** @internal */
export const describeKey = (key: PropertyKey): string => {
  if (key === BOX_VALUE) return "value"
  return typeof key === "string" ? `"${key}"` : String(key)
}
