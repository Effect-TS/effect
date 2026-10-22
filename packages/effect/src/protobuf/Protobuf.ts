/**
 * Protocol Buffers binary codecs derived from Effect schemas.
 *
 * The schemas are written by `protoc-gen-effect` from `.proto` files.
 * {@link toCodec} compiles the encoded side of a schema into a protobuf message
 * layout through the schemas and annotations of this module, and infers
 * nothing else: a schema they do not cover fails when the codec is created.
 * The bytes match what other protobuf implementations write for the same
 * `.proto`.
 *
 * | Schema                                          | Protobuf                                        |
 * | ----------------------------------------------- | ----------------------------------------------- |
 * | {@link Message}                                 | `message`; each property needs {@link field}    |
 * | `String`, `Boolean`, `Uint8Array`               | `string`, `bool`, `bytes`                       |
 * | {@link Double}, {@link Int32}, {@link Int64}, … | the numeric scalars                             |
 * | {@link Enum}, {@link OpenEnum}                  | `enum`, closed or open                          |
 * | `Array(A)`                                      | `repeated A`, packed for numeric and enum types |
 * | {@link Map}                                     | `map<K, A>`                                     |
 * | {@link Oneof}                                   | `oneof`, as a tagged union                      |
 * | `optionalKey`                                   | explicit presence (`optional`)                  |
 * | required scalar, enum, repeated, or map         | implicit presence                               |
 * | {@link Timestamp}, {@link Duration}, …          | the well-known types                            |
 *
 * Checks and transformations around these schemas, and classes of a
 * {@link Message}, run in the schema pass and leave the layout as it is.
 *
 * A required scalar, enum, repeated, or map property uses implicit presence:
 * its zero value is not written, and an absent field decodes to the zero
 * value. A required message or oneof property, and a scalar with
 * `required: true`, fail to decode when absent.
 *
 * Fields are written in field-number order. Decoding accepts fields in any
 * order, keeps the last occurrence of a scalar, merges repeated occurrences of
 * a message field, accepts packed and unpacked repeated fields, and accepts
 * both encodings of a message field. A known field sent with a wire type that
 * does not match its type fails to decode. Fields that a schema does not
 * declare are kept at the {@link unknown} property of a {@link Message}.
 *
 * Map keys are written as their protobuf type, so integer keys decode in their
 * canonical form: the keys `"007"` and `"-0"` of a `Map(Int32, A)` decode
 * as `"7"` and `"0"`. Empty `bytes`, and absent repeated and map fields,
 * decode to one shared, frozen `Uint8Array`, array, and record.
 *
 * @stability experimental
 * @since 4.0.6
 */
import * as Arr from "../Array.ts"
import * as Bytes from "../Bytes.ts"
import * as InternalRecord from "../internal/record.ts"
import * as Option from "../Option.ts"
import * as Schema from "../Schema.ts"
import * as SchemaAST from "../SchemaAST.ts"
import * as Codec from "./internal/codec.ts"
import * as Compile from "./internal/compile.ts"
import * as Layout from "./internal/layout.ts"
import * as ProtobufSchema from "./internal/schema.ts"
import * as Transform from "./internal/transform.ts"
import * as Wire from "./internal/wire.ts"
import * as Wkt from "./internal/wkt.ts"

// -----------------------------------------------------------------------------
// annotations
// -----------------------------------------------------------------------------

// The options of `field` and `extension`.
interface FieldOptions {
  /**
   * Writes a repeated numeric or enum field packed (`true`) or as one record
   * per element (`false`, the proto2 default). Other fields reject it.
   *
   * @default true
   */
  readonly packed?: boolean | undefined
  /**
   * Makes a scalar or enum property a proto2 `required` field, like the
   * `LEGACY_REQUIRED` presence of editions: it is written even when it holds
   * its zero value, and a missing field fails to decode. Other fields,
   * including messages and optional fields, reject it; a required message is a
   * property that is not optional.
   *
   * @default false
   */
  readonly required?: boolean | undefined
  /**
   * Writes a message field between group tags instead of length-prefixed,
   * like proto2 groups and the `DELIMITED` message encoding of editions.
   *
   * @default false
   */
  readonly delimited?: boolean | undefined
  /**
   * With `false`, strings decode with replacement characters for invalid
   * UTF-8 instead of failing, like proto2 strings and the
   * `utf8_validation = NONE` feature of editions. Fields without strings
   * reject it.
   *
   * @default true
   */
  readonly validateUtf8?: boolean | undefined
  /**
   * The `[default = …]` of a scalar or enum field, as its decoded value. As in
   * protobuf, an absent field stays absent when decoded, and the default is
   * what reading it stands for; the schema records it for its readers. Other
   * fields reject it.
   */
  readonly default?: unknown
  /**
   * The name of the field in its `.proto` file.
   *
   * @default the property key with each upper-case letter replaced by `_`
   * and the letter in lower case, such as `user_id` for `userId`
   */
  readonly name?: string | undefined
  /**
   * The `json_name` of the field, its name in the protobuf JSON mapping.
   *
   * @default the property key
   */
  readonly jsonName?: string | undefined
}

/**
 * Assigns the protobuf field number of a {@link Message} property, or of the
 * value of a {@link Oneof} case.
 *
 * **Details**
 *
 * Valid numbers are integers from 1 through 536870911, except the reserved
 * range 19000 through 19999. Invalid numbers throw immediately.
 *
 * **Example** (Numbering message fields)
 *
 * ```ts
 * import { Schema } from "effect"
 * import { Protobuf } from "effect/protobuf"
 *
 * // message User { uint64 id = 1; string name = 2; repeated string tags = 3; }
 * const User = Protobuf.Message("acme.v1.User", {
 *   id: Protobuf.UInt64.pipe(Protobuf.field(1)),
 *   name: Schema.String.pipe(Protobuf.field(2)),
 *   tags: Schema.Array(Schema.String).pipe(Protobuf.field(3))
 * })
 * ```
 *
 * @stability experimental
 * @category annotations
 * @since 4.0.6
 */
export const field = (number: number, options?: FieldOptions) => {
  ProtobufSchema.checkFieldNumber(number)
  const annotations = { [ProtobufSchema.FIELD]: fieldAnnotation(number, options) }
  return <S extends Schema.ConstraintRebuildable>(self: S): S["Rebuild"] =>
    schemaOf(self).rebuild(SchemaAST.annotateKey(self.ast, annotations))
}

// `field` takes a `Schema.ConstraintRebuildable` rather than a `Schema.Top`:
// checking a `Schema.suspend` against `Schema.Top` resolves the
// type it suspends, which makes the type of a recursive message, declared as
// `interface Node extends Schema.Schema.Type<typeof Node> {}`, circular.
const schemaOf = (self: Schema.ConstraintRebuildable): Schema.Top => self as unknown as Schema.Top

const fieldAnnotation = (number: number, options: FieldOptions | undefined): ProtobufSchema.FieldAnnotation => {
  return {
    number,
    packed: options?.packed,
    required: options?.required,
    delimited: options?.delimited,
    validateUtf8: options?.validateUtf8,
    default: options?.default,
    name: options?.name,
    jsonName: options?.jsonName
  }
}

/**
 * The key of the property of a {@link Message} that keeps the fields it does
 * not declare, as their bytes.
 *
 * **Details**
 *
 * A symbol keeps the bytes out of `Object.keys`, `JSON.stringify`, and logs.
 * {@link getExtension} and the other extension functions read and write this
 * property.
 *
 * @stability experimental
 * @category unknown fields
 * @since 4.0.6
 */
export const unknown: unique symbol = Symbol.for("effect/protobuf/Protobuf/unknown")

const UnknownFieldsBytes = Schema.Uint8Array.annotate({ [ProtobufSchema.UNKNOWN]: true })

/**
 * The property that a {@link Message} adds to its fields, which keeps the
 * fields it does not declare.
 *
 * @stability experimental
 * @category models
 * @since 4.0.6
 */
export type UnknownFields = {
  readonly [unknown]: Schema.optionalKey<Schema.Uint8Array>
}

// The schema of a message: a struct of its fields and of the unknown fields.
type Message<Fields extends Schema.Struct.Fields> = Schema.Struct<Fields & UnknownFields>

/**
 * Creates the schema of the protobuf message `name`, such as
 * `"acme.shop.v1.Product"`: a struct of `fields`, each numbered with
 * {@link field}.
 *
 * **When to use**
 *
 * Use to declare a message. `Schema.Class` takes the struct for a message
 * whose values are instances of a class.
 *
 * **Details**
 *
 * The message keeps the fields it does not declare, such as those of a newer
 * peer, at the {@link unknown} property: decoding collects them as their bytes,
 * and encoding writes them back after the declared fields. The property is left
 * out when there are none, and its {@link extension} values live there too.
 * Encoding fails for bytes that are not well-formed fields, or that hold a
 * field the message declares.
 *
 * The full name is the type URL of {@link anyPack}, the key of a
 * {@link registry}, and the name of an extendee, and is also the `identifier`
 * of the schema.
 *
 * **Example** (Declaring a message)
 *
 * ```ts
 * import { Schema } from "effect"
 * import { Protobuf } from "effect/protobuf"
 *
 * // message User { uint64 id = 1; string name = 2; }
 * const User = Protobuf.Message("acme.v1.User", {
 *   id: Protobuf.UInt64.pipe(Protobuf.field(1)),
 *   name: Schema.String.pipe(Protobuf.field(2))
 * })
 * interface User extends Schema.Schema.Type<typeof User> {}
 *
 * // a message whose values are instances of a class
 * class Event extends Schema.Class<Event>("Event")(
 *   Protobuf.Message("acme.v1.Event", { id: Protobuf.Int32.pipe(Protobuf.field(1)) })
 * ) {}
 * ```
 *
 * @stability experimental
 * @category constructors
 * @since 4.0.6
 */
export const Message = <const Fields extends Schema.Struct.Fields>(name: string, fields: Fields): Message<Fields> => {
  return Schema.Struct({ ...fields, [unknown]: Schema.optionalKey(UnknownFieldsBytes) }).annotate({
    [ProtobufSchema.MESSAGE]: name,
    identifier: name
  }) as any
}

/**
 * Creates the schema of the protobuf message `name` with the legacy MessageSet
 * wire format, as `option message_set_wire_format = true` declares.
 *
 * **Details**
 *
 * A MessageSet has no fields of its own. It holds its extensions, each a
 * message, as MessageSet items: groups of the type id of the extension and the
 * bytes of its message. They live at the {@link unknown} property, like the
 * extensions of any {@link Message}.
 *
 * @stability experimental
 * @category constructors
 * @since 4.0.6
 */
export const MessageSet = (name: string): Message<{}> => {
  return Schema.Struct({ [unknown]: Schema.optionalKey(UnknownFieldsBytes) }).annotate({
    [ProtobufSchema.MESSAGE]: name,
    [ProtobufSchema.MESSAGE_SET]: true,
    identifier: name
  })
}

// The schema of a oneof: an optional property of a tagged union of a
// `{ _tag, value }` struct per case.
type Oneof<Cases extends Readonly<Record<string, Schema.Constraint>>> = Schema.optionalKey<
  Schema.TaggedUnion<
    { readonly [K in keyof Cases & string]: Schema.TaggedStruct<K, { readonly value: Cases[K] }> }
  >
>

/**
 * A `oneof`: the property of a {@link Message} holding a tagged union with a
 * case per field, whose `value` holds the field.
 *
 * **Details**
 *
 * Each case schema carries its own {@link field} number. The property is
 * optional, and absent when no case is set, as a oneof may always be.
 *
 * Encoding writes the case named by `_tag`. A later occurrence of the same
 * message case merges into it, and another case replaces it.
 *
 * **Example** (Declaring a oneof)
 *
 * ```ts
 * import { Schema } from "effect"
 * import { Protobuf } from "effect/protobuf"
 *
 * // message Delivery { oneof method { string address = 1; uint32 locker = 2; } }
 * const Delivery = Protobuf.Message("acme.v1.Delivery", {
 *   method: Protobuf.Oneof({
 *     address: Schema.String.pipe(Protobuf.field(1)),
 *     locker: Protobuf.UInt32.pipe(Protobuf.field(2))
 *   })
 * })
 *
 * // { _tag: "address"; value: string } | { _tag: "locker"; value: number } | undefined
 * type Method = typeof Delivery.Type.method
 * ```
 *
 * @stability experimental
 * @category constructors
 * @since 4.0.6
 */
export const Oneof = <const Cases extends Readonly<Record<string, Schema.Constraint>>>(cases: Cases): Oneof<Cases> => {
  const fields: Record<string, { readonly value: Schema.Constraint }> = {}
  for (const tag of Object.keys(cases)) InternalRecord.assignProperty(fields, tag, { value: cases[tag] })
  return Schema.optionalKey(Schema.TaggedUnion(fields).annotate({ [ProtobufSchema.ONEOF]: true })) as any
}

/**
 * Creates the closed protobuf enum `name`, such as `"acme.v1.Status"`: a
 * string literal for each value name of `values`, as in the `.proto` file, and
 * written as its number.
 *
 * **Details**
 *
 * The literals are the value names, such as `"STATUS_ACTIVE"`, as in the JSON
 * mapping of protobuf. Several names may share a number, like enum aliases:
 * the first one decodes.
 *
 * A closed enum, as in proto2 and the `CLOSED` enums of editions, decodes a
 * field with an unknown number as an unknown field of its message: a singular
 * field keeps the value it had, an array skips the element, and a map skips the
 * entry. An implicit-presence field of a closed enum needs a value for 0.
 *
 * @see {@link OpenEnum} for an enum that decodes unknown numbers.
 *
 * **Example** (Declaring a closed enum)
 *
 * ```ts
 * import { Protobuf } from "effect/protobuf"
 *
 * // enum Status { STATUS_UNSPECIFIED = 0; STATUS_ACTIVE = 1; }
 * const Status = Protobuf.Enum("acme.v1.Status", {
 *   STATUS_UNSPECIFIED: 0,
 *   STATUS_ACTIVE: 1
 * })
 *
 * // "STATUS_UNSPECIFIED" | "STATUS_ACTIVE"
 * type Status = typeof Status.Type
 * ```
 *
 * @stability experimental
 * @category constructors
 * @since 4.0.6
 */
export const Enum = <const Values extends Readonly<Record<string, number>>>(
  name: string,
  values: Values
): Schema.Literals<ReadonlyArray<keyof Values & string>> => {
  const [literals, layout] = makeEnum("Enum", name, values, false)
  return literals.annotate({ [ProtobufSchema.ENUM]: layout })
}

/**
 * Creates the open protobuf enum `name`, such as `"acme.v1.Status"`: a string
 * literal for each value name of `values`, written as its number, or any
 * other number.
 *
 * **Details**
 *
 * Values are given as for {@link Enum}. An open enum, as in proto3 and the
 * `OPEN` enums of editions, decodes an unknown number as the number itself;
 * known numbers always decode to their name.
 *
 * **Example** (Declaring an open enum)
 *
 * ```ts
 * import { Protobuf } from "effect/protobuf"
 *
 * // enum Status { STATUS_UNSPECIFIED = 0; STATUS_ACTIVE = 1; }
 * const Status = Protobuf.OpenEnum("acme.v1.Status", {
 *   STATUS_UNSPECIFIED: 0,
 *   STATUS_ACTIVE: 1
 * })
 *
 * // "STATUS_UNSPECIFIED" | "STATUS_ACTIVE" | number
 * type Status = typeof Status.Type
 * ```
 *
 * @stability experimental
 * @category constructors
 * @since 4.0.6
 */
export const OpenEnum = <
  const Values extends Readonly<Record<string, number>>
>(
  name: string,
  values: Values
): Schema.Union<readonly [Schema.Literals<ReadonlyArray<keyof Values & string>>, Schema.Number]> => {
  const [literals, layout] = makeEnum("OpenEnum", name, values, true)
  return Schema.Union([literals, Int32]).annotate({ [ProtobufSchema.ENUM]: layout })
}

const makeEnum = (
  constructor: string,
  name: string,
  values: Readonly<Record<string, number>>,
  open: boolean
): readonly [Schema.Literals<ReadonlyArray<string>>, Layout.Enum] => {
  const keys = Object.keys(values)
  if (!Arr.isArrayNonEmpty(keys)) throw new Error(`Protobuf.${constructor} ${name} needs at least one value`)
  const numbers: Array<readonly [string, number]> = []
  for (const key of keys) {
    const number = values[key]
    if (!Wire.isInt32(number)) {
      throw new Error(`Protobuf.${constructor} value ${key} of ${name} must be a 32-bit integer, got ${number}`)
    }
    numbers.push([key, number])
  }
  return [Schema.Literals(keys), Layout.makeEnum(name, numbers, open)]
}

const Map_ = <K extends Schema.String | Schema.Number, V extends Schema.Constraint>(
  key: K,
  value: V
): Schema.$Record<K, V> => {
  return Schema.Record(key, value).annotate({ [ProtobufSchema.MAP]: true })
}

export {
  /**
   * Creates the schema of a protobuf `map<key, value>`: a record of the keys
   * of `key`.
   *
   * **Details**
   *
   * The key is `Schema.String` for `string` keys, a 32-bit integer scalar such
   * as {@link SInt32} for `number` keys, a 64-bit integer scalar as a string
   * such as {@link Int64String}, as numbers cannot hold every 64-bit integer,
   * or {@link BoolKey}. Keys decode in their canonical form: the keys `"007"`
   * and `"-0"` of a `Map(Int32, A)` decode as `"7"` and `"0"`.
   *
   * **Example** (Declaring maps)
   *
   * ```ts
   * import { Schema } from "effect"
   * import { Protobuf } from "effect/protobuf"
   *
   * // message Catalog { map<int64, string> names = 1; map<sint32, string> labels = 2; }
   * const Catalog = Protobuf.Message("acme.v1.Catalog", {
   *   names: Protobuf.Map(Protobuf.Int64String, Schema.String).pipe(Protobuf.field(1)),
   *   labels: Protobuf.Map(Protobuf.SInt32, Schema.String).pipe(Protobuf.field(2))
   * })
   * ```
   *
   * @stability experimental
   * @category constructors
   * @since 4.0.6
   */
  Map_ as Map
}

// -----------------------------------------------------------------------------
// scalars
// -----------------------------------------------------------------------------

// The checks of the scalars, which the wire layer enforces on its own.
const PROVEN = { [ProtobufSchema.PROVEN]: true }

// Annotating before checking keeps the scalar type on the node itself, where a
// later `.check` or `.annotate` cannot move it.
const scalarNumber = (scalar: ProtobufSchema.ScalarName, ...checks: Array<SchemaAST.Check<number>>): Schema.Number => {
  const annotated = Schema.Number.annotate({ [ProtobufSchema.SCALAR]: scalar })
  return Arr.isArrayNonEmpty(checks) ? annotated.check(...checks) : annotated
}

// A 64-bit integer as its canonical decimal string, in the range of the scalar.
const scalarString = (scalar: ProtobufSchema.ScalarName): Schema.String => {
  const unsigned = ProtobufSchema.isUnsigned(scalar)
  const pattern = unsigned ? /^(?:0|[1-9]\d*)$/ : /^(?:0|-?[1-9]\d*)$/
  const minimum = unsigned ? Wire.BIGINT_ZERO : Wire.INT64_MIN
  const maximum = unsigned ? Wire.UINT64_MAX : Wire.INT64_MAX
  return Schema.String.annotate({ [ProtobufSchema.SCALAR]: scalar }).check(
    Schema.makeFilter((s: string) => {
      if (!pattern.test(s)) return false
      const n = BigInt(s)
      return n >= minimum && n <= maximum
    }, { expected: `a protobuf ${scalar} as a decimal string`, ...PROVEN })
  )
}

const scalarBigInt = (scalar: ProtobufSchema.ScalarName): Schema.BigInt => {
  return Schema.BigInt.annotate({ [ProtobufSchema.SCALAR]: scalar }).check(
    ProtobufSchema.isUnsigned(scalar)
      ? Schema.isBetweenBigInt({ minimum: Wire.BIGINT_ZERO, maximum: Wire.UINT64_MAX }, PROVEN)
      : Schema.isBetweenBigInt({ minimum: Wire.INT64_MIN, maximum: Wire.INT64_MAX }, PROVEN)
  )
}

/**
 * Schema for the protobuf `double` type.
 *
 * @stability experimental
 * @category schemas
 * @since 4.0.6
 */
export const Double: Schema.Number = scalarNumber("double")

/**
 * Schema for the protobuf `float` type.
 *
 * **Gotchas**
 *
 * Values are rounded to 32-bit precision on the wire, so a value that is not
 * exactly representable decodes to a nearby number. Finite values outside the
 * 32-bit range fail to encode.
 *
 * @stability experimental
 * @category schemas
 * @since 4.0.6
 */
export const Float: Schema.Number = scalarNumber("float")

/**
 * Schema for the protobuf `int32` type.
 *
 * @stability experimental
 * @category schemas
 * @since 4.0.6
 */
export const Int32: Schema.Number = scalarNumber("int32", Schema.isInt32(PROVEN))

/**
 * Schema for the protobuf `uint32` type.
 *
 * @stability experimental
 * @category schemas
 * @since 4.0.6
 */
export const UInt32: Schema.Number = scalarNumber("uint32", Schema.isUint32(PROVEN))

/**
 * Schema for the protobuf `sint32` type, a zigzag encoding that keeps small
 * negative numbers short.
 *
 * @stability experimental
 * @category schemas
 * @since 4.0.6
 */
export const SInt32: Schema.Number = scalarNumber("sint32", Schema.isInt32(PROVEN))

/**
 * Schema for the protobuf `fixed32` type, an unsigned 4-byte integer.
 *
 * @stability experimental
 * @category schemas
 * @since 4.0.6
 */
export const Fixed32: Schema.Number = scalarNumber("fixed32", Schema.isUint32(PROVEN))

/**
 * Schema for the protobuf `sfixed32` type, a signed 4-byte integer.
 *
 * @stability experimental
 * @category schemas
 * @since 4.0.6
 */
export const SFixed32: Schema.Number = scalarNumber("sfixed32", Schema.isInt32(PROVEN))

/**
 * Schema for the protobuf `int64` type as a `bigint`.
 *
 * @see {@link Int64Number} for an `int64` represented as a `number`.
 *
 * @stability experimental
 * @category schemas
 * @since 4.0.6
 */
export const Int64: Schema.BigInt = scalarBigInt("int64")

/**
 * Schema for the protobuf `uint64` type as a `bigint`.
 *
 * @see {@link UInt64Number} for a `uint64` represented as a `number`.
 *
 * @stability experimental
 * @category schemas
 * @since 4.0.6
 */
export const UInt64: Schema.BigInt = scalarBigInt("uint64")

/**
 * Schema for the protobuf `sint64` type as a `bigint`, a zigzag encoding that
 * keeps small negative numbers short.
 *
 * @stability experimental
 * @category schemas
 * @since 4.0.6
 */
export const SInt64: Schema.BigInt = scalarBigInt("sint64")

/**
 * Schema for the protobuf `fixed64` type as a `bigint`, an unsigned 8-byte
 * integer.
 *
 * @stability experimental
 * @category schemas
 * @since 4.0.6
 */
export const Fixed64: Schema.BigInt = scalarBigInt("fixed64")

/**
 * Schema for the protobuf `sfixed64` type as a `bigint`, a signed 8-byte
 * integer.
 *
 * @stability experimental
 * @category schemas
 * @since 4.0.6
 */
export const SFixed64: Schema.BigInt = scalarBigInt("sfixed64")

/**
 * Schema for the protobuf `int64` type as a `number`, like
 * `[jstype = JS_NUMBER]`.
 *
 * **Gotchas**
 *
 * Values must be safe integers. Decoding a value outside the safe integer
 * range fails instead of losing precision.
 *
 * @see {@link Int64} for the full 64-bit range.
 *
 * @stability experimental
 * @category schemas
 * @since 4.0.6
 */
export const Int64Number: Schema.Number = scalarNumber("int64", Schema.isInt(PROVEN))

/**
 * Schema for the protobuf `uint64` type as a `number`, like
 * `[jstype = JS_NUMBER]`.
 *
 * **Gotchas**
 *
 * Values must be non-negative safe integers. Decoding a value outside the
 * safe integer range fails instead of losing precision.
 *
 * @see {@link UInt64} for the full 64-bit range.
 *
 * @stability experimental
 * @category schemas
 * @since 4.0.6
 */
export const UInt64Number: Schema.Number = scalarNumber(
  "uint64",
  Schema.isInt(PROVEN),
  Schema.isGreaterThanOrEqualTo(0, PROVEN)
)

/**
 * Schema for the protobuf `sint64` type as a `number`, like
 * `[jstype = JS_NUMBER]`.
 *
 * @see {@link Int64Number} for the gotchas of 64-bit numbers.
 *
 * @stability experimental
 * @category schemas
 * @since 4.0.6
 */
export const SInt64Number: Schema.Number = scalarNumber("sint64", Schema.isInt(PROVEN))

/**
 * Schema for the protobuf `fixed64` type as a `number`, like
 * `[jstype = JS_NUMBER]`.
 *
 * @see {@link UInt64Number} for the gotchas of 64-bit numbers.
 *
 * @stability experimental
 * @category schemas
 * @since 4.0.6
 */
export const Fixed64Number: Schema.Number = scalarNumber(
  "fixed64",
  Schema.isInt(PROVEN),
  Schema.isGreaterThanOrEqualTo(0, PROVEN)
)

/**
 * Schema for the protobuf `sfixed64` type as a `number`, like
 * `[jstype = JS_NUMBER]`.
 *
 * @see {@link Int64Number} for the gotchas of 64-bit numbers.
 *
 * @stability experimental
 * @category schemas
 * @since 4.0.6
 */
export const SFixed64Number: Schema.Number = scalarNumber("sfixed64", Schema.isInt(PROVEN))

/**
 * Schema for the protobuf `int64` type as a decimal string, like
 * `[jstype = JS_STRING]`.
 *
 * **Details**
 *
 * Strings are canonical: no leading zeros, `+` sign, or `-0`. They hold the
 * full 64-bit range.
 *
 * @stability experimental
 * @category schemas
 * @since 4.0.6
 */
export const Int64String: Schema.String = scalarString("int64")

/**
 * Schema for the protobuf `uint64` type as a decimal string, like
 * `[jstype = JS_STRING]`.
 *
 * @see {@link Int64String} for the format of the strings.
 *
 * @stability experimental
 * @category schemas
 * @since 4.0.6
 */
export const UInt64String: Schema.String = scalarString("uint64")

/**
 * Schema for the protobuf `sint64` type as a decimal string, like
 * `[jstype = JS_STRING]`.
 *
 * @see {@link Int64String} for the format of the strings.
 *
 * @stability experimental
 * @category schemas
 * @since 4.0.6
 */
export const SInt64String: Schema.String = scalarString("sint64")

/**
 * Schema for the protobuf `fixed64` type as a decimal string, like
 * `[jstype = JS_STRING]`.
 *
 * @see {@link Int64String} for the format of the strings.
 *
 * @stability experimental
 * @category schemas
 * @since 4.0.6
 */
export const Fixed64String: Schema.String = scalarString("fixed64")

/**
 * Schema for the protobuf `sfixed64` type as a decimal string, like
 * `[jstype = JS_STRING]`.
 *
 * @see {@link Int64String} for the format of the strings.
 *
 * @stability experimental
 * @category schemas
 * @since 4.0.6
 */
export const SFixed64String: Schema.String = scalarString("sfixed64")

/**
 * Schema for the keys of a `map<bool, …>`, `"true"` and `"false"`.
 *
 * @stability experimental
 * @category schemas
 * @since 4.0.6
 */
export const BoolKey: Schema.String = Schema.String.annotate({ [ProtobufSchema.SCALAR]: "bool" }).check(
  Schema.isPattern(/^(?:true|false)$/, PROVEN)
)

// -----------------------------------------------------------------------------
// well-known types
// -----------------------------------------------------------------------------

// A well-known type, annotated with its layout from `internal/wkt.ts`,
// so that a codec only holds the layouts of the types it uses.
const wellKnown =
  (layout: ProtobufSchema.WellKnown, identifier?: string) => <S extends Schema.Top>(self: S): S["Rebuild"] =>
    self.annotate(
      identifier === undefined
        ? { [ProtobufSchema.WKT]: layout }
        : { identifier, [ProtobufSchema.WKT]: layout }
    )

/**
 * Schema for `google.protobuf.Timestamp` as a `DateTime.Utc`.
 *
 * **Gotchas**
 *
 * `DateTime.Utc` has millisecond precision, so decoding drops sub-millisecond
 * nanoseconds; use {@link TimestampParts} to keep them. Only the protobuf
 * range, years 0001 through 9999, is encoded and decoded.
 *
 * @stability experimental
 * @category well-known types
 * @since 4.0.6
 */
export const Timestamp: Schema.DateTimeUtc = Schema.DateTimeUtc.pipe(wellKnown(Wkt.Timestamp))

/**
 * Schema for `google.protobuf.Timestamp` as its seconds and nanoseconds since
 * the Unix epoch.
 *
 * **When to use**
 *
 * Use when sub-millisecond precision matters, or for timestamps outside the
 * range of the protobuf type.
 *
 * **Details**
 *
 * This keeps every value a peer can send, nanoseconds included. Like other
 * implementations, the binary codec does not check the range of the protobuf
 * type, years 0001 through 9999.
 *
 * @see {@link Timestamp} for a `DateTime.Utc`.
 *
 * @stability experimental
 * @category well-known types
 * @since 4.0.6
 */
export const TimestampParts: Message<{
  readonly seconds: Schema.BigInt
  readonly nanos: Schema.Number
}> = Message("google.protobuf.Timestamp", {
  seconds: Int64.pipe(field(1)),
  nanos: Int32.pipe(field(2))
})

/**
 * Schema for `google.protobuf.Duration` as a `Duration`.
 *
 * **Gotchas**
 *
 * Infinite durations, and durations beyond the protobuf range of about 10,000
 * years (315,576,000,000 seconds), cannot be encoded. Decoding rejects
 * durations outside that range, and `nanos` outside ±999,999,999 or of the
 * other sign than `seconds`; use {@link DurationParts} to keep them.
 *
 * @stability experimental
 * @category well-known types
 * @since 4.0.6
 */
export const Duration: Schema.Duration = Schema.Duration.pipe(wellKnown(Wkt.Duration))

/**
 * Schema for `google.protobuf.Duration` as its seconds and nanoseconds.
 *
 * **When to use**
 *
 * Use to keep every value a peer can send, including those outside the range
 * of the protobuf type or with `nanos` of the other sign than `seconds`, which
 * {@link Duration} rejects.
 *
 * @see {@link Duration} for a `Duration`.
 *
 * @stability experimental
 * @category well-known types
 * @since 4.0.6
 */
export const DurationParts: Message<{
  readonly seconds: Schema.BigInt
  readonly nanos: Schema.Number
}> = Message("google.protobuf.Duration", {
  seconds: Int64.pipe(field(1)),
  nanos: Int32.pipe(field(2))
})

/**
 * Schema for `google.protobuf.Empty`, a message without fields.
 *
 * @stability experimental
 * @category well-known types
 * @since 4.0.6
 */
export const Empty: Message<{}> = Message("google.protobuf.Empty", {})

/**
 * Schema for `google.protobuf.NullValue`, the `null` of a {@link Value}.
 *
 * @stability experimental
 * @category well-known types
 * @since 4.0.6
 */
export const NullValue: Schema.Union<readonly [Schema.Literals<ReadonlyArray<"NULL_VALUE">>, Schema.Number]> = OpenEnum(
  "google.protobuf.NullValue",
  { NULL_VALUE: 0 }
)

/**
 * Schema for `google.protobuf.Struct`, the protobuf message of a JSON object:
 * its properties are the `fields`, each a {@link Value}.
 *
 * @stability experimental
 * @category well-known types
 * @since 4.0.6
 */
export const Struct = Message("google.protobuf.Struct", {
  fields: Map_(Schema.String, Schema.suspend((): Schema.Codec<Value> => Value)).pipe(field(1))
})

/**
 * The `google.protobuf.Struct` message, as decoded by {@link Struct}.
 *
 * @stability experimental
 * @category well-known types
 * @since 4.0.6
 */
export interface Struct extends Schema.Schema.Type<typeof Struct> {}

/**
 * Schema for `google.protobuf.Value`, the protobuf message of a JSON value: a
 * oneof `kind` of a null, a number, a string, a boolean, a {@link Struct}, or a
 * {@link ListValue}.
 *
 * **Details**
 *
 * A `Value` without a kind is valid, and decodes without a `kind`. Numbers are
 * doubles, so they may be NaN or infinite.
 *
 * @stability experimental
 * @category well-known types
 * @since 4.0.6
 */
export const Value = Message("google.protobuf.Value", {
  kind: Oneof({
    nullValue: NullValue.pipe(field(1)),
    numberValue: Double.pipe(field(2)),
    stringValue: Schema.String.pipe(field(3)),
    boolValue: Schema.Boolean.pipe(field(4)),
    structValue: Schema.suspend((): Schema.Codec<Struct> => Struct).pipe(field(5)),
    listValue: Schema.suspend((): Schema.Codec<ListValue> => ListValue).pipe(field(6))
  })
})

/**
 * The `google.protobuf.Value` message, as decoded by {@link Value}.
 *
 * @stability experimental
 * @category well-known types
 * @since 4.0.6
 */
export interface Value extends Schema.Schema.Type<typeof Value> {}

/**
 * Schema for `google.protobuf.ListValue`, the protobuf message of a JSON
 * array: its elements are the `values`, each a {@link Value}.
 *
 * @stability experimental
 * @category well-known types
 * @since 4.0.6
 */
export const ListValue = Message("google.protobuf.ListValue", {
  values: Schema.Array(Schema.suspend((): Schema.Codec<Value> => Value)).pipe(field(1))
})

/**
 * The `google.protobuf.ListValue` message, as decoded by {@link ListValue}.
 *
 * @stability experimental
 * @category well-known types
 * @since 4.0.6
 */
export interface ListValue extends Schema.Schema.Type<typeof ListValue> {}

/**
 * Schema for `google.protobuf.Any`, a type URL and the serialized message.
 *
 * @see {@link anyPack} and {@link anyUnpack} to convert a message.
 *
 * @stability experimental
 * @category well-known types
 * @since 4.0.6
 */
export const Any: Message<{
  readonly typeUrl: Schema.String
  readonly value: Schema.Uint8Array
}> = Message("google.protobuf.Any", {
  typeUrl: Schema.String.pipe(field(1)),
  value: Schema.Uint8Array.pipe(field(2))
})

/**
 * Schema for `google.protobuf.FieldMask`, its paths.
 *
 * @stability experimental
 * @category well-known types
 * @since 4.0.6
 */
export const FieldMask: Schema.$Array<Schema.String> = Schema.Array(Schema.String).pipe(
  wellKnown(Wkt.FieldMask)
)

/**
 * Schema for `google.protobuf.StringValue`.
 *
 * @stability experimental
 * @category well-known types
 * @since 4.0.6
 */
export const StringValue: Schema.String = Schema.String.pipe(wellKnown(Wkt.StringValue))

/**
 * Schema for `google.protobuf.BoolValue`.
 *
 * @stability experimental
 * @category well-known types
 * @since 4.0.6
 */
export const BoolValue: Schema.Boolean = Schema.Boolean.pipe(wellKnown(Wkt.BoolValue))

/**
 * Schema for `google.protobuf.BytesValue`.
 *
 * @stability experimental
 * @category well-known types
 * @since 4.0.6
 */
export const BytesValue: Schema.Uint8Array = Schema.Uint8Array.pipe(
  wellKnown(Wkt.BytesValue)
)

/**
 * Schema for `google.protobuf.DoubleValue`.
 *
 * @stability experimental
 * @category well-known types
 * @since 4.0.6
 */
export const DoubleValue: Schema.Number = Double.pipe(wellKnown(Wkt.DoubleValue))

/**
 * Schema for `google.protobuf.FloatValue`.
 *
 * @stability experimental
 * @category well-known types
 * @since 4.0.6
 */
export const FloatValue: Schema.Number = Float.pipe(wellKnown(Wkt.FloatValue))

/**
 * Schema for `google.protobuf.Int32Value`.
 *
 * @stability experimental
 * @category well-known types
 * @since 4.0.6
 */
export const Int32Value: Schema.Number = Int32.pipe(wellKnown(Wkt.Int32Value))

/**
 * Schema for `google.protobuf.UInt32Value`.
 *
 * @stability experimental
 * @category well-known types
 * @since 4.0.6
 */
export const UInt32Value: Schema.Number = UInt32.pipe(wellKnown(Wkt.UInt32Value))

/**
 * Schema for `google.protobuf.Int64Value`.
 *
 * @stability experimental
 * @category well-known types
 * @since 4.0.6
 */
export const Int64Value: Schema.BigInt = Int64.pipe(wellKnown(Wkt.Int64Value))

/**
 * Schema for `google.protobuf.UInt64Value`.
 *
 * @stability experimental
 * @category well-known types
 * @since 4.0.6
 */
export const UInt64Value: Schema.BigInt = UInt64.pipe(wellKnown(Wkt.UInt64Value))

// -----------------------------------------------------------------------------
// extensions
// -----------------------------------------------------------------------------

/**
 * An extension field of a message, created by {@link extension}.
 *
 * @stability experimental
 * @category models
 * @since 4.0.6
 */
export interface Extension<in out E extends Schema.Top, S extends Schema.Codec<any, any>> {
  readonly extendee: E
  readonly number: number
  readonly schema: S
  // The full name of the extension, such as `acme.v1.priority`.
  readonly name: string | undefined
  /** @internal */
  readonly layout: Layout.Root
  /** @internal */
  readonly codec: Schema.Codec<S["Type"], Uint8Array<ArrayBuffer>>
  /** @internal */
  readonly messageSet: boolean
  /** @internal */
  readonly annotation: ProtobufSchema.FieldAnnotation
}

// The options of `extension`.
interface ExtensionOptions extends Omit<FieldOptions, "name" | "jsonName"> {
  /**
   * The full name of the extension, such as `acme.v1.priority`. The JSON
   * mapping writes the extension under it, as `"[acme.v1.priority]"`, and
   * leaves out extensions without one.
   */
  readonly name?: string | undefined
}

/**
 * Declares field `number` of `extendee` as an extension holding `schema`.
 *
 * **Details**
 *
 * Extension values live in the unknown fields of a message, so the extendee
 * is a {@link Message} that keeps them, and the number must not be one of its
 * fields. {@link getExtension} reads a value from there, and
 * {@link setExtension} writes one. The schema runs synchronously and without
 * services.
 *
 * The extensions of a {@link MessageSet} are messages,
 * written as MessageSet items whose type id is `number`.
 *
 * **Example** (Reading and writing an extension)
 *
 * ```ts import.meta.vitest
 * import { Option, Schema } from "effect"
 * import { Protobuf } from "effect/protobuf"
 *
 * const Product = Protobuf.Message("acme.v1.Product", {
 *   name: Schema.String.pipe(Protobuf.field(1))
 * })
 *
 * // extend Product { int32 priority = 100; }
 * const priority = Protobuf.extension(Product, 100, Protobuf.Int32)
 *
 * const product = Protobuf.setExtension({ name: "lamp" }, priority, 3)
 * Protobuf.getExtension(product, priority) // => Option.some(3)
 * ```
 *
 * @stability experimental
 * @category extensions
 * @since 4.0.6
 */
export const extension = <E extends Schema.Top, S extends Schema.Codec<any, any>>(
  extendee: E,
  number: number,
  schema: S,
  options?: ExtensionOptions
): Extension<E, S> => {
  ProtobufSchema.checkFieldNumber(number)
  // A `Protobuf.Message` keeps its unknown fields, where extensions live.
  const extendeeAnnotations = ProtobufSchema.resolveEncoded(extendee.ast).annotations
  const name = extendeeAnnotations[ProtobufSchema.MESSAGE] as string | undefined
  if (name === undefined) {
    throw new Error(`Protobuf layout: the extendee of extension ${number} is not a Protobuf.Message`)
  }
  const where = `extension ${number} of ${name}`
  const messageSet = extendeeAnnotations[ProtobufSchema.MESSAGE_SET] === true
  // The value of a MessageSet item is the bytes of a message; that of any other
  // extension is a field.
  if (
    messageSet &&
    (ProtobufSchema.resolveEncoded(schema.ast).ast._tag !== "Objects" ||
      (options !== undefined && Object.keys(options).some((key) => key !== "name")))
  ) {
    throw new Error(`Protobuf layout: ${where} extends a MessageSet, whose extensions are messages without options`)
  }
  const annotation = fieldAnnotation(number, { ...options, name: undefined })
  const root = messageSet ? Compile.compile(schema.ast) : Compile.compileField(schema.ast, annotation, where)
  const codec = (Schema.Uint8Array as Schema.instanceOf<Uint8Array<ArrayBuffer>>).pipe(
    Schema.decodeTo(schema, Transform.makeTransformation(Codec.makeCodec(root), undefined))
  )
  return {
    extendee,
    number,
    schema,
    name: options?.name,
    layout: root,
    codec,
    messageSet,
    annotation
  } as Extension<E, S>
}

/**
 * Reads an extension from the unknown fields of a message, or `Option.none()`
 * when it is not set.
 *
 * **Details**
 *
 * Several occurrences of the field merge, as they do in a message. Malformed
 * bytes, and values that the extension's schema rejects, throw a
 * `Schema.SchemaError`.
 *
 * @stability experimental
 * @category extensions
 * @since 4.0.6
 */
export const getExtension = <E extends Schema.Top, S extends Schema.Codec<any, any>>(
  message: E["Type"],
  extension: Extension<E, S>
): Option.Option<S["Type"]> => {
  const bytes = unknownFields(message)
  const fields = bytes === undefined ? undefined : selectExtension(bytes, extension, true)
  if (fields === undefined || fields.length === 0) return Option.none()
  return Option.some(Schema.decodeSync(extension.codec)(fields as Uint8Array<ArrayBuffer>))
}

/**
 * Returns a copy of a message with an extension set to `value`, replacing any
 * value it had.
 *
 * @stability experimental
 * @category extensions
 * @since 4.0.6
 */
export const setExtension = <E extends Schema.Top, S extends Schema.Codec<any, any>>(
  message: E["Type"],
  extension: Extension<E, S>,
  value: S["Type"]
): E["Type"] => {
  const bytes = unknownFields(message)
  const rest = bytes === undefined ? Wire.EMPTY_BYTES : selectExtension(bytes, extension, false)
  const value_ = Schema.encodeSync(extension.codec)(value)
  const encoded = extension.messageSet ? Wire.messageSetItem(extension.number, value_) : value_
  return withUnknownFields(message, Bytes.concat([rest, encoded]))
}

/**
 * Returns a copy of a message without an extension.
 *
 * @stability experimental
 * @category extensions
 * @since 4.0.6
 */
export const clearExtension = <E extends Schema.Top, S extends Schema.Codec<any, any>>(
  message: E["Type"],
  extension: Extension<E, S>
): E["Type"] => {
  const bytes = unknownFields(message)
  if (bytes === undefined) return message
  const rest = selectExtension(bytes, extension, false)
  return withUnknownFields(message, rest.length === 0 ? undefined : rest)
}

/**
 * Whether a message has an extension set.
 *
 * @stability experimental
 * @category extensions
 * @since 4.0.6
 */
export const hasExtension = <E extends Schema.Top, S extends Schema.Codec<any, any>>(
  message: E["Type"],
  extension: Extension<E, S>
): boolean => {
  const bytes = unknownFields(message)
  return bytes !== undefined && selectExtension(bytes, extension, true).length > 0
}

const unknownFields = (message: unknown): Uint8Array | undefined => {
  const bytes = typeof message === "object" && message !== null && Object.hasOwn(message, unknown)
    ? (message as Record<symbol, unknown>)[unknown]
    : undefined
  return bytes instanceof Uint8Array ? bytes : undefined
}

const withUnknownFields = <A>(message: A, bytes: Uint8Array | undefined): A => {
  const out = Object.assign(Object.create(Object.getPrototypeOf(message)), message)
  if (bytes === undefined) delete out[unknown]
  else out[unknown] = bytes
  return out
}

// With `keep`, the occurrences of an extension in the unknown fields `bytes`:
// its fields, or the message bytes of its MessageSet items. Otherwise, all the
// other unknown fields.
const selectExtension = (bytes: Uint8Array, extension: Extension<any, any>, keep: boolean): Uint8Array => {
  const r = new Wire.Reader(bytes)
  const chunks: Array<Uint8Array> = []
  try {
    while (r.pos < bytes.length) {
      const start = r.pos
      const tag = r.tag()
      if (extension.messageSet && tag === Wire.MESSAGE_SET_ITEM_START) {
        const payload = Wire.readMessageSetItem(r, extension.number)
        if (payload === undefined) {
          if (!keep) chunks.push(bytes.subarray(start, r.pos))
        } else if (keep) {
          chunks.push(payload)
        }
        continue
      }
      r.skip(tag & 7, tag >>> 3, 0)
      const matches = !extension.messageSet && tag >>> 3 === extension.number
      if (matches === keep) chunks.push(bytes.subarray(start, r.pos))
    }
  } catch (e) {
    throw e instanceof Wire.WireError ? new Schema.SchemaError(Transform.toIssue(e, SchemaAST.defaultParseOptions)) : e
  }
  return Bytes.concat(chunks)
}

// -----------------------------------------------------------------------------
// Any and registries
// -----------------------------------------------------------------------------

/**
 * Messages by their full name, and extensions by the full name of their
 * extendee, created by {@link registry}.
 *
 * @stability experimental
 * @category models
 * @since 4.0.6
 */
export interface Registry {
  readonly messages: ReadonlyMap<string, Schema.Top>
  readonly extensions: ReadonlyMap<string, ReadonlyArray<Extension<any, any>>>
}

/**
 * Collects messages, extensions, and other registries, such as those of
 * imported `.proto` files, into a registry.
 *
 * **Details**
 *
 * Messages are {@link Message}s or well-known types, and a name may only
 * stand for one schema. Registries are explicit: {@link anyUnpack} and the JSON mapping read
 * the one they are given.
 *
 * @stability experimental
 * @category constructors
 * @since 4.0.6
 */
export const registry = (...items: ReadonlyArray<Schema.Top | Extension<any, any> | Registry>): Registry => {
  const messages = new Map<string, Schema.Top>()
  const extensions = new Map<string, Array<Extension<any, any>>>()
  const addMessage = (name: string, schema: Schema.Top) => {
    const existing = messages.get(name)
    if (existing !== undefined && existing !== schema) throw new Error(`Protobuf.registry has two messages ${name}`)
    messages.set(name, schema)
  }
  const addExtension = (ext: Extension<any, any>) => {
    const name = messageName(ext.extendee)
    if (name === undefined) throw new Error("Protobuf.registry needs extendees that are messages")
    const list = extensions.get(name) ?? []
    if (!list.includes(ext)) list.push(ext)
    extensions.set(name, list)
  }
  for (const item of items) {
    if (Schema.isSchema(item)) {
      const name = messageName(item)
      if (name === undefined) {
        throw new Error("Protobuf.registry needs messages, such as a Protobuf.Message or a well-known type")
      }
      addMessage(name, item)
    } else if ("extendee" in item) {
      addExtension(item)
    } else {
      for (const [name, schema] of item.messages) addMessage(name, schema)
      for (const list of item.extensions.values()) list.forEach(addExtension)
    }
  }
  return { messages, extensions }
}

const TYPE_URL_PREFIX = "type.googleapis.com/"

/**
 * Packs a message into a `google.protobuf.Any`.
 *
 * **Details**
 *
 * The schema is a {@link Message} or a well-known type, whose full name the
 * type URL holds.
 *
 * **Example** (Packing and unpacking a message)
 *
 * ```ts import.meta.vitest
 * import { Option, Schema } from "effect"
 * import { Protobuf } from "effect/protobuf"
 *
 * const Point = Protobuf.Message("acme.v1.Point", {
 *   x: Protobuf.Int32.pipe(Protobuf.field(1)),
 *   y: Protobuf.Int32.pipe(Protobuf.field(2))
 * })
 *
 * const any = Protobuf.anyPack(Point, { x: 1, y: 2 })
 * any.typeUrl // => "type.googleapis.com/acme.v1.Point"
 * Protobuf.anyUnpack(any, Point) // => Option.some({ x: 1, y: 2 })
 * ```
 *
 * @stability experimental
 * @category Any
 * @since 4.0.6
 */
export const anyPack = <S extends Schema.Codec<any, any>>(schema: S, value: S["Type"]): typeof Any.Type => {
  const name = messageName(schema)
  if (name === undefined) {
    throw new Error("Protobuf.anyPack needs a message, such as a Protobuf.Message or a well-known type")
  }
  return { typeUrl: TYPE_URL_PREFIX + name, value: Schema.encodeSync(toCodec(schema))(value) }
}

/**
 * Unpacks a `google.protobuf.Any` holding the message of `schema`, or of a
 * message in `registry`, or returns `Option.none()` for another message.
 *
 * **Details**
 *
 * The message name is the part of the type URL after its last `/`. Bytes that
 * the schema rejects throw a `Schema.SchemaError`.
 *
 * @stability experimental
 * @category Any
 * @since 4.0.6
 */
export const anyUnpack: {
  <S extends Schema.Codec<any, any>>(any: typeof Any.Type, schema: S): Option.Option<S["Type"]>
  (any: typeof Any.Type, registry: Registry): Option.Option<unknown>
} = (any: typeof Any.Type, from: Schema.Top | Registry): Option.Option<unknown> => {
  const name = typeName(any.typeUrl)
  const schema = Schema.isSchema(from) ? (messageName(from) === name ? from : undefined) : from.messages.get(name)
  if (schema === undefined) return Option.none()
  return Option.some(
    Schema.decodeSync(toCodec(schema as Schema.Codec<unknown>))(any.value as Uint8Array<ArrayBuffer>)
  )
}

/**
 * Whether a `google.protobuf.Any` holds the message of `schema`.
 *
 * @stability experimental
 * @category Any
 * @since 4.0.6
 */
export const anyIs = (any: typeof Any.Type, schema: Schema.Top): boolean => {
  return typeName(any.typeUrl) === messageName(schema)
}

const typeName = (typeUrl: string): string => {
  return typeUrl.slice(typeUrl.lastIndexOf("/") + 1)
}

const messageName = (schema: Schema.Top): string | undefined => {
  return ProtobufSchema.messageName(ProtobufSchema.resolveEncoded(schema.ast))
}

// -----------------------------------------------------------------------------
// codec
// -----------------------------------------------------------------------------

/**
 * The codec type returned by {@link toCodec}.
 *
 * @stability experimental
 * @category models
 * @since 4.0.6
 */
export interface toCodec<S extends Schema.Constraint> extends
  Schema.Codec<
    S["Type"],
    Uint8Array<ArrayBuffer>,
    S["DecodingServices"],
    S["EncodingServices"]
  >
{}

// The options of `toCodec`.
interface ToCodecOptions {
  /**
   * Extensions that decoding checks like declared fields, such as that their
   * strings are valid UTF-8. They are kept in the unknown fields all the same.
   */
  readonly registry?: Registry | undefined
}

const codecCache = new WeakMap<Schema.Constraint, toCodec<any>>()
const registryCodecCache = new WeakMap<Registry, WeakMap<Schema.Constraint, toCodec<any>>>()

/**
 * Derives a protobuf binary codec from a schema.
 *
 * **Details**
 *
 * The root schema is a message: a {@link Message} or a class of one, or a
 * well-known type such as {@link Timestamp} or {@link StringValue}. Derived
 * codecs are memoized by schema identity, and by the registry of the options.
 * With a {@link registry}, decoding checks the extensions it holds, as
 * protobuf parsers given an extension registry do.
 *
 * A schema without transformations, and without checks other than those of the
 * protobuf scalars, is checked by the wire layer alone, which skips the schema
 * pass around it. Values and bytes are the same either way; the errors for a
 * value that does not encode come from the wire layer.
 *
 * **Gotchas**
 *
 * - Layout errors, such as a property without a field number or a duplicate
 *   number, throw when the codec is created.
 * - Malformed input fails to decode with a `Schema.SchemaError`, as does a
 *   value the schema rejects.
 * - A message keeps the fields it does not declare at its {@link unknown}
 *   property; the well-known types that decode to another type, such as
 *   {@link Timestamp} and {@link StringValue}, drop them.
 *
 * **Example** (Encoding and decoding a message)
 *
 * ```ts import.meta.vitest
 * import { Schema } from "effect"
 * import { Protobuf } from "effect/protobuf"
 *
 * // message User { uint64 id = 1; string name = 2; }
 * const User = Protobuf.Message("acme.v1.User", {
 *   id: Protobuf.UInt64.pipe(Protobuf.field(1)),
 *   name: Schema.String.pipe(Protobuf.field(2))
 * })
 *
 * const codec = Protobuf.toCodec(User)
 * const bytes = Schema.encodeSync(codec)({ id: 1n, name: "Ada" })
 *
 * Array.from(bytes) // => [8, 1, 18, 3, 65, 100, 97]
 * Schema.decodeSync(codec)(bytes) // => { id: 1n, name: "Ada" }
 * ```
 *
 * @stability experimental
 * @category constructors
 * @since 4.0.6
 */
export const toCodec = <S extends Schema.Constraint>(schema: S, options?: ToCodecOptions): toCodec<S> => {
  const registry = options?.registry
  let cache = codecCache
  if (registry !== undefined) {
    cache = registryCodecCache.get(registry) ?? new WeakMap()
    registryCodecCache.set(registry, cache)
  }
  const cached = cache.get(schema)
  if (cached !== undefined) return cached
  const extensions: Compile.ExtensionsOf | undefined = registry === undefined
    ? undefined
    : (name) => registry.extensions.get(name)?.map((e) => ({ ast: e.schema.ast, annotation: e.annotation }))
  const out = Transform.derive(
    Schema.Uint8Array as Schema.instanceOf<Uint8Array<ArrayBuffer>>,
    schema,
    Codec.makeCodec(Compile.compile(schema.ast, extensions))
  ) as unknown as toCodec<S>
  cache.set(schema, out)
  return out
}
