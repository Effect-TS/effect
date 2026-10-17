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
 * | `Record(K, A)`                                                | `map<K, A>`                                              |
 * | `Tuple`                                                       | a message with element `i` at field `i + 1`              |
 * | `StructWithRest`                                              | a message with a `map` per index signature               |
 * | required scalar property                                      | implicit presence                                        |
 * | `optionalKey`, `optional`, `NullOr`, `UndefinedOr`, `Option`  | explicit presence (`optional`)                           |
 * | unnumbered `Literal` property                                 | constant, not on the wire                                |
 * | `Union` property                                              | `oneof`                                                  |
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
 * merges repeated occurrences of a message field.
 *
 * @stability unstable
 * @since 4.0.6
 */
import * as Arr from "../Array.ts"
import * as DateTime from "../DateTime.ts"
import * as Duration_ from "../Duration.ts"
import * as Effect from "../Effect.ts"
import * as Option from "../Option.ts"
import * as Predicate from "../Predicate.ts"
import * as Schema from "../Schema.ts"
import * as SchemaAST from "../SchemaAST.ts"
import * as SchemaIssue from "../SchemaIssue.ts"
import * as SchemaTransformation from "../SchemaTransformation.ts"

const FIELD_KEY = "~effect/encoding/Protobuf/field"
const SCALAR_KEY = "~effect/encoding/Protobuf/scalar"
const MAP_KEY_KEY = "~effect/encoding/Protobuf/mapKey"
const WRAPPER_KEY = "~effect/encoding/Protobuf/wrapper"
const ENUM_KEY = "~effect/encoding/Protobuf/enum"
const WKT_KEY = "~effect/encoding/Protobuf/wkt"
const UNKNOWN_KEY = "~effect/encoding/Protobuf/unknown"

const WRAPPER_ANNOTATIONS = { [WRAPPER_KEY]: true }

const MAX_FIELD_NUMBER = 536_870_911 // 2 ** 29 - 1

const BIGINT_ZERO = BigInt(0)
const BIGINT_ONE = BigInt(1)
const BIGINT_32 = BigInt(32)
const BIGINT_63 = BigInt(63)
const BIGINT_U32_MASK = BigInt(0xFFFFFFFF)
const BIGINT_NANOS_PER_SECOND = BigInt(1_000_000_000)
const BIGINT_NANOS_PER_MILLI = BigInt(1_000_000)
const BIGINT_MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER)
const INT64_MIN = -(BIGINT_ONE << BIGINT_63)
const INT64_MAX = (BIGINT_ONE << BIGINT_63) - BIGINT_ONE
const UINT64_MAX = (BIGINT_ONE << BigInt(64)) - BIGINT_ONE

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
   * element (`false`, the proto2 default).
   *
   * @default true
   */
  readonly packed?: boolean | undefined
  /**
   * Writes a singular scalar or enum field even when it holds its zero value,
   * as proto2 `required` fields are.
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
 * - Unknown fields are skipped and not kept, so re-encoding a decoded value
 *   drops them.
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
  return SchemaTransformation.transformEffect({
    decode: (bytes: Uint8Array<ArrayBuffer>, options) => {
      try {
        return Effect.succeed(decodeRoot(root, bytes))
      } catch (e) {
        return e instanceof WireError ? Effect.fail(e.toIssue(options)) : Effect.die(e)
      }
    },
    encode: (value: unknown, options) => {
      try {
        return Effect.succeed(encodeRoot(root, value))
      } catch (e) {
        return e instanceof WireError ? Effect.fail(e.toIssue(options)) : Effect.die(e)
      }
    }
  })
}

// -----------------------------------------------------------------------------
// annotations
// -----------------------------------------------------------------------------

// Matches the nesting limit of `SchemaBinary`.
const MAX_DEPTH = 512

interface FieldAnnotation {
  readonly number: number
  readonly packed: boolean | undefined
  readonly presence: "always" | undefined
  readonly encoding: "delimited" | undefined
}

type ScalarName =
  | "double"
  | "float"
  | "int32"
  | "uint32"
  | "sint32"
  | "fixed32"
  | "sfixed32"
  | "int64"
  | "uint64"
  | "sint64"
  | "fixed64"
  | "sfixed64"
  | "bool"
  | "string"
  | "bytes"

type WktName = "timestamp" | "date" | "duration" | "value" | "struct" | "listValue"

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

function isUnsigned(scalar: ScalarName): boolean {
  return scalar === "uint32" || scalar === "fixed32" || scalar === "uint64" || scalar === "fixed64"
}

function is64Bit(scalar: ScalarName): boolean {
  return scalar === "int64" || scalar === "uint64" || scalar === "sint64" || scalar === "fixed64" ||
    scalar === "sfixed64"
}

// `annotate` on a checked schema lands on its last check, so protobuf
// annotations are looked up on the node and then on its checks.
function getAnnotation(ast: SchemaAST.AST, key: string): unknown {
  const own = ast.annotations?.[key]
  if (own !== undefined) return own
  const checks = ast.checks
  if (checks === undefined) return undefined
  for (let i = checks.length - 1; i >= 0; i--) {
    const found = getCheckAnnotation(checks[i], key)
    if (found !== undefined) return found
  }
  return undefined
}

function getCheckAnnotation(check: SchemaAST.Check<any>, key: string): unknown {
  const own = check.annotations?.[key]
  if (own !== undefined || check._tag !== "FilterGroup") return own
  for (const inner of check.checks) {
    const found = getCheckAnnotation(inner, key)
    if (found !== undefined) return found
  }
  return undefined
}

function representationId(ast: SchemaAST.AST): string | undefined {
  const representation = ast.annotations?.representation
  return Predicate.isObject(representation) && typeof (representation as { id?: unknown }).id === "string"
    ? (representation as { id: string }).id
    : undefined
}

// Declarations with a native protobuf mapping. Any other declaration is
// replaced by its JSON encoding (or its codec) before the layout is compiled.
const NATIVE_DECLARATIONS = new Set([
  "effect/schema/Date",
  "effect/schema/DateTimeUtc",
  "effect/schema/Duration",
  "effect/schema/Uint8Array",
  "effect/schema/Option",
  "effect/schema/Json",
  "effect/schema/MutableJson"
])

const toProtobufAST = SchemaAST.applyToSelfOrLastLinkEncodingIdempotent((ast) => {
  const out = toProtobufASTStep(ast)
  const context = ast.context
  if (out === ast || context === undefined) return out
  return SchemaAST.replaceContextLastLink(
    out,
    new SchemaAST.Context(context.isOptional, context.isMutable, undefined, context.annotations)
  )
})

function toProtobufASTStep(ast: SchemaAST.AST): SchemaAST.AST {
  switch (ast._tag) {
    case "Declaration": {
      const id = representationId(ast)
      if (id !== undefined && NATIVE_DECLARATIONS.has(id)) return ast.recur(toProtobufAST)
      const getJson = ast.annotations?.toCodecJson
      const getCodec = ast.annotations?.toCodec
      if (!Predicate.isFunction(getJson) && !Predicate.isFunction(getCodec)) return ast
      const typeParameters = ast.typeParameters.map((tp) => Schema.make<Schema.Constraint>(SchemaAST.toEncoded(tp)))
      const link = (Predicate.isFunction(getJson) ? getJson(typeParameters) : undefined) ??
        (Predicate.isFunction(getCodec) ? getCodec(typeParameters) : undefined)
      return link === undefined ? ast : SchemaAST.replaceEncoding(ast, [SchemaAST.mapLink(link, toProtobufAST)])
    }
    case "Arrays":
    case "Objects":
    case "Union":
    case "Suspend":
      return ast.recur(toProtobufAST)
    default:
      return ast
  }
}

// -----------------------------------------------------------------------------
// layout
// -----------------------------------------------------------------------------

const WIRE_VARINT = 0
const WIRE_I64 = 1
const WIRE_LEN = 2
const WIRE_SGROUP = 3
const WIRE_EGROUP = 4
const WIRE_I32 = 5

interface ScalarLayout {
  readonly _tag: "Scalar"
  readonly scalar: ScalarName
  readonly wireType: number
  // A 64-bit integer represented as a JavaScript `number`.
  readonly asNumber: boolean
}

// A registered symbol, written as its `Symbol.keyFor` key.
interface SymbolLayout {
  readonly _tag: "Symbol"
  readonly wireType: typeof WIRE_LEN
}

interface WrapperLayout {
  readonly _tag: "Wrapper"
  readonly wireType: typeof WIRE_LEN
  readonly scalar: ScalarLayout
}

interface EnumLayout {
  readonly _tag: "Enum"
  readonly wireType: typeof WIRE_VARINT
  // `undefined` when values are their own enum numbers.
  readonly toNumber: ReadonlyMap<unknown, number> | undefined
  readonly fromNumber: ReadonlyMap<number, unknown> | undefined
}

interface MessageLayout {
  readonly _tag: "Message"
  readonly wireType: typeof WIRE_LEN
  readonly message: Message
}

interface WktLayout {
  readonly _tag: "Wkt"
  readonly wireType: typeof WIRE_LEN
  readonly wkt: WktName
}

// An empty message standing for a constant: a literal oneof case.
interface ConstantLayout {
  readonly _tag: "Constant"
  readonly wireType: typeof WIRE_LEN
  readonly value: unknown
}

type ValueLayout =
  | ScalarLayout
  | SymbolLayout
  | WrapperLayout
  | EnumLayout
  | MessageLayout
  | WktLayout
  | ConstantLayout

/**
 * How a slot is represented when its field is absent on the wire:
 *
 * - `"zero"`: implicit presence, the zero value
 * - `"omit"`: the key is left out
 * - `"null"` / `"undefined"`: that value
 * - `"none"`: `Option.none()`
 * - `"required"`: left out, for the schema to report
 * - `"constant"`: the field's constant
 */
type Absent = "zero" | "omit" | "null" | "undefined" | "none" | "required" | "constant"

interface Field {
  readonly _tag: "Field"
  readonly key: PropertyKey
  readonly number: number
  // `rest`: the entries of an index signature, spread into the struct.
  readonly kind: "singular" | "repeated" | "map" | "rest"
  readonly type: ValueLayout
  readonly mapKey: ScalarLayout | undefined
  readonly parameter: SchemaAST.IndexSignature["parameter"] | undefined
  // Map entries whose value is `undefined` are left out (optional values).
  readonly optionalValues: boolean
  readonly absent: Absent
  readonly constant: unknown
  // Writes the zero value of an implicit-presence field.
  readonly always: boolean
  readonly packed: boolean
  readonly delimited: boolean
}

interface Oneof {
  readonly key: PropertyKey
  readonly index: number
  readonly absent: Absent
  readonly cases: Array<Case>
  // Set when every case is a tagged struct: the tag selects the case.
  discriminator: { readonly key: string; readonly cases: ReadonlyMap<unknown, Case> } | undefined
}

interface Case {
  readonly _tag: "Case"
  readonly oneof: Oneof
  readonly number: number
  readonly type: ValueLayout
  // Set when the member is a tagged struct: the case value is the property at
  // `key`, and the literals are restored on decode.
  readonly unwrap: { readonly key: string; readonly literals: ReadonlyArray<readonly [string, unknown]> } | undefined
  readonly guard: ((value: unknown) => boolean) | undefined
  readonly delimited: boolean
}

type Slot = Field | Case

interface Message {
  readonly name: string
  // - `struct`: an object with a slot per property
  // - `tuple`: an array, element `i` at field `i + 1` and the rest after them
  // - `box`: a synthesized message whose single slot holds the value itself
  readonly shape: "struct" | "tuple" | "box"
  readonly elements: number
  readonly fields: Array<Field>
  readonly rest: Array<Field>
  readonly oneofs: Array<Oneof>
  readonly literals: Array<readonly [PropertyKey, unknown]>
  readonly declared: Set<PropertyKey>
  unknown: { readonly key: PropertyKey; readonly optional: boolean } | undefined
  readonly byNumber: Map<number, Slot>
  // Field-number order, the order fields are written in.
  readonly sorted: Array<Slot>
}

// The slot keys of synthesized messages, never part of an issue path.
const BOX_VALUE = Symbol("Protobuf/box")
const TUPLE_REST = Symbol("Protobuf/rest")

type Root = ValueLayout | { readonly _tag: "Void"; readonly value: null | undefined }

interface Resolved {
  readonly ast: SchemaAST.AST
  // The first identifier on the encoding chain.
  readonly identifier: string | undefined
  // Protobuf annotations of the encoding chain; the outermost wins.
  readonly annotations: Readonly<Record<string, unknown>>
}

const RESOLVED_KEYS = [SCALAR_KEY, MAP_KEY_KEY, WRAPPER_KEY, ENUM_KEY, WKT_KEY, UNKNOWN_KEY]

// Follows the encoding chain of a node to its encoded side, collecting the
// identifier and protobuf annotations of the nodes along the way.
function resolveEncoded(ast: SchemaAST.AST): Resolved {
  let identifier: string | undefined
  let annotations: Record<string, unknown> | undefined
  while (true) {
    if (identifier === undefined && typeof ast.annotations?.identifier === "string") {
      identifier = ast.annotations.identifier
    }
    for (const key of RESOLVED_KEYS) {
      if (annotations?.[key] !== undefined) continue
      const value = getAnnotation(ast, key)
      if (value !== undefined) (annotations ??= {})[key] = value
    }
    if (ast.encoding !== undefined) {
      ast = ast.encoding[ast.encoding.length - 1].to
    } else if (ast._tag === "Suspend") {
      ast = ast.thunk()
    } else {
      return { ast, identifier, annotations: annotations ?? {} }
    }
  }
}

// Key annotations live on the outer node of a property, or on a link of its
// encoding chain.
function getFieldAnnotation(ast: SchemaAST.AST): FieldAnnotation | undefined {
  while (true) {
    const found = ast.context?.annotations?.[FIELD_KEY]
    if (found !== undefined) return found as FieldAnnotation
    if (ast.encoding === undefined) return undefined
    ast = ast.encoding[ast.encoding.length - 1].to
  }
}

function isNullish(ast: SchemaAST.AST): boolean {
  return ast._tag === "Null" || ast._tag === "Undefined" || ast._tag === "Void"
}

function isLiteral(ast: SchemaAST.AST): boolean {
  return resolveEncoded(ast).ast._tag === "Literal"
}

// The value of a unit schema: a literal, a unique symbol, or a nullish keyword.
function constantOf(ast: SchemaAST.AST): { readonly value: unknown } | undefined {
  switch (ast._tag) {
    case "Literal":
      return { value: ast.literal }
    case "UniqueSymbol":
      return { value: ast.symbol }
    case "Null":
      return { value: null }
    case "Undefined":
    case "Void":
      return { value: undefined }
    default:
      return undefined
  }
}

// Members of a union, with unnumbered nested unions expanded. Unions of
// literals stay whole, since their annotations decide the enum numbers.
function flattenUnion(ast: SchemaAST.Union): Array<SchemaAST.AST> {
  const out: Array<SchemaAST.AST> = []
  for (const member of ast.types) {
    const inner = resolveEncoded(member).ast
    if (inner._tag === "Union" && getFieldAnnotation(member) === undefined && !inner.types.every(isLiteral)) {
      out.push(...flattenUnion(inner))
    } else {
      out.push(member)
    }
  }
  return out
}

// The value schema of an optional record value: its `undefined` entries are
// left out, so they need no representation.
function withoutUndefined(ast: SchemaAST.AST): SchemaAST.AST {
  const resolved = resolveEncoded(ast).ast
  if (resolved._tag !== "Union") return ast
  const rest = resolved.types.filter((member) => resolveEncoded(member).ast._tag !== "Undefined")
  return rest.length === 1 ? rest[0] : ast
}

// An array whose elements all share one schema, written as a repeated field.
function isUniformArray(ast: SchemaAST.Arrays): boolean {
  if (ast.rest.length !== 1) return false
  const element = ast.rest[0]
  return ast.elements.every((item) =>
    item === element ||
    SchemaAST.getContextOwner(resolveEncoded(item).ast) === SchemaAST.getContextOwner(resolveEncoded(element).ast)
  )
}

function scalarLayout(scalar: ScalarName, asNumber = false): ScalarLayout {
  return { _tag: "Scalar", scalar, wireType: scalarWireType(scalar), asNumber }
}

function scalarWireType(scalar: ScalarName): number {
  switch (scalar) {
    case "double":
    case "fixed64":
    case "sfixed64":
      return WIRE_I64
    case "float":
    case "fixed32":
    case "sfixed32":
      return WIRE_I32
    case "string":
    case "bytes":
      return WIRE_LEN
    default:
      return WIRE_VARINT
  }
}

function isPackable(type: ValueLayout): boolean {
  return type._tag === "Enum" || (type._tag === "Scalar" && type.wireType !== WIRE_LEN)
}

const SYMBOL_LAYOUT: SymbolLayout = { _tag: "Symbol", wireType: WIRE_LEN }

const WRAPPED_SCALARS = new Set<ScalarName>([
  "double",
  "float",
  "int64",
  "uint64",
  "int32",
  "uint32",
  "bool",
  "string",
  "bytes"
])

function layoutError(message: string): Error {
  return new Error(`Protobuf layout: ${message}`)
}

function describeKey(key: PropertyKey): string {
  if (key === BOX_VALUE) return "value"
  if (key === TUPLE_REST) return "rest"
  return typeof key === "string" ? `"${key}"` : String(key)
}

// The wire type of a single literal: the scalar it is a value of.
function literalScalar(literal: SchemaAST.LiteralValue): ScalarLayout {
  switch (typeof literal) {
    case "string":
      return scalarLayout("string")
    case "boolean":
      return scalarLayout("bool")
    case "bigint":
      return scalarLayout("int64")
    default:
      return scalarLayout(isInt32(literal) ? "int32" : "double")
  }
}

function compileRoot(ast: SchemaAST.AST): Root {
  // Messages by the body they are compiled from, so that a message used at
  // several positions, or recursively, is compiled once.
  const structs = new Map<SchemaAST.AST, Message>()
  const tuples = new Map<SchemaAST.AST, Message>()
  const boxes = new Map<SchemaAST.AST, Message>()

  function makeMessage(name: string, shape: Message["shape"], elements = 0): Message {
    return {
      name,
      shape,
      elements,
      fields: [],
      rest: [],
      oneofs: [],
      literals: [],
      declared: new Set(),
      unknown: undefined,
      byNumber: new Map(),
      sorted: []
    }
  }

  function addSlot(message: Message, entry: Field | Oneof | undefined): void {
    if (entry === undefined) return
    const register = (number: number, slot: Slot) => {
      if (message.byNumber.has(number)) {
        throw layoutError(`duplicate field number ${number} in ${message.name} (${describeKey(entry.key)})`)
      }
      message.byNumber.set(number, slot)
      message.sorted.push(slot)
    }
    if ("_tag" in entry) {
      if (entry.kind === "rest") message.rest.push(entry)
      else message.fields.push(entry)
      register(entry.number, entry)
    } else {
      message.oneofs.push(entry)
      for (const c of entry.cases) register(c.number, c)
    }
  }

  function done(message: Message): Message {
    message.sorted.sort((a, b) => a.number - b.number)
    return message
  }

  function compileStruct(ast: SchemaAST.Objects, identifier: string | undefined): Message {
    const owner = SchemaAST.getContextOwner(ast)
    const cached = structs.get(owner)
    if (cached !== undefined) return cached
    const message = makeMessage(identifier ?? "message", "struct")
    structs.set(owner, message)
    for (const ps of ast.propertySignatures) {
      message.declared.add(ps.name)
      const where = `property ${describeKey(ps.name)} of ${message.name}`
      addSlot(message, compileSlot(message, ps.name, ps.type, where, undefined, true))
    }
    for (const signature of ast.indexSignatures) {
      const where = `index signature of ${message.name}`
      const annotation = getFieldAnnotation(signature.type)
      if (annotation === undefined) {
        throw layoutError(`${where} has no field number; annotate the record value with Protobuf.field(n)`)
      }
      addSlot(message, {
        ...mapField(signature, where),
        key: TUPLE_REST,
        number: annotation.number,
        kind: "rest",
        absent: "zero",
        parameter: signature.parameter
      })
    }
    return done(message)
  }

  function compileTuple(ast: SchemaAST.Arrays, where: string): Message {
    const owner = SchemaAST.getContextOwner(ast)
    const cached = tuples.get(owner)
    if (cached !== undefined) return cached
    const message = makeMessage(where, "tuple", ast.elements.length)
    tuples.set(owner, message)
    ast.elements.forEach((element, i) => {
      const annotation: FieldAnnotation = {
        number: i + 1,
        packed: undefined,
        presence: SchemaAST.isOptional(element) ? undefined : "always",
        encoding: undefined
      }
      addSlot(message, compileSlot(message, i, element, `element ${i} of ${where}`, annotation, false))
    })
    if (ast.rest.length > 1) throw layoutError(`${where} has elements after its rest element`)
    if (ast.rest.length === 1) {
      const element = compileValue(resolveEncoded(ast.rest[0]), `rest element of ${where}`)
      addSlot(message, repeatedField(TUPLE_REST, ast.elements.length + 1, element, "zero", undefined))
    }
    return done(message)
  }

  // A synthesized message `{ value = 1 }` for a value that cannot be a field
  // on its own: a collection, a union, or an optional value in an element,
  // map value, oneof case, or root position.
  function compileBox(ast: SchemaAST.AST, where: string): Message {
    const owner = SchemaAST.getContextOwner(ast)
    const cached = boxes.get(owner)
    if (cached !== undefined) return cached
    const message = makeMessage(where, "box")
    boxes.set(owner, message)
    const annotation: FieldAnnotation = { number: 1, packed: undefined, presence: undefined, encoding: undefined }
    addSlot(message, compileSlot(message, BOX_VALUE, ast, where, annotation, true))
    return done(message)
  }

  function repeatedField(
    key: PropertyKey,
    number: number,
    element: ValueLayout,
    absent: Absent,
    annotation: FieldAnnotation | undefined
  ): Field {
    return {
      _tag: "Field",
      key,
      number,
      kind: "repeated",
      type: element,
      mapKey: undefined,
      parameter: undefined,
      optionalValues: false,
      absent,
      constant: undefined,
      always: false,
      packed: annotation?.packed ?? isPackable(element),
      delimited: annotation?.encoding === "delimited"
    }
  }

  function mapField(signature: SchemaAST.IndexSignature, where: string): Omit<Field, "key" | "number" | "absent"> {
    const optionalValues = SchemaAST.isOptional(signature.type)
    return {
      _tag: "Field",
      kind: "map",
      type: compileValue(
        resolveEncoded(optionalValues ? withoutUndefined(signature.type) : signature.type),
        `${where} (map value)`
      ),
      mapKey: compileMapKey(resolveEncoded(signature.parameter), where),
      parameter: undefined,
      optionalValues,
      constant: undefined,
      always: false,
      packed: false,
      delimited: false
    }
  }

  // Compiles a struct property, a tuple element, or the value of a box. A
  // union becomes a oneof of `message` when `oneofs` is set, and a boxed oneof
  // otherwise.
  function compileSlot(
    message: Message,
    key: PropertyKey,
    type: SchemaAST.AST,
    where: string,
    fixed: FieldAnnotation | undefined,
    oneofs: boolean
  ): Field | Oneof | undefined {
    let annotation = fixed ?? getFieldAnnotation(type)
    let resolved = resolveEncoded(type)
    let ast = resolved.ast

    if (resolved.annotations[UNKNOWN_KEY] === true && message.shape === "struct") {
      if (annotation !== undefined) throw layoutError(`${where} holds unknown fields and takes no field number`)
      if (message.unknown !== undefined) throw layoutError(`${message.name} has several UnknownFields properties`)
      message.unknown = { key, optional: SchemaAST.isOptional(type) }
      return undefined
    }

    const constant = constantOf(ast)
    if (constant !== undefined) {
      // A tuple element is numbered by its position, so a nullish one stays a
      // constant too.
      if (annotation === undefined || (fixed !== undefined && isNullish(ast))) {
        message.literals.push([key, constant.value])
        return undefined
      }
      if (isNullish(ast)) throw layoutError(`${where} is ${ast._tag}, which has no wire representation`)
      return {
        _tag: "Field",
        key,
        number: annotation.number,
        kind: "singular",
        type: ast._tag === "Literal" ? literalScalar(ast.literal) : SYMBOL_LAYOUT,
        mapKey: undefined,
        parameter: undefined,
        optionalValues: false,
        absent: "constant",
        constant: constant.value,
        always: true,
        packed: false,
        delimited: false
      }
    }

    let absent: Absent | undefined = SchemaAST.isOptional(type) ? "omit" : undefined
    // Nullish members and `Option` make the field explicit-presence. The other
    // members of a union are a oneof, unless they are literals.
    let literals: ReadonlyArray<SchemaAST.AST> | undefined
    if (oneofs) {
      if (ast._tag === "Declaration" && representationId(ast) === "effect/schema/Option") {
        absent = "none"
        resolved = resolveEncoded(ast.typeParameters[0])
        ast = resolved.ast
      }
      while (ast._tag === "Union") {
        const types = flattenUnion(ast)
        const rest = types.filter((member) => !isNullish(resolveEncoded(member).ast))
        if (rest.length < types.length) {
          absent ??= types.some((member) => resolveEncoded(member).ast._tag === "Null") ? "null" : "undefined"
          if (rest.length === 1) {
            if (fixed === undefined) annotation ??= getFieldAnnotation(rest[0])
            const inner = resolveEncoded(rest[0])
            resolved = { ...inner, annotations: { ...inner.annotations, ...resolved.annotations } }
            ast = resolved.ast
            continue
          }
        }
        if (rest.length === 0) throw layoutError(`${where} has no protobuf mapping for a nullish union`)
        if (rest.every(isLiteral)) {
          literals = rest
          break
        }
        if (annotation !== undefined && fixed === undefined) {
          throw layoutError(`${where} is a oneof; number its members instead of the property`)
        }
        return compileOneof(message, key, rest, absent ?? "required", where)
      }
    }

    if (annotation === undefined) {
      throw layoutError(`${where} has no field number; annotate it with Protobuf.field(n)`)
    }
    const number = annotation.number
    const wkt = resolved.annotations[WKT_KEY]

    if (wkt === undefined && ast._tag === "Arrays" && isUniformArray(ast)) {
      const element = compileValue(resolveEncoded(ast.rest[0]), `${where} (element)`)
      if (annotation.packed === true && !isPackable(element)) throw layoutError(`${where} cannot be packed`)
      checkDelimited(annotation, element, where)
      return repeatedField(key, number, element, absent ?? "zero", annotation)
    }
    if (
      wkt === undefined && ast._tag === "Objects" && ast.propertySignatures.length === 0 &&
      ast.indexSignatures.length === 1
    ) {
      return { ...mapField(ast.indexSignatures[0], where), key, number, absent: absent ?? "zero" }
    }

    const value = literals === undefined ? compileValue(resolved, where) : literalValue(literals, resolved, where)
    checkDelimited(annotation, value, where)
    return {
      _tag: "Field",
      key,
      number,
      kind: "singular",
      type: value,
      mapKey: undefined,
      parameter: undefined,
      optionalValues: false,
      absent: absent ?? (value._tag === "Scalar" || value._tag === "Enum" ? "zero" : "required"),
      constant: undefined,
      always: annotation.presence === "always",
      packed: false,
      delimited: annotation.encoding === "delimited"
    }
  }

  function checkDelimited(annotation: FieldAnnotation, type: ValueLayout, where: string): void {
    if (annotation.encoding === "delimited" && type._tag !== "Message") {
      throw layoutError(`${where} is not a message; only messages can use the delimited encoding`)
    }
  }

  function compileOneof(
    message: Message,
    key: PropertyKey,
    members: ReadonlyArray<SchemaAST.AST>,
    absent: Absent,
    where: string
  ): Oneof {
    const oneof: Oneof = { key, index: message.oneofs.length, absent, cases: [], discriminator: undefined }
    for (const member of members) {
      const resolved = resolveEncoded(member)
      const annotation = getFieldAnnotation(member)
      if (annotation !== undefined) {
        const type = compileCaseValue(resolved, where)
        checkDelimited(annotation, type, where)
        oneof.cases.push({
          _tag: "Case",
          oneof,
          number: annotation.number,
          type,
          unwrap: undefined,
          guard: Schema.is(Schema.make(SchemaAST.toEncoded(member))),
          delimited: annotation.encoding === "delimited"
        })
        continue
      }
      const ast = resolved.ast
      if (ast._tag === "Objects" && ast.indexSignatures.length === 0) {
        const literals: Array<readonly [string, unknown]> = []
        const wire: Array<SchemaAST.PropertySignature> = []
        for (const ps of ast.propertySignatures) {
          const inner = resolveEncoded(ps.type).ast
          if (inner._tag === "Literal" && typeof ps.name === "string") literals.push([ps.name, inner.literal])
          else wire.push(ps)
        }
        const annotation = wire.length === 1 ? getFieldAnnotation(wire[0].type) : undefined
        if (annotation !== undefined && typeof wire[0].name === "string") {
          const type = compileCaseValue(resolveEncoded(wire[0].type), where)
          checkDelimited(annotation, type, where)
          oneof.cases.push({
            _tag: "Case",
            oneof,
            number: annotation.number,
            type,
            unwrap: { key: wire[0].name, literals },
            guard: Schema.is(Schema.make(SchemaAST.toEncoded(member))),
            delimited: annotation.encoding === "delimited"
          })
          continue
        }
      }
      throw layoutError(
        `member ${oneof.cases.length} of ${where} is not a oneof case; annotate it with Protobuf.field(n), ` +
          `or make it a tagged struct with a single numbered property`
      )
    }
    oneof.discriminator = findDiscriminator(oneof.cases)
    return oneof
  }

  // A literal case is an empty message: its presence is the value.
  function compileCaseValue(resolved: Resolved, where: string): ValueLayout {
    const constant = constantOf(resolved.ast)
    if (constant !== undefined) return { _tag: "Constant", wireType: WIRE_LEN, value: constant.value }
    return compileValue(resolved, where)
  }

  function compileValue(resolved: Resolved, where: string): ValueLayout {
    const ast = resolved.ast
    const wkt = resolved.annotations[WKT_KEY] as WktName | undefined
    if (wkt !== undefined) return { _tag: "Wkt", wireType: WIRE_LEN, wkt }
    const value = compileBareValue(resolved, where)
    if (resolved.annotations[WRAPPER_KEY] !== true) return value
    if (value._tag !== "Scalar" || !WRAPPED_SCALARS.has(value.scalar)) {
      throw layoutError(`${where} has no google.protobuf wrapper type for ${describe(value, ast)}`)
    }
    return { _tag: "Wrapper", wireType: WIRE_LEN, scalar: value }
  }

  function compileBareValue(resolved: Resolved, where: string): ValueLayout {
    const ast = resolved.ast
    const scalar = resolved.annotations[SCALAR_KEY] as ScalarName | undefined
    switch (ast._tag) {
      case "String":
      case "TemplateLiteral":
        return scalarLayout("string")
      case "Boolean":
        return scalarLayout("bool")
      case "Number": {
        const s = scalar ?? "double"
        if (s === "bool" || s === "string" || s === "bytes") throw layoutError(`${where} is a number, not ${s}`)
        return scalarLayout(s, is64Bit(s))
      }
      case "BigInt": {
        const s = scalar ?? "int64"
        if (!is64Bit(s)) throw layoutError(`${where} is a bigint, not ${s}`)
        return scalarLayout(s)
      }
      case "Literal":
        return literalScalar(ast.literal)
      case "Symbol":
      case "UniqueSymbol":
        return SYMBOL_LAYOUT
      case "Enum": {
        for (const [name, value] of ast.enums) {
          if (typeof value !== "number" || !isInt32(value)) {
            throw layoutError(`${where} has enum member ${name} without a 32-bit integer value`)
          }
        }
        return { _tag: "Enum", wireType: WIRE_VARINT, toNumber: undefined, fromNumber: undefined }
      }
      case "Union": {
        const members = flattenUnion(ast)
        if (members.every(isLiteral)) return literalValue(members, resolved, where)
        return box(ast, where)
      }
      case "Objects":
        if (ast.propertySignatures.length === 0 && ast.indexSignatures.length === 1) return box(ast, where)
        return { _tag: "Message", wireType: WIRE_LEN, message: compileStruct(ast, resolved.identifier) }
      case "Arrays":
        if (isUniformArray(ast)) return box(ast, where)
        return { _tag: "Message", wireType: WIRE_LEN, message: compileTuple(ast, where) }
      case "Declaration":
        switch (representationId(ast)) {
          case "effect/schema/DateTimeUtc":
            return { _tag: "Wkt", wireType: WIRE_LEN, wkt: "timestamp" }
          case "effect/schema/Date":
            return { _tag: "Wkt", wireType: WIRE_LEN, wkt: "date" }
          case "effect/schema/Duration":
            return { _tag: "Wkt", wireType: WIRE_LEN, wkt: "duration" }
          case "effect/schema/Uint8Array":
            return scalarLayout("bytes")
          case "effect/schema/Json":
          case "effect/schema/MutableJson":
            return { _tag: "Wkt", wireType: WIRE_LEN, wkt: "value" }
          case "effect/schema/Option":
            return box(ast, where)
        }
        throw layoutError(`${where} is a declaration without a protobuf mapping or codec annotation`)
      case "Unknown":
      case "Any":
      case "ObjectKeyword":
        return { _tag: "Wkt", wireType: WIRE_LEN, wkt: "value" }
      default:
        throw layoutError(`${where} has no protobuf mapping for ${ast._tag}`)
    }
  }

  function box(ast: SchemaAST.AST, where: string): MessageLayout {
    return { _tag: "Message", wireType: WIRE_LEN, message: compileBox(ast, where) }
  }

  // Unions of literals: an enum with `enumNumbers` or numeric members, and
  // otherwise the scalar the literals share.
  function literalValue(members: ReadonlyArray<SchemaAST.AST>, resolved: Resolved, where: string): ValueLayout {
    const literals = members.map((member) => (resolveEncoded(member).ast as SchemaAST.Literal).literal)
    const mapping = resolved.annotations[ENUM_KEY] as Readonly<Record<string, number>> | undefined
    if (mapping === undefined) {
      if (literals.every((literal) => typeof literal === "number" && isInt32(literal))) {
        return { _tag: "Enum", wireType: WIRE_VARINT, toNumber: undefined, fromNumber: undefined }
      }
      const kind = typeof literals[0]
      if (literals.every((literal) => typeof literal === kind)) return literalScalar(literals[0])
      throw layoutError(`${where} is a union of literals of different types; annotate it with Protobuf.enumNumbers`)
    }
    const toNumber = new Map<unknown, number>()
    const fromNumber = new Map<number, unknown>()
    for (const literal of literals) {
      const number = mapping[String(literal)]
      if (number === undefined || !isInt32(number)) {
        throw layoutError(`${where} has no 32-bit enum number for ${String(literal)}`)
      }
      toNumber.set(literal, number)
      if (!fromNumber.has(number)) fromNumber.set(number, literal)
    }
    return { _tag: "Enum", wireType: WIRE_VARINT, toNumber, fromNumber }
  }

  function compileMapKey(resolved: Resolved, where: string): ScalarLayout {
    const declared = (resolved.annotations[MAP_KEY_KEY] ?? resolved.annotations[SCALAR_KEY]) as ScalarName | undefined
    switch (resolved.ast._tag) {
      case "String":
      case "TemplateLiteral":
        if (declared === undefined) return scalarLayout("string")
        if (declared === "bool" || is64Bit(declared)) return scalarLayout(declared)
        break
      case "Number": {
        const s = declared ?? "int32"
        if (s !== "bool" && s !== "string" && s !== "bytes") return scalarLayout(s, is64Bit(s))
        break
      }
    }
    throw layoutError(
      `${where} has an unsupported map key; use String, Number, Int32 (and friends), or Protobuf.mapKey`
    )
  }

  const resolved = resolveEncoded(ast)
  const node = resolved.ast
  if (isNullish(node)) return { _tag: "Void", value: node._tag === "Null" ? null : undefined }
  // A record whose values are numbered is a message of maps.
  if (
    node._tag === "Objects" && node.indexSignatures.length > 0 && resolved.annotations[WKT_KEY] === undefined &&
    node.indexSignatures.every((signature) => getFieldAnnotation(signature.type) !== undefined)
  ) {
    return { _tag: "Message", wireType: WIRE_LEN, message: compileStruct(node, resolved.identifier) }
  }
  const root = compileValue(resolved, "the root schema")
  if (root._tag === "Message" || root._tag === "Wkt" || root._tag === "Wrapper") return root
  // Any other root is the value of a box, like the google.protobuf wrappers.
  return box(ast, "the root schema")
}

function describe(layout: ValueLayout, ast: SchemaAST.AST): string {
  return layout._tag === "Scalar" ? layout.scalar : ast._tag
}

function findDiscriminator(cases: ReadonlyArray<Case>): Oneof["discriminator"] {
  const first = cases[0]?.unwrap
  if (first === undefined || cases.some((c) => c.unwrap === undefined)) return undefined
  for (const [key] of first.literals) {
    const byLiteral = new Map<unknown, Case>()
    for (const c of cases) {
      const literal = c.unwrap!.literals.find(([k]) => k === key)
      if (literal === undefined || byLiteral.has(literal[1])) break
      byLiteral.set(literal[1], c)
    }
    if (byLiteral.size === cases.length) return { key, cases: byLiteral }
  }
  return undefined
}

function matchCase(oneof: Oneof, value: unknown): Case | undefined {
  const discriminator = oneof.discriminator
  if (discriminator !== undefined) {
    return Predicate.isObject(value)
      ? discriminator.cases.get((value as Record<string, unknown>)[discriminator.key])
      : undefined
  }
  for (const c of oneof.cases) {
    if (c.guard!(value)) return c
  }
  return undefined
}

// -----------------------------------------------------------------------------
// errors
// -----------------------------------------------------------------------------

class WireError extends Error {
  readonly path: Array<PropertyKey> = []
  readonly input: unknown
  constructor(message: string, input?: unknown) {
    super(message)
    this.input = input
  }
  toIssue(options: SchemaAST.ParseOptions): SchemaIssue.Issue {
    const issue = new SchemaIssue.InvalidValue({ message: this.message }, this.input, options)
    return this.path.length === 0 ? issue : new SchemaIssue.Pointer(this.path, issue)
  }
}

// Rethrows a wire error with the slot it occurred in prepended to its path.
function rethrowAt(e: unknown, key: PropertyKey | undefined): never {
  if (e instanceof WireError && key !== undefined && key !== BOX_VALUE && key !== TUPLE_REST) e.path.unshift(key)
  throw e
}

// -----------------------------------------------------------------------------
// wire primitives
// -----------------------------------------------------------------------------

const FLOAT32_MAX = 3.4028234663852886e38

const utf8Encoder = new TextEncoder()
const utf8Decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true })

function isInt32(n: number): boolean {
  return Number.isInteger(n) && n >= -2147483648 && n <= 2147483647
}

function isUint32(n: number): boolean {
  return Number.isInteger(n) && n >= 0 && n <= 4294967295
}

function varintSize(n: number): number {
  let size = 1
  while (n > 0x7F) {
    n = n >>> 7
    size++
  }
  return size
}

class Writer {
  buf: Uint8Array<ArrayBuffer>
  view: DataView
  pos = 0

  constructor() {
    this.buf = new Uint8Array(256)
    this.view = new DataView(this.buf.buffer)
  }

  ensure(n: number): void {
    if (this.pos + n <= this.buf.length) return
    let size = this.buf.length * 2
    while (size < this.pos + n) size *= 2
    const next = new Uint8Array(size)
    next.set(this.buf.subarray(0, this.pos))
    this.buf = next
    this.view = new DataView(next.buffer)
  }

  finish(): Uint8Array<ArrayBuffer> {
    return this.buf.slice(0, this.pos)
  }

  tag(number: number, wireType: number): void {
    this.varint32(number * 8 + wireType)
  }

  // An unsigned 32-bit varint.
  varint32(n: number): void {
    this.ensure(5)
    const buf = this.buf
    while (n > 0x7F) {
      buf[this.pos++] = (n & 0x7F) | 0x80
      n = n >>> 7
    }
    buf[this.pos++] = n
  }

  // A 64-bit varint from its unsigned 32-bit halves.
  varint64(lo: number, hi: number): void {
    this.ensure(10)
    const buf = this.buf
    while (hi > 0 || lo > 0x7F) {
      buf[this.pos++] = (lo & 0x7F) | 0x80
      lo = ((lo >>> 7) | (hi << 25)) >>> 0
      hi = hi >>> 7
    }
    buf[this.pos++] = lo
  }

  // Any bigint in the 64-bit range, as two's complement.
  bigVarint(n: bigint): void {
    const u = BigInt.asUintN(64, n)
    this.varint64(Number(u & BIGINT_U32_MASK), Number(u >> BIGINT_32))
  }

  int32(n: number): void {
    if (n >= 0) this.varint32(n)
    else this.varint64(n >>> 0, 0xFFFFFFFF)
  }

  fixed32(n: number): void {
    this.ensure(4)
    this.view.setUint32(this.pos, n, true)
    this.pos += 4
  }

  sfixed32(n: number): void {
    this.ensure(4)
    this.view.setInt32(this.pos, n, true)
    this.pos += 4
  }

  fixed64(n: bigint): void {
    this.ensure(8)
    this.view.setBigUint64(this.pos, BigInt.asUintN(64, n), true)
    this.pos += 8
  }

  float(n: number): void {
    this.ensure(4)
    this.view.setFloat32(this.pos, n, true)
    this.pos += 4
  }

  double(n: number): void {
    this.ensure(8)
    this.view.setFloat64(this.pos, n, true)
    this.pos += 8
  }

  // Starts a length-delimited section with a one-byte length placeholder.
  begin(): number {
    this.ensure(1)
    return this.pos++
  }

  // Ends a section started by `begin`, widening the length prefix if needed.
  end(start: number): void {
    const length = this.pos - start - 1
    if (length < 0x80) {
      this.buf[start] = length
      return
    }
    const size = varintSize(length)
    this.ensure(size - 1)
    const buf = this.buf
    buf.copyWithin(start + size, start + 1, this.pos)
    this.pos += size - 1
    let n = length
    let p = start
    while (n > 0x7F) {
      buf[p++] = (n & 0x7F) | 0x80
      n = n >>> 7
    }
    buf[p] = n
  }

  raw(bytes: Uint8Array): void {
    this.ensure(bytes.length)
    this.buf.set(bytes, this.pos)
    this.pos += bytes.length
  }

  bytes(bytes: Uint8Array): void {
    this.varint32(bytes.length)
    this.ensure(bytes.length)
    this.buf.set(bytes, this.pos)
    this.pos += bytes.length
  }

  string(s: string): void {
    const start = this.begin()
    const n = s.length
    this.ensure(n * 3)
    const buf = this.buf
    let pos = this.pos
    let i = 0
    for (; i < n; i++) {
      const c = s.charCodeAt(i)
      if (c >= 0x80) break
      buf[pos++] = c
    }
    if (i < n) pos += utf8Encoder.encodeInto(s.slice(i), buf.subarray(pos)).written
    this.pos = pos
    this.end(start)
  }
}

class Reader {
  readonly buf: Uint8Array
  readonly view: DataView
  pos = 0
  // The halves of the last `varint64`.
  lo = 0
  hi = 0

  constructor(buf: Uint8Array) {
    this.buf = buf
    this.view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  }

  byte(): number {
    if (this.pos >= this.buf.length) throw new WireError("premature end of input")
    return this.buf[this.pos++]
  }

  need(n: number): void {
    if (this.pos + n > this.buf.length) throw new WireError("premature end of input")
  }

  // A varint truncated to its low 32 bits, unsigned.
  varint32(): number {
    let result = 0
    for (let i = 0; i < 10; i++) {
      const b = this.byte()
      if (i < 5) result |= (b & 0x7F) << (7 * i)
      if (b < 0x80) return result >>> 0
    }
    throw new WireError("invalid varint")
  }

  varint64(): void {
    let lo = 0
    let hi = 0
    let b: number
    for (let shift = 0; shift < 28; shift += 7) {
      b = this.byte()
      lo |= (b & 0x7F) << shift
      if (b < 0x80) {
        this.lo = lo >>> 0
        this.hi = 0
        return
      }
    }
    b = this.byte()
    lo |= (b & 0x0F) << 28
    hi = (b & 0x7F) >> 4
    if (b < 0x80) {
      this.lo = lo >>> 0
      this.hi = hi
      return
    }
    for (let shift = 3; shift <= 31; shift += 7) {
      b = this.byte()
      hi |= (b & 0x7F) << shift
      if (b < 0x80) {
        this.lo = lo >>> 0
        this.hi = hi >>> 0
        return
      }
    }
    throw new WireError("invalid varint")
  }

  uint64(): bigint {
    this.varint64()
    return (BigInt(this.hi) << BIGINT_32) | BigInt(this.lo)
  }

  fixed32(): number {
    this.need(4)
    const n = this.view.getUint32(this.pos, true)
    this.pos += 4
    return n
  }

  sfixed32(): number {
    this.need(4)
    const n = this.view.getInt32(this.pos, true)
    this.pos += 4
    return n
  }

  fixed64(): bigint {
    this.need(8)
    const n = this.view.getBigUint64(this.pos, true)
    this.pos += 8
    return n
  }

  sfixed64(): bigint {
    this.need(8)
    const n = this.view.getBigInt64(this.pos, true)
    this.pos += 8
    return n
  }

  float(): number {
    this.need(4)
    const n = this.view.getFloat32(this.pos, true)
    this.pos += 4
    return n
  }

  double(): number {
    this.need(8)
    const n = this.view.getFloat64(this.pos, true)
    this.pos += 8
    return n
  }

  // Reads a length prefix and returns the end offset of the section.
  delimited(): number {
    const length = this.varint32()
    this.need(length)
    return this.pos + length
  }

  bytes(): Uint8Array<ArrayBuffer> {
    const end = this.delimited()
    const out = this.buf.slice(this.pos, end) as Uint8Array<ArrayBuffer>
    this.pos = end
    return out
  }

  string(): string {
    const end = this.delimited()
    const buf = this.buf
    let out = ""
    let i = this.pos
    // Short ASCII strings skip the decoder.
    if (end - i <= 32) {
      for (; i < end; i++) {
        const c = buf[i]
        if (c >= 0x80) break
        out += String.fromCharCode(c)
      }
    }
    if (i < end) {
      try {
        out = utf8Decoder.decode(buf.subarray(this.pos, end))
      } catch {
        throw new WireError("invalid UTF-8 in string field")
      }
    }
    this.pos = end
    return out
  }

  skip(wireType: number, number: number, depth: number): void {
    switch (wireType) {
      case WIRE_VARINT:
        this.varint64()
        return
      case WIRE_I64:
        this.need(8)
        this.pos += 8
        return
      case WIRE_LEN:
        this.pos = this.delimited()
        return
      case WIRE_I32:
        this.need(4)
        this.pos += 4
        return
      case WIRE_SGROUP: {
        if (depth > MAX_DEPTH) throw new WireError(`nesting deeper than ${MAX_DEPTH}`)
        while (true) {
          const tag = readTag(this)
          if ((tag & 7) === WIRE_EGROUP) {
            if (tag >>> 3 !== number) throw new WireError(`mismatched end group tag for field ${number}`)
            return
          }
          this.skip(tag & 7, tag >>> 3, depth + 1)
        }
      }
      default:
        throw new WireError(`unexpected end group tag for field ${number}`)
    }
  }
}

function readTag(r: Reader): number {
  const tag = r.varint32()
  if (tag >>> 3 === 0 || (tag & 7) > WIRE_I32) {
    throw new WireError(`illegal tag: field ${tag >>> 3}, wire type ${tag & 7}`)
  }
  return tag
}

// -----------------------------------------------------------------------------
// encode
// -----------------------------------------------------------------------------

function encodeRoot(root: Root, value: unknown): Uint8Array<ArrayBuffer> {
  const w = new Writer()
  switch (root._tag) {
    case "Void":
      break
    case "Message":
      encodeMessage(root.message, value, w)
      break
    case "Wkt":
      encodeWkt(root.wkt, value, w)
      break
    case "Wrapper":
      encodeWrapper(root.scalar, value, w)
      break
    default:
      throw new WireError("unexpected root")
  }
  return w.finish()
}

// The value a slot of `message` holds in `container`.
function slotValue(message: Message, container: unknown, key: PropertyKey): unknown {
  switch (message.shape) {
    case "struct":
      return (container as Record<PropertyKey, unknown>)[key]
    case "tuple":
      return key === TUPLE_REST
        ? (container as ReadonlyArray<unknown>).slice(message.elements)
        : (container as ReadonlyArray<unknown>)[key as number]
    case "box":
      return container
  }
}

function encodeMessage(message: Message, value: unknown, w: Writer): void {
  if (message.shape === "struct" && !Predicate.isObject(value)) {
    throw new WireError(`expected an object for ${message.name}`, value)
  }
  if (message.shape === "tuple" && !Array.isArray(value)) {
    throw new WireError(`expected an array for ${message.name}`, value)
  }
  let key: PropertyKey | undefined
  try {
    // The case of each oneof, so that it is written in field-number order.
    const cases: Array<Case | undefined> = []
    for (const oneof of message.oneofs) {
      key = oneof.key
      const v = present(oneof.absent, slotValue(message, value, key))
      const c = v === undefined ? undefined : matchCase(oneof, v)
      if (v !== undefined && c === undefined) throw new WireError("value matches no oneof case", v)
      cases.push(c)
    }
    for (const slot of message.sorted) {
      if (slot._tag === "Case") {
        if (cases[slot.oneof.index] !== slot) continue
        key = slot.oneof.key
        const v = present(slot.oneof.absent, slotValue(message, value, key))
        const caseValue = slot.unwrap === undefined ? v : unwrapCase(slot.unwrap.key, v)
        encodeValue(slot.number, slot.type, caseValue, w, slot.delimited)
      } else if (slot.kind === "rest") {
        key = undefined
        encodeRest(message, slot, value as Record<PropertyKey, unknown>, w)
      } else {
        key = slot.key
        encodeField(slot, slotValue(message, value, key), w)
      }
    }
    if (message.unknown !== undefined) {
      key = message.unknown.key
      const bytes = (value as Record<PropertyKey, unknown>)[key]
      if (bytes !== undefined) {
        if (!(bytes instanceof Uint8Array)) throw new WireError("expected the bytes of unknown fields", bytes)
        w.raw(bytes)
      }
    }
  } catch (e) {
    rethrowAt(e, key)
  }
}

function unwrapCase(key: string, member: unknown): unknown {
  return (member as Record<string, unknown>)[key]
}

// The value of an explicit-presence slot, or `undefined` when it is absent.
function present(absent: Absent, value: unknown): unknown {
  if (value === null) return undefined
  if (absent === "none" && value !== undefined) {
    if (!Option.isOption(value)) throw new WireError("expected an Option", value)
    return Option.isSome(value) ? value.value : undefined
  }
  return value
}

function encodeField(field: Field, value: unknown, w: Writer): void {
  const v = present(field.absent, value)
  if (v === undefined) return
  switch (field.kind) {
    case "singular":
      if (field.absent === "zero" && !field.always && isZero(field.type, v)) return
      encodeValue(field.number, field.type, v, w, field.delimited)
      return
    case "repeated": {
      if (!Array.isArray(v)) throw new WireError("expected an array", v)
      if (v.length === 0) return
      let i = 0
      try {
        if (field.packed) {
          w.tag(field.number, WIRE_LEN)
          const start = w.begin()
          for (; i < v.length; i++) encodePacked(field.type, v[i], w)
          w.end(start)
        } else {
          for (; i < v.length; i++) encodeValue(field.number, field.type, v[i], w, field.delimited)
        }
      } catch (e) {
        rethrowAt(e, i)
      }
      return
    }
    case "map": {
      if (!Predicate.isObject(v)) throw new WireError("expected a record", v)
      const record = v as Record<string, unknown>
      for (const k of Object.keys(record)) encodeEntry(field, k, record[k], w)
      return
    }
  }
}

// Writes the keys of a struct that its index signature `field` selects, and
// that no declared property or earlier index signature claims.
function encodeRest(message: Message, field: Field, obj: Record<PropertyKey, unknown>, w: Writer): void {
  for (const k of SchemaAST.getIndexSignatureKeys(obj, field.parameter!)) {
    if (typeof k !== "string" || message.declared.has(k) || claimedBefore(message, field, k)) continue
    encodeEntry(field, k, obj[k], w)
  }
}

function claimedBefore(message: Message, field: Field, key: string): boolean {
  for (const other of message.rest) {
    if (other === field) return false
    if (SchemaAST.getIndexSignatureKeys({ [key]: null }, other.parameter!).length > 0) return true
  }
  return false
}

function encodeEntry(field: Field, key: string, value: unknown, w: Writer): void {
  if (value === undefined && field.optionalValues) return
  try {
    w.tag(field.number, WIRE_LEN)
    const start = w.begin()
    w.tag(1, field.mapKey!.wireType)
    encodeScalar(field.mapKey!, mapKeyFromString(field.mapKey!, key), w)
    encodeValue(2, field.type, value, w, false)
    w.end(start)
  } catch (e) {
    rethrowAt(e, key)
  }
}

function encodePacked(type: ValueLayout, value: unknown, w: Writer): void {
  if (type._tag === "Enum") w.int32(enumNumber(type, value))
  else encodeScalar(type as ScalarLayout, value, w)
}

function encodeValue(number: number, type: ValueLayout, value: unknown, w: Writer, delimited: boolean): void {
  if (delimited) {
    w.tag(number, WIRE_SGROUP)
    encodeMessage((type as MessageLayout).message, value, w)
    w.tag(number, WIRE_EGROUP)
    return
  }
  w.tag(number, type.wireType)
  switch (type._tag) {
    case "Scalar":
      encodeScalar(type, value, w)
      return
    case "Enum":
      w.int32(enumNumber(type, value))
      return
    case "Symbol": {
      const key = typeof value === "symbol" ? Symbol.keyFor(value) : undefined
      if (key === undefined) throw new WireError("expected a registered symbol (Symbol.for)", value)
      w.string(key)
      return
    }
    case "Constant":
      w.varint32(0)
      return
    default: {
      const start = w.begin()
      if (type._tag === "Message") encodeMessage(type.message, value, w)
      else if (type._tag === "Wkt") encodeWkt(type.wkt, value, w)
      else encodeWrapper(type.scalar, value, w)
      w.end(start)
    }
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
      return value === 0 || value === BIGINT_ZERO
  }
}

function expected(scalar: ScalarName, value: unknown): never {
  throw new WireError(`expected a protobuf ${scalar}`, value)
}

function toBigInt(type: ScalarLayout, value: unknown): bigint {
  if (typeof value === "bigint") return value
  if (type.asNumber && typeof value === "number" && Number.isSafeInteger(value)) return BigInt(value)
  return expected(type.scalar, value)
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
    case "sint64":
    case "sfixed64": {
      const n = toBigInt(type, value)
      if (n < INT64_MIN || n > INT64_MAX) expected(scalar, value)
      if (scalar === "int64") w.bigVarint(n)
      else if (scalar === "sint64") w.bigVarint((n << BIGINT_ONE) ^ (n >> BIGINT_63))
      else w.fixed64(n)
      return
    }
    case "uint64":
    case "fixed64": {
      const n = toBigInt(type, value)
      if (n < BIGINT_ZERO || n > UINT64_MAX) expected(scalar, value)
      if (scalar === "uint64") w.bigVarint(n)
      else w.fixed64(n)
      return
    }
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

function encodeWkt(wkt: WktName, value: unknown, w: Writer): void {
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
      encodeJsonValue(value, w)
      return
    case "struct":
      encodeJsonStruct(value, w)
      return
    case "listValue":
      encodeJsonList(value, w)
      return
  }
}

function writeSecondsNanos(seconds: bigint, nanos: number, w: Writer): void {
  if (seconds !== BIGINT_ZERO) {
    w.tag(1, WIRE_VARINT)
    w.bigVarint(seconds)
  }
  if (nanos !== 0) {
    w.tag(2, WIRE_VARINT)
    w.int32(nanos)
  }
}

function encodeJsonValue(value: unknown, w: Writer): void {
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
      if (isList) encodeJsonList(value, w)
      else encodeJsonStruct(value, w)
      w.end(start)
      return
    }
  }
  throw new WireError("expected a JSON value", value)
}

function encodeJsonStruct(value: unknown, w: Writer): void {
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
      encodeJsonValue(record[key], w)
    } catch (e) {
      rethrowAt(e, key)
    }
    w.end(start)
    w.end(entry)
  }
}

function encodeJsonList(value: unknown, w: Writer): void {
  if (!Array.isArray(value)) throw new WireError("expected a JSON array", value)
  for (let i = 0; i < value.length; i++) {
    w.tag(1, WIRE_LEN)
    const start = w.begin()
    try {
      encodeJsonValue(value[i], w)
    } catch (e) {
      rethrowAt(e, i)
    }
    w.end(start)
  }
}

// -----------------------------------------------------------------------------
// decode
// -----------------------------------------------------------------------------

function decodeRoot(root: Root, bytes: Uint8Array): unknown {
  if (root._tag === "Void") return root.value
  const r = new Reader(bytes)
  const end = bytes.length
  switch (root._tag) {
    case "Message":
      return decodeMessage(root.message, r, end, undefined, 0, undefined)
    case "Wkt":
      return decodeWkt(root.wkt, r, end, 0)
    case "Wrapper":
      return decodeWrapper(root.scalar, r, end, 0)
    default:
      throw new WireError("unexpected root")
  }
}

// Decodes a message up to `end`, or up to the end group tag of field `group`.
// A message that occurred before is merged into: `previous` is its value.
function decodeMessage(
  message: Message,
  r: Reader,
  end: number,
  previous: unknown,
  depth: number,
  group: number | undefined
): unknown {
  if (depth > MAX_DEPTH) throw new WireError(`nesting deeper than ${MAX_DEPTH}`)
  const acc = accumulator(message, previous)
  let unknown: Array<Uint8Array> | undefined
  let key: PropertyKey | undefined
  try {
    while (true) {
      if (r.pos >= end) {
        if (group !== undefined) throw new WireError("premature end of input")
        break
      }
      const start = r.pos
      const tag = readTag(r)
      const wireType = tag & 7
      const number = tag >>> 3
      if (wireType === WIRE_EGROUP) {
        if (number === group) break
        throw new WireError(`unexpected end group tag for field ${number}`)
      }
      const slot = message.byNumber.get(number)
      if (slot === undefined) {
        key = undefined
        r.skip(wireType, number, depth)
        if (message.unknown !== undefined) (unknown ??= []).push(r.buf.subarray(start, r.pos))
        continue
      }
      if (slot._tag === "Case") {
        const oneof = slot.oneof
        key = oneof.key
        const before = present(oneof.absent, acc[key])
        const merge = before !== undefined && matchCase(oneof, before) === slot
          ? (slot.unwrap === undefined ? before : unwrapCase(slot.unwrap.key, before))
          : undefined
        let value = decodeValue(slot.type, wireType, r, merge, depth, number)
        if (slot.unwrap !== undefined) {
          const member: Record<string, unknown> = {}
          for (const [k, literal] of slot.unwrap.literals) member[k] = literal
          member[slot.unwrap.key] = value
          value = member
        }
        acc[key] = oneof.absent === "none" ? Option.some(value) : value
        continue
      }
      key = slot.kind === "rest" ? undefined : slot.key
      decodeField(slot, acc, wireType, r, depth, number)
    }
    if (group === undefined && r.pos !== end) throw new WireError("field overruns its message")
  } catch (e) {
    rethrowAt(e, key)
  }
  for (const [k, literal] of message.literals) acc[k] = literal
  for (const field of message.fields) {
    if (!(field.key in acc)) fillAbsent(acc, field.key, field.absent, field)
  }
  for (const oneof of message.oneofs) {
    if (!(oneof.key in acc)) fillAbsent(acc, oneof.key, oneof.absent, undefined)
  }
  if (message.unknown !== undefined) {
    const k = message.unknown.key
    if (unknown !== undefined) {
      const before = acc[k]
      acc[k] = concatBytes(before instanceof Uint8Array ? [before, ...unknown] : unknown)
    } else if (!(k in acc) && !message.unknown.optional) {
      acc[k] = new Uint8Array(0)
    }
  }
  return materialize(message, acc)
}

// The slots of a message being decoded, keyed like the message's slots.
function accumulator(message: Message, previous: unknown): Record<PropertyKey, unknown> {
  if (previous === undefined) return {}
  switch (message.shape) {
    case "struct":
      return previous as Record<PropertyKey, unknown>
    case "tuple": {
      const array = previous as ReadonlyArray<unknown>
      const acc: Record<PropertyKey, unknown> = {}
      for (let i = 0; i < Math.min(message.elements, array.length); i++) acc[i] = array[i]
      acc[TUPLE_REST] = array.slice(message.elements)
      return acc
    }
    case "box":
      return { [BOX_VALUE]: previous }
  }
}

function materialize(message: Message, acc: Record<PropertyKey, unknown>): unknown {
  switch (message.shape) {
    case "struct":
      return acc
    case "tuple": {
      const out: Array<unknown> = []
      for (let i = 0; i < message.elements && i in acc; i++) out.push(acc[i])
      const rest = acc[TUPLE_REST]
      if (out.length === message.elements && Array.isArray(rest)) out.push(...rest)
      return out
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
      acc[key] = field!.kind === "repeated" ? [] : field!.kind === "map" ? {} : zeroValue(field!.type)
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

function decodeField(
  field: Field,
  acc: Record<PropertyKey, unknown>,
  wireType: number,
  r: Reader,
  depth: number,
  number: number
): void {
  const key = field.key
  switch (field.kind) {
    case "singular": {
      const before = present(field.absent, acc[key])
      const value = decodeValue(field.type, wireType, r, before, depth, number)
      acc[key] = field.absent === "none" ? Option.some(value) : value
      return
    }
    case "repeated": {
      const before = present(field.absent, acc[key])
      const list = Array.isArray(before) ? before : []
      try {
        if (wireType === WIRE_LEN && isPackable(field.type)) {
          const end = r.delimited()
          while (r.pos < end) list.push(decodePacked(field.type, r))
          if (r.pos !== end) throw new WireError("packed element overruns its field")
        } else {
          list.push(decodeValue(field.type, wireType, r, undefined, depth, number))
        }
      } catch (e) {
        rethrowAt(e, list.length)
      }
      acc[key] = field.absent === "none" ? Option.some(list) : list
      return
    }
    case "map": {
      const before = present(field.absent, acc[key])
      const record = (Predicate.isObject(before) ? before : {}) as Record<string, unknown>
      decodeEntry(field, record, wireType, r, depth)
      acc[key] = field.absent === "none" ? Option.some(record) : record
      return
    }
    case "rest":
      decodeEntry(field, acc, wireType, r, depth)
      return
  }
}

function decodeEntry(
  field: Field,
  target: Record<PropertyKey, unknown>,
  wireType: number,
  r: Reader,
  depth: number
): void {
  expectWireType(wireType, WIRE_LEN)
  const end = r.delimited()
  let k: unknown = undefined
  let value: unknown = undefined
  while (r.pos < end) {
    const tag = readTag(r)
    if (tag >>> 3 === 1) k = decodeScalarField(field.mapKey!, tag & 7, r)
    else if (tag >>> 3 === 2) value = decodeValue(field.type, tag & 7, r, undefined, depth, 2)
    else r.skip(tag & 7, tag >>> 3, depth)
  }
  if (r.pos !== end) throw new WireError("map entry overruns its field")
  target[String(k ?? zeroScalar(field.mapKey!))] = value === undefined ? zeroValue(field.type) : value
}

function expectWireType(actual: number, expected: number): void {
  if (actual !== expected) throw new WireError(`wire type ${actual} does not match the field (expected ${expected})`)
}

function decodePacked(type: ValueLayout, r: Reader): unknown {
  if (type._tag === "Enum") {
    r.varint64()
    return enumValue(type, r.lo | 0)
  }
  return decodeScalar(type as ScalarLayout, r)
}

function decodeValue(
  type: ValueLayout,
  wireType: number,
  r: Reader,
  previous: unknown,
  depth: number,
  number: number
): unknown {
  // Messages are read in either encoding, whichever the field declares.
  if (type._tag === "Message" && wireType === WIRE_SGROUP) {
    return decodeMessage(type.message, r, r.buf.length, mergeTarget(type.message, previous), depth + 1, number)
  }
  expectWireType(wireType, type.wireType)
  switch (type._tag) {
    case "Scalar":
      return decodeScalar(type, r)
    case "Enum":
      r.varint64()
      return enumValue(type, r.lo | 0)
    case "Symbol":
      return Symbol.for(r.string())
    case "Constant":
      r.pos = r.delimited()
      return type.value
    case "Message":
      return decodeMessage(
        type.message,
        r,
        r.delimited(),
        mergeTarget(type.message, previous),
        depth + 1,
        undefined
      )
    case "Wkt":
      return decodeWkt(type.wkt, r, r.delimited(), depth + 1)
    case "Wrapper":
      return decodeWrapper(type.scalar, r, r.delimited(), depth + 1)
  }
}

function mergeTarget(message: Message, previous: unknown): unknown {
  return message.shape !== "struct" || Predicate.isObject(previous) ? previous : undefined
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
      return fromBigInt(type, BigInt.asIntN(64, r.uint64()))
    case "uint64":
      return fromBigInt(type, r.uint64())
    case "sint64": {
      const n = r.uint64()
      return fromBigInt(type, (n >> BIGINT_ONE) ^ -(n & BIGINT_ONE))
    }
    case "fixed64":
      return fromBigInt(type, r.fixed64())
    case "sfixed64":
      return fromBigInt(type, r.sfixed64())
    case "bool":
      r.varint64()
      return r.lo !== 0 || r.hi !== 0
    case "string":
      return r.string()
    case "bytes":
      return r.bytes()
  }
}

function fromBigInt(type: ScalarLayout, n: bigint): unknown {
  if (!type.asNumber) return n
  if (n > BIGINT_MAX_SAFE || n < -BIGINT_MAX_SAFE) {
    throw new WireError(`${type.scalar} value ${n} is outside the safe integer range`)
  }
  return Number(n)
}

function decodeWrapper(scalar: ScalarLayout, r: Reader, end: number, depth: number): unknown {
  let value = zeroScalar(scalar)
  while (r.pos < end) {
    const tag = readTag(r)
    if (tag >>> 3 === 1) value = decodeScalarField(scalar, tag & 7, r)
    else r.skip(tag & 7, tag >>> 3, depth)
  }
  if (r.pos !== end) throw new WireError("field overruns its message")
  return value
}

function decodeWkt(wkt: WktName, r: Reader, end: number, depth: number): unknown {
  if (depth > MAX_DEPTH) throw new WireError(`nesting deeper than ${MAX_DEPTH}`)
  let out: unknown
  switch (wkt) {
    case "timestamp":
    case "date":
    case "duration": {
      let seconds = BIGINT_ZERO
      let nanos = 0
      while (r.pos < end) {
        const tag = readTag(r)
        if (tag === 8) {
          seconds = BigInt.asIntN(64, r.uint64())
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
      out = decodeJsonValue(r, end, depth)
      break
    case "struct":
      out = decodeJsonStruct(r, end, depth)
      break
    case "listValue":
      out = decodeJsonList(r, end, depth)
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

function decodeJsonValue(r: Reader, end: number, depth: number): unknown {
  if (depth > MAX_DEPTH) throw new WireError(`nesting deeper than ${MAX_DEPTH}`)
  let value: unknown = null
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
        value = decodeJsonStruct(r, r.delimited(), depth + 1)
        break
      case 50: // list_value
        value = decodeJsonList(r, r.delimited(), depth + 1)
        break
      default:
        r.skip(tag & 7, tag >>> 3, depth)
    }
  }
  if (r.pos !== end) throw new WireError("field overruns its message")
  return value
}

function decodeJsonStruct(r: Reader, end: number, depth: number): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  while (r.pos < end) {
    const tag = readTag(r)
    if (tag !== 10) {
      r.skip(tag & 7, tag >>> 3, depth)
      continue
    }
    const entryEnd = r.delimited()
    let key = ""
    let value: unknown = null
    while (r.pos < entryEnd) {
      const entryTag = readTag(r)
      if (entryTag === 10) key = r.string()
      else if (entryTag === 18) value = decodeJsonValue(r, r.delimited(), depth + 1)
      else r.skip(entryTag & 7, entryTag >>> 3, depth)
    }
    if (r.pos !== entryEnd) throw new WireError("map entry overruns its field")
    out[key] = value
  }
  if (r.pos !== end) throw new WireError("field overruns its message")
  return out
}

function decodeJsonList(r: Reader, end: number, depth: number): Array<unknown> {
  const out: Array<unknown> = []
  while (r.pos < end) {
    const tag = readTag(r)
    if (tag === 10) out.push(decodeJsonValue(r, r.delimited(), depth + 1))
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
      return decodeMessage(type.message, new Reader(EMPTY), 0, undefined, 0, undefined)
    case "Wkt":
      return decodeWkt(type.wkt, new Reader(EMPTY), 0, 0)
    case "Wrapper":
      return zeroScalar(type.scalar)
    case "Constant":
      return type.value
    case "Symbol":
      return Symbol.for("")
  }
}

const EMPTY = new Uint8Array(0)
