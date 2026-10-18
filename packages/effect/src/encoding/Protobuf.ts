/**
 * Protocol Buffers binary codecs derived from Effect schemas.
 *
 * {@link toCodec} compiles the encoded side of a schema into a protobuf message
 * layout. Transformations such as `Schema.FiniteFromString` or classes run
 * before the wire layer sees a value, and schema checks run after it decodes
 * one. The bytes match what other protobuf implementations write for a
 * message with the same field numbers and types.
 *
 * | Schema                                                        | Protobuf                                                 |
 * | ------------------------------------------------------------- | -------------------------------------------------------- |
 * | `Struct`, `Class`                                             | `message`; each wire property needs {@link field}        |
 * | `String`, `Boolean`, `Uint8Array`                             | `string`, `bool`, `bytes`                                |
 * | `Number`                                                      | `double`; {@link Int32}, {@link Float}, … otherwise      |
 * | `BigInt`                                                      | `int64`; {@link UInt64}, {@link SInt64}, … otherwise     |
 * | `Enum` with numeric members, numeric `Literals`               | `enum`                                                   |
 * | string or boolean `Literals`                                  | `string` or `bool`; {@link enumNumbers} makes an `enum`  |
 * | `Array(A)`                                                    | `repeated A`, packed for numeric types                   |
 * | `Record(K, A)`                                                | `map<K, A>`; a `Number` key is `int32`                   |
 * | `Tuple`                                                       | a message with element `i` at field `i + 1`              |
 * | `StructWithRest`                                              | a message with a `map` per index signature               |
 * | required scalar property                                      | implicit presence                                        |
 * | `optionalKey`, `optional`, `NullOr`, `UndefinedOr`, `Option`  | explicit presence (`optional`)                           |
 * | unnumbered `Literal` property                                 | constant, not on the wire                                |
 * | `Union` property                                              | `oneof`                                                  |
 * | `Symbol` (registered with `Symbol.for`)                       | `string`, its key                                        |
 * | `DateTimeUtc`, `Date`                                         | `google.protobuf.Timestamp`                              |
 * | `Duration`                                                    | `google.protobuf.Duration`                               |
 * | `Json`, `Unknown`                                             | `google.protobuf.Value`                                  |
 * | other declarations                                            | their `Schema.toCodecJson` (or `toCodec`) form           |
 *
 * A required scalar, enum, repeated, or map property uses implicit presence:
 * its zero value is not written, and an absent field decodes to the zero
 * value, which the schema then validates. A required message property that is
 * absent fails to decode.
 *
 * Protobuf has one kind of absence, so some values do not survive a round
 * trip when several kinds of absence are combined: an `optionalKey(Option(A))`
 * property that is left out decodes to `Option.none()`, an
 * `optionalKey(NullOr(A))` property holding `null` decodes as left out, and an
 * empty array or record in `NullOr(Array(A))` or `NullOr(Record(K, A))`
 * decodes to `null`.
 *
 * A union property becomes a `oneof`. Each member either carries its own field
 * number, or is a tagged struct whose only non-literal property is numbered.
 * Nested unions are flattened, and a numbered literal member is an empty
 * message case.
 *
 * A value that protobuf cannot hold directly is wrapped in a message
 * `{ value = 1 }`: a collection or union inside an array, map value, or oneof
 * case, an optional array element or map value, a nested `Option`, and a root
 * that is not a message. `ReadonlyMap` and `HashMap` are arrays of key-value
 * tuples, which have the bytes of a protobuf `map`.
 *
 * Fields are written in field-number order. Decoding skips unknown fields,
 * keeping them only in an {@link UnknownFields} property, accepts packed and
 * unpacked repeated fields, accepts both encodings of a message field, and
 * merges repeated occurrences of a message field, including well-known types
 * and wrappers. A known field sent with a wire type that does not match its
 * type fails to decode. Decoding a `Symbol` registers it with `Symbol.for`,
 * which keeps it for the lifetime of the process.
 *
 * @stability unstable
 * @since 4.0.6
 */
import * as Arr from "../Array.ts"
import * as Effect from "../Effect.ts"
import { makeCodec } from "../internal/protobuf/codec.ts"
import {
  compileRoot,
  ENUM_KEY,
  FIELD_KEY,
  type FieldAnnotation,
  isUnsigned,
  MAP_KEY_KEY,
  MAX_FIELD_NUMBER,
  type Root,
  SCALAR_KEY,
  type ScalarName,
  toProtobufAST,
  UNKNOWN_KEY,
  WKT_KEY,
  WRAPPER_ANNOTATIONS
} from "../internal/protobuf/layout.ts"
import { BIGINT_ZERO, INT64_MAX, INT64_MIN, UINT64_MAX, WireError } from "../internal/protobuf/wire.ts"
import * as Schema from "../Schema.ts"
import * as SchemaAST from "../SchemaAST.ts"
import * as SchemaIssue from "../SchemaIssue.ts"
import * as SchemaTransformation from "../SchemaTransformation.ts"

/**
 * Options for {@link field}.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export interface FieldOptions {
  /**
   * Writes a repeated numeric field packed (`true`) or as one record per
   * element (`false`, the proto2 default). Other fields reject it.
   *
   * @default true
   */
  readonly packed?: boolean | undefined
  /**
   * Writes a singular scalar or enum field even when it holds its zero value,
   * as proto2 `required` fields are. A missing field still decodes to the zero
   * value. Repeated, map, and oneof fields reject it.
   */
  readonly presence?: "always" | undefined
  /**
   * Writes a message field between group tags instead of length-prefixed,
   * like proto2 groups and the `DELIMITED` message encoding of editions.
   */
  readonly encoding?: "delimited" | undefined
}

/**
 * Assigns the protobuf field number of a struct property, or the case number of
 * a `oneof` member.
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
 * import { Protobuf } from "effect/encoding"
 *
 * const User = Schema.Struct({
 *   id: Protobuf.UInt64.pipe(Protobuf.field(1)),
 *   name: Schema.String.pipe(Protobuf.field(2)),
 *   tags: Schema.Array(Schema.String).pipe(Protobuf.field(3))
 * })
 * ```
 *
 * @stability unstable
 * @category annotations
 * @since 4.0.6
 */
export function field(number: number, options?: FieldOptions) {
  if (!Number.isInteger(number) || number < 1 || number > MAX_FIELD_NUMBER || (number >= 19000 && number <= 19999)) {
    throw new Error(
      `Protobuf field number must be an integer in [1, ${MAX_FIELD_NUMBER}] outside [19000, 19999], got ${number}`
    )
  }
  const annotation: FieldAnnotation = {
    number,
    packed: options?.packed,
    presence: options?.presence,
    encoding: options?.encoding
  }
  const annotations = { [FIELD_KEY]: annotation }
  return <S extends Schema.Top>(self: S): S["Rebuild"] => self.rebuild(SchemaAST.annotateKey(self.ast, annotations))
}

/**
 * Maps a union of literals to a protobuf enum by assigning each literal its
 * enum number.
 *
 * **When to use**
 *
 * Use when a property is a union of string or boolean literals that should be
 * an `enum` on the wire.
 *
 * **Details**
 *
 * Without it, unions of numeric literals and `Schema.Enum` with numeric members
 * are enums, and unions of string or boolean literals are `string` or `bool`
 * fields.
 *
 * **Example** (Mapping string literals to enum numbers)
 *
 * ```ts
 * import { Schema } from "effect"
 * import { Protobuf } from "effect/encoding"
 *
 * const Status = Schema.Literals(["unspecified", "active", "suspended"]).pipe(
 *   Protobuf.enumNumbers({ unspecified: 0, active: 1, suspended: 2 })
 * )
 * ```
 *
 * @stability unstable
 * @category annotations
 * @since 4.0.6
 */
export function enumNumbers(numbers: Readonly<Record<string, number>>) {
  const annotations = { [ENUM_KEY]: numbers }
  return <S extends Schema.Top>(self: S): S["Rebuild"] => self.annotate(annotations)
}

/**
 * Writes a scalar wrapped in its `google.protobuf.*Value` message.
 *
 * **Details**
 *
 * Wrappers exist for `double`, `float`, `int64`, `uint64`, `int32`, `uint32`,
 * `bool`, `string`, and `bytes`. Wrapper messages track presence, so a wrapped
 * zero value is written.
 *
 * @see {@link StringValue} and the other predefined wrappers.
 *
 * @stability unstable
 * @category annotations
 * @since 4.0.6
 */
export function wrapper<S extends Schema.Top>(self: S): S["Rebuild"] {
  return self.annotate(WRAPPER_ANNOTATIONS)
}

/**
 * Creates a string map key that is written as a 64-bit integer or `bool` key.
 *
 * **When to use**
 *
 * Use as the key schema of `Schema.Record` for `map<int64, …>` (and the other
 * 64-bit key types) or `map<bool, …>`, which JavaScript object keys cannot
 * represent as numbers. Maps with 32-bit integer keys use {@link Int32} and
 * friends as the record key directly.
 *
 * **Example** (Declaring a map with 64-bit keys)
 *
 * ```ts
 * import { Schema } from "effect"
 * import { Protobuf } from "effect/encoding"
 *
 * // map<int64, string>
 * const NamesById = Schema.Record(Protobuf.mapKey("int64"), Schema.String)
 * ```
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.6
 */
export function mapKey(type: "int64" | "uint64" | "sint64" | "fixed64" | "sfixed64" | "bool"): Schema.String {
  const pattern = type === "bool" ? /^(?:true|false)$/ : isUnsigned(type) ? /^(?:0|[1-9]\d*)$/ : /^(?:0|-?[1-9]\d*)$/
  return Schema.String.annotate({ [MAP_KEY_KEY]: type }).check(Schema.isPattern(pattern))
}

// -----------------------------------------------------------------------------
// scalars
// -----------------------------------------------------------------------------

/**
 * Schema for the protobuf `double` type, the default for `Schema.Number`.
 *
 * @stability unstable
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
 * @stability unstable
 * @category schemas
 * @since 4.0.6
 */
export const Float: Schema.Number = scalarNumber("float")

/**
 * Schema for the protobuf `int32` type.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.6
 */
export const Int32: Schema.Number = scalarNumber("int32", Schema.isInt32())

/**
 * Schema for the protobuf `uint32` type.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.6
 */
export const UInt32: Schema.Number = scalarNumber("uint32", Schema.isUint32())

/**
 * Schema for the protobuf `sint32` type, a zigzag encoding that keeps small
 * negative numbers short.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.6
 */
export const SInt32: Schema.Number = scalarNumber("sint32", Schema.isInt32())

/**
 * Schema for the protobuf `fixed32` type, an unsigned 4-byte integer.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.6
 */
export const Fixed32: Schema.Number = scalarNumber("fixed32", Schema.isUint32())

/**
 * Schema for the protobuf `sfixed32` type, a signed 4-byte integer.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.6
 */
export const SFixed32: Schema.Number = scalarNumber("sfixed32", Schema.isInt32())

/**
 * Schema for the protobuf `int64` type as a `bigint`, the default for
 * `Schema.BigInt`.
 *
 * @see {@link Int64Number} for an `int64` represented as a `number`.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.6
 */
export const Int64: Schema.BigInt = scalarBigInt("int64")

/**
 * Schema for the protobuf `uint64` type as a `bigint`.
 *
 * @see {@link UInt64Number} for a `uint64` represented as a `number`.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.6
 */
export const UInt64: Schema.BigInt = scalarBigInt("uint64")

/**
 * Schema for the protobuf `sint64` type as a `bigint`, a zigzag encoding that
 * keeps small negative numbers short.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.6
 */
export const SInt64: Schema.BigInt = scalarBigInt("sint64")

/**
 * Schema for the protobuf `fixed64` type as a `bigint`, an unsigned 8-byte
 * integer.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.6
 */
export const Fixed64: Schema.BigInt = scalarBigInt("fixed64")

/**
 * Schema for the protobuf `sfixed64` type as a `bigint`, a signed 8-byte
 * integer.
 *
 * @stability unstable
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
 * @stability unstable
 * @category schemas
 * @since 4.0.6
 */
export const Int64Number: Schema.Number = scalarNumber("int64", Schema.isInt())

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
 * @stability unstable
 * @category schemas
 * @since 4.0.6
 */
export const UInt64Number: Schema.Number = scalarNumber("uint64", Schema.isInt(), Schema.isGreaterThanOrEqualTo(0))

// -----------------------------------------------------------------------------
// well-known types
// -----------------------------------------------------------------------------

/**
 * Schema for `google.protobuf.Timestamp`, the same as `Schema.DateTimeUtc`.
 *
 * **Gotchas**
 *
 * `DateTime.Utc` has millisecond precision, so decoding drops sub-millisecond
 * nanoseconds. Model the message as a struct of `seconds` ({@link Int64},
 * field 1) and `nanos` ({@link Int32}, field 2) to keep them.
 *
 * @stability unstable
 * @category well-known types
 * @since 4.0.6
 */
export const Timestamp: Schema.DateTimeUtc = Schema.DateTimeUtc

/**
 * Schema for `google.protobuf.Duration`, the same as `Schema.Duration`.
 *
 * **Gotchas**
 *
 * Infinite durations cannot be encoded.
 *
 * @stability unstable
 * @category well-known types
 * @since 4.0.6
 */
export const Duration: Schema.Duration = Schema.Duration

/**
 * Schema for `google.protobuf.Empty`, a message without fields.
 *
 * @stability unstable
 * @category well-known types
 * @since 4.0.6
 */
export const Empty: Schema.Struct<{}> = Schema.Struct({}).annotate({ identifier: "google.protobuf.Empty" })

/**
 * Schema for `google.protobuf.Value`, the same as `Schema.Json`.
 *
 * @stability unstable
 * @category well-known types
 * @since 4.0.6
 */
export const Value: Schema.Codec<Schema.Json> = Schema.Json

/**
 * Schema for `google.protobuf.Struct`, a JSON object.
 *
 * @stability unstable
 * @category well-known types
 * @since 4.0.6
 */
export const Struct: Schema.$Record<Schema.String, Schema.Codec<Schema.Json>> = Schema.Record(
  Schema.String,
  Schema.Json
).annotate({ identifier: "google.protobuf.Struct", [WKT_KEY]: "struct" })

/**
 * Schema for `google.protobuf.ListValue`, a JSON array.
 *
 * @stability unstable
 * @category well-known types
 * @since 4.0.6
 */
export const ListValue: Schema.$Array<Schema.Codec<Schema.Json>> = Schema.Array(Schema.Json).annotate({
  identifier: "google.protobuf.ListValue",
  [WKT_KEY]: "listValue"
})

/**
 * Schema for `google.protobuf.Any`, a type URL and the serialized message.
 *
 * @stability unstable
 * @category well-known types
 * @since 4.0.6
 */
export const Any: Schema.Struct<{
  readonly typeUrl: Schema.String
  readonly value: Schema.Uint8Array
}> = Schema.Struct({
  typeUrl: Schema.String.pipe(field(1)),
  value: Schema.Uint8Array.pipe(field(2))
}).annotate({ identifier: "google.protobuf.Any" })

/**
 * Schema for `google.protobuf.StringValue`.
 *
 * @stability unstable
 * @category well-known types
 * @since 4.0.6
 */
export const StringValue: Schema.String = wrapper(Schema.String)

/**
 * Schema for `google.protobuf.BoolValue`.
 *
 * @stability unstable
 * @category well-known types
 * @since 4.0.6
 */
export const BoolValue: Schema.Boolean = wrapper(Schema.Boolean)

/**
 * Schema for `google.protobuf.BytesValue`.
 *
 * @stability unstable
 * @category well-known types
 * @since 4.0.6
 */
export const BytesValue: Schema.Uint8Array = wrapper(Schema.Uint8Array)

/**
 * Schema for `google.protobuf.DoubleValue`.
 *
 * @stability unstable
 * @category well-known types
 * @since 4.0.6
 */
export const DoubleValue: Schema.Number = wrapper(Double)

/**
 * Schema for `google.protobuf.FloatValue`.
 *
 * @stability unstable
 * @category well-known types
 * @since 4.0.6
 */
export const FloatValue: Schema.Number = wrapper(Float)

/**
 * Schema for `google.protobuf.Int32Value`.
 *
 * @stability unstable
 * @category well-known types
 * @since 4.0.6
 */
export const Int32Value: Schema.Number = wrapper(Int32)

/**
 * Schema for `google.protobuf.UInt32Value`.
 *
 * @stability unstable
 * @category well-known types
 * @since 4.0.6
 */
export const UInt32Value: Schema.Number = wrapper(UInt32)

/**
 * Schema for `google.protobuf.Int64Value`.
 *
 * @stability unstable
 * @category well-known types
 * @since 4.0.6
 */
export const Int64Value: Schema.BigInt = wrapper(Int64)

/**
 * Schema for `google.protobuf.UInt64Value`.
 *
 * @stability unstable
 * @category well-known types
 * @since 4.0.6
 */
export const UInt64Value: Schema.BigInt = wrapper(UInt64)

/**
 * Schema for the fields of a message that its schema does not declare, as their
 * raw bytes.
 *
 * **When to use**
 *
 * Use as an unnumbered struct property to pass fields from newer peers
 * through: decoding collects them, and encoding writes them back after the
 * declared fields.
 *
 * **Details**
 *
 * A required property decodes to empty bytes when there are no unknown fields;
 * an `optionalKey` property is left out.
 *
 * **Example** (Keeping unknown fields)
 *
 * ```ts
 * import { Schema } from "effect"
 * import { Protobuf } from "effect/encoding"
 *
 * const User = Schema.Struct({
 *   name: Schema.String.pipe(Protobuf.field(1)),
 *   unknownFields: Protobuf.UnknownFields
 * })
 * ```
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.6
 */
export const UnknownFields: Schema.Uint8Array = Schema.Uint8Array.annotate({ [UNKNOWN_KEY]: true })

// -----------------------------------------------------------------------------
// codec
// -----------------------------------------------------------------------------

/**
 * The codec type returned by {@link toCodec}.
 *
 * @stability unstable
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

const codecCache = new WeakMap<Schema.Constraint, toCodec<any>>()

/**
 * Derives a protobuf binary codec from a schema.
 *
 * **Details**
 *
 * The root schema is usually a message: a struct, class, or tuple, a
 * well-known type such as {@link Timestamp}, or a wrapper such as
 * {@link StringValue}. `Schema.Void` is an empty message, a record whose
 * values carry field numbers is a message of maps, and any other root is
 * wrapped in a message `{ value = 1 }`, the bytes of a `google.protobuf`
 * wrapper for a scalar. Derived codecs are memoized by schema identity.
 *
 * **Gotchas**
 *
 * - Layout errors, such as a property without a field number or a duplicate
 *   number, throw when the codec is created.
 * - Malformed input fails to decode with a `Schema.SchemaError`, as does a
 *   value the schema rejects, such as an unknown enum number.
 * - Unknown fields are skipped, so re-encoding a decoded value drops them,
 *   unless the message keeps them in an {@link UnknownFields} property.
 *
 * **Example** (Encoding and decoding a message)
 *
 * ```ts import.meta.vitest
 * import { Schema } from "effect"
 * import { Protobuf } from "effect/encoding"
 *
 * // message User { uint64 id = 1; string name = 2; }
 * const User = Schema.Struct({
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
 * @stability unstable
 * @category constructors
 * @since 4.0.6
 */
export function toCodec<S extends Schema.Constraint>(schema: S): toCodec<S> {
  const cached = codecCache.get(schema)
  if (cached !== undefined) return cached
  const target = Schema.make<Schema.Constraint>(toProtobufAST(schema.ast))
  const root = compileRoot(target.ast)
  const codec = (Schema.Uint8Array as Schema.instanceOf<Uint8Array<ArrayBuffer>>).pipe(
    Schema.decodeTo(target, makeTransformation(root))
  ) as unknown as toCodec<S>
  codecCache.set(schema, codec)
  return codec
}

function makeTransformation(root: Root): SchemaTransformation.Transformation<unknown, Uint8Array<ArrayBuffer>> {
  const codec = makeCodec(root)
  return SchemaTransformation.transformEffect({
    decode: (bytes: Uint8Array<ArrayBuffer>, options) => {
      try {
        return Effect.succeed(codec.decode(bytes))
      } catch (e) {
        return e instanceof WireError ? Effect.fail(toIssue(e, options)) : Effect.die(e)
      }
    },
    encode: (value: unknown, options) => {
      try {
        return Effect.succeed(codec.encode(value))
      } catch (e) {
        return e instanceof WireError ? Effect.fail(toIssue(e, options)) : Effect.die(e)
      }
    }
  })
}

function toIssue(e: WireError, options: SchemaAST.ParseOptions): SchemaIssue.Issue {
  const issue = new SchemaIssue.InvalidValue({ message: e.message }, e.input, options)
  return e.path.length === 0 ? issue : new SchemaIssue.Pointer(e.path, issue)
}

// Annotating before checking keeps the scalar type on the node itself, where a
// later `.check` or `.annotate` cannot move it.
function scalarNumber(scalar: ScalarName, ...checks: Array<SchemaAST.Check<number>>): Schema.Number {
  const annotated = Schema.Number.annotate({ [SCALAR_KEY]: scalar })
  return Arr.isArrayNonEmpty(checks) ? annotated.check(...checks) : annotated
}

function scalarBigInt(scalar: ScalarName): Schema.BigInt {
  return Schema.BigInt.annotate({ [SCALAR_KEY]: scalar }).check(
    isUnsigned(scalar)
      ? Schema.isBetweenBigInt({ minimum: BIGINT_ZERO, maximum: UINT64_MAX })
      : Schema.isBetweenBigInt({ minimum: INT64_MIN, maximum: INT64_MAX })
  )
}
