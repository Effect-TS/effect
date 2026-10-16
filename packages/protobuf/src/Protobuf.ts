/**
 * Protocol Buffers codecs derived from Effect schemas.
 *
 * PROTOTYPE — throwaway exploration of a protobuf integration, see the package
 * README. APIs are not stable.
 *
 * **Mapping**
 *
 * The codec is compiled from the encoded side of a schema:
 *
 * | Schema                                 | Protobuf                                  |
 * | -------------------------------------- | ----------------------------------------- |
 * | `Struct` / `Class`                     | `message` (fields need `Protobuf.field`)  |
 * | `String`, `Boolean`, `Uint8Array`      | `string`, `bool`, `bytes`                 |
 * | `Number`                               | `double` (see `Int32`, `Float`, ...)      |
 * | `BigInt`                               | `int64` (see `UInt64`, `SInt64`, ...)     |
 * | `Enum` with numeric members            | `enum`                                    |
 * | `Array(A)`                             | `repeated A`                              |
 * | `Record(String, A)`                    | `map<string, A>`                          |
 * | `optionalKey`, `NullOr`, `Option`      | explicit presence (`optional`)            |
 * | union of numbered members              | `oneof`                                   |
 * | `Literal` property                     | constant, not on the wire                 |
 * | `DateTimeUtc` / `Date`                 | `google.protobuf.Timestamp`               |
 * | `Duration`                             | `google.protobuf.Duration`                |
 * | `Json` / `Unknown`                     | `google.protobuf.Value`                   |
 *
 * Required scalar fields use implicit presence: an absent field decodes to its
 * zero value, and zero values are not written.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import * as SchemaIssue from "effect/SchemaIssue"
import * as SchemaTransformation from "effect/SchemaTransformation"
import {
  EnumKey,
  type FieldAnnotation,
  FieldKey,
  ScalarKey,
  type ScalarType,
  WktKey,
  WrapperKey
} from "./internal/annotations.ts"
import * as Binary from "./internal/binary.ts"
import * as Json from "./internal/json.ts"
import * as Layout from "./internal/layout.ts"

export type {
  /**
   * @stability unstable
   * @since 4.0.0
   */
  ScalarType
} from "./internal/annotations.ts"

// -----------------------------------------------------------------------------
// annotations
// -----------------------------------------------------------------------------

/**
 * Options for {@link field}.
 *
 * @stability unstable
 * @since 4.0.0
 */
export interface FieldOptions {
  /** Proto field name. Defaults to the snake_case property key. */
  readonly name?: string | undefined
  /** JSON name. Defaults to the lowerCamelCase proto name. */
  readonly jsonName?: string | undefined
  /** Packed encoding for repeated scalars. Defaults to `true` (proto3). */
  readonly packed?: boolean | undefined
}

/**
 * Assigns the protobuf field number of a struct property, or the case number
 * of a oneof member.
 *
 * @example
 * ```ts
 * import { Schema } from "effect"
 * import { Protobuf } from "@effect/protobuf"
 *
 * const User = Schema.Struct({
 *   id: Protobuf.UInt64.pipe(Protobuf.field(1)),
 *   name: Schema.String.pipe(Protobuf.field(2))
 * })
 * ```
 *
 * @stability unstable
 * @since 4.0.0
 */
export const field = (number: number, options?: FieldOptions) => {
  const annotation: FieldAnnotation = { number, ...options }
  return <S extends Schema.Top>(self: S): S["Rebuild"] => self.annotateKey({ [FieldKey]: annotation } as any)
}

/**
 * Maps a union of literals to a protobuf enum.
 *
 * @example
 * ```ts
 * import { Schema } from "effect"
 * import { Protobuf } from "@effect/protobuf"
 *
 * const Status = Schema.Literals(["active", "suspended"]).pipe(
 *   Protobuf.enumNumbers({ active: 1, suspended: 2 })
 * )
 * ```
 *
 * @stability unstable
 * @since 4.0.0
 */
export const enumNumbers =
  <const M extends Record<string, number>>(numbers: M) => <S extends Schema.Top>(self: S): S["Rebuild"] =>
    self.annotate({ [EnumKey]: numbers } as any)

/**
 * Wraps a scalar in its `google.protobuf.*Value` wrapper message on the wire.
 *
 * @stability unstable
 * @since 4.0.0
 */
export const wrapper = <S extends Schema.Top>(self: S): S["Rebuild"] => self.annotate({ [WrapperKey]: true } as any)

const scalar = <S extends Schema.Top>(self: S, type: ScalarType, identifier: string): S["Rebuild"] =>
  self.annotate({ [ScalarKey]: type, identifier } as any)

const isInt32 = Schema.isBetween({ minimum: -2147483648, maximum: 2147483647 })
const isUint32 = Schema.isBetween({ minimum: 0, maximum: 4294967295 })
const INT64_MIN = -(BigInt(1) << BigInt(63))
const INT64_MAX = (BigInt(1) << BigInt(63)) - BigInt(1)
const UINT64_MAX = (BigInt(1) << BigInt(64)) - BigInt(1)
const isInt64 = Schema.isBetweenBigInt({ minimum: INT64_MIN, maximum: INT64_MAX })
const isUint64 = Schema.isBetweenBigInt({ minimum: BigInt(0), maximum: UINT64_MAX })

// -----------------------------------------------------------------------------
// scalars
// -----------------------------------------------------------------------------

/**
 * `double`. Same as `Schema.Number`, which maps to `double` by default.
 *
 * @stability unstable
 * @since 4.0.0
 */
export const Double = scalar(Schema.Number, "double", "Protobuf.Double")

/**
 * `float` (32-bit, precision is lost on the wire).
 *
 * @stability unstable
 * @since 4.0.0
 */
export const Float = scalar(Schema.Number, "float", "Protobuf.Float")

/**
 * `int32`.
 *
 * @stability unstable
 * @since 4.0.0
 */
export const Int32 = scalar(Schema.Int.check(isInt32), "int32", "Protobuf.Int32")

/**
 * `uint32`.
 *
 * @stability unstable
 * @since 4.0.0
 */
export const UInt32 = scalar(Schema.Int.check(isUint32), "uint32", "Protobuf.UInt32")

/**
 * `sint32` (zigzag, efficient for negative values).
 *
 * @stability unstable
 * @since 4.0.0
 */
export const SInt32 = scalar(Schema.Int.check(isInt32), "sint32", "Protobuf.SInt32")

/**
 * `fixed32`.
 *
 * @stability unstable
 * @since 4.0.0
 */
export const Fixed32 = scalar(Schema.Int.check(isUint32), "fixed32", "Protobuf.Fixed32")

/**
 * `sfixed32`.
 *
 * @stability unstable
 * @since 4.0.0
 */
export const SFixed32 = scalar(Schema.Int.check(isInt32), "sfixed32", "Protobuf.SFixed32")

/**
 * `int64` as `bigint`. Same as `Schema.BigInt` (plus the range check).
 *
 * @stability unstable
 * @since 4.0.0
 */
export const Int64 = scalar(Schema.BigInt.check(isInt64), "int64", "Protobuf.Int64")

/**
 * `uint64` as `bigint`.
 *
 * @stability unstable
 * @since 4.0.0
 */
export const UInt64 = scalar(Schema.BigInt.check(isUint64), "uint64", "Protobuf.UInt64")

/**
 * `sint64` as `bigint`.
 *
 * @stability unstable
 * @since 4.0.0
 */
export const SInt64 = scalar(Schema.BigInt.check(isInt64), "sint64", "Protobuf.SInt64")

/**
 * `fixed64` as `bigint`.
 *
 * @stability unstable
 * @since 4.0.0
 */
export const Fixed64 = scalar(Schema.BigInt.check(isUint64), "fixed64", "Protobuf.Fixed64")

/**
 * `sfixed64` as `bigint`.
 *
 * @stability unstable
 * @since 4.0.0
 */
export const SFixed64 = scalar(Schema.BigInt.check(isInt64), "sfixed64", "Protobuf.SFixed64")

/**
 * `int64` as a JS `number` (like `[jstype = JS_NUMBER]`); values must be safe
 * integers.
 *
 * @stability unstable
 * @since 4.0.0
 */
export const Int64Number = scalar(Schema.Int, "int64", "Protobuf.Int64Number")

/**
 * `uint64` as a JS `number`; values must be safe integers.
 *
 * @stability unstable
 * @since 4.0.0
 */
export const UInt64Number = scalar(
  Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  "uint64",
  "Protobuf.UInt64Number"
)

/**
 * A string map key carrying a non-string protobuf key type, for map keys that
 * JS cannot represent as numbers (64-bit integers and `bool`). The key stays a
 * string in the JS object.
 *
 * Maps with 32-bit integer keys can use `Protobuf.Int32` (and friends) as the
 * record key directly.
 *
 * @example
 * ```ts
 * import { Schema } from "effect"
 * import { Protobuf } from "@effect/protobuf"
 *
 * // map<int64, string>
 * const ById = Schema.Record(Protobuf.mapKey("int64"), Schema.String)
 * ```
 *
 * @stability unstable
 * @since 4.0.0
 */
export const mapKey = (type: "int64" | "uint64" | "sint64" | "fixed64" | "sfixed64" | "bool") =>
  Schema.String.annotate({ [ScalarKey]: type } as any)

// -----------------------------------------------------------------------------
// well-known types
// -----------------------------------------------------------------------------

/**
 * `google.protobuf.Timestamp`. Same as `Schema.DateTimeUtc`. Precision is
 * limited to milliseconds.
 *
 * @stability unstable
 * @since 4.0.0
 */
export const Timestamp = Schema.DateTimeUtc

/**
 * `google.protobuf.Duration`. Same as `Schema.Duration`.
 *
 * @stability unstable
 * @since 4.0.0
 */
export const Duration = Schema.Duration

/**
 * `google.protobuf.Empty`.
 *
 * @stability unstable
 * @since 4.0.0
 */
export const Empty = Schema.Struct({}).annotate({ identifier: "google.protobuf.Empty" })

/**
 * `google.protobuf.Value`. Same as `Schema.Json`.
 *
 * @stability unstable
 * @since 4.0.0
 */
export const Value = Schema.Json

/**
 * `google.protobuf.Struct`, a JSON object.
 *
 * @stability unstable
 * @since 4.0.0
 */
export const Struct = Schema.Record(Schema.String, Schema.Json).annotate(
  { identifier: "google.protobuf.Struct", [WktKey]: "struct" } as any
)

/**
 * `google.protobuf.ListValue`, a JSON array.
 *
 * @stability unstable
 * @since 4.0.0
 */
export const ListValue = Schema.Array(Schema.Json).annotate(
  { identifier: "google.protobuf.ListValue", [WktKey]: "listValue" } as any
)

/**
 * `google.protobuf.StringValue`.
 *
 * @stability unstable
 * @since 4.0.0
 */
export const StringValue = wrapper(Schema.String)

/**
 * `google.protobuf.BoolValue`.
 *
 * @stability unstable
 * @since 4.0.0
 */
export const BoolValue = wrapper(Schema.Boolean)

/**
 * `google.protobuf.BytesValue`.
 *
 * @stability unstable
 * @since 4.0.0
 */
export const BytesValue = wrapper(Schema.Uint8Array)

/**
 * `google.protobuf.DoubleValue`.
 *
 * @stability unstable
 * @since 4.0.0
 */
export const DoubleValue = wrapper(Double)

/**
 * `google.protobuf.FloatValue`.
 *
 * @stability unstable
 * @since 4.0.0
 */
export const FloatValue = wrapper(Float)

/**
 * `google.protobuf.Int32Value`.
 *
 * @stability unstable
 * @since 4.0.0
 */
export const Int32Value = wrapper(Int32)

/**
 * `google.protobuf.UInt32Value`.
 *
 * @stability unstable
 * @since 4.0.0
 */
export const UInt32Value = wrapper(UInt32)

/**
 * `google.protobuf.Int64Value`.
 *
 * @stability unstable
 * @since 4.0.0
 */
export const Int64Value = wrapper(Int64)

/**
 * `google.protobuf.UInt64Value`.
 *
 * @stability unstable
 * @since 4.0.0
 */
export const UInt64Value = wrapper(UInt64)

/**
 * `google.protobuf.Any`. Binary only: the JSON mapping of `Any` needs a type
 * registry, which the prototype does not have.
 *
 * @stability unstable
 * @since 4.0.0
 */
export const Any = Schema.Struct({
  typeUrl: Schema.String.pipe(field(1)),
  value: Schema.Uint8Array.pipe(field(2))
}).annotate({ identifier: "google.protobuf.Any" })

// -----------------------------------------------------------------------------
// codecs
// -----------------------------------------------------------------------------

/**
 * The binary codec type returned by {@link toCodec}.
 *
 * @stability unstable
 * @since 4.0.0
 */
export interface toCodec<S extends Schema.Top>
  extends Schema.Codec<S["Type"], Uint8Array<ArrayBuffer>, S["DecodingServices"], S["EncodingServices"]>
{}

/**
 * The JSON codec type returned by {@link toCodecJson}.
 *
 * @stability unstable
 * @since 4.0.0
 */
export interface toCodecJson<S extends Schema.Top>
  extends Schema.Codec<S["Type"], Schema.Json, S["DecodingServices"], S["EncodingServices"]>
{}

const wrap = <A>(f: () => A, input: unknown): Effect.Effect<A, SchemaIssue.Issue> => {
  try {
    return Effect.succeed(f())
  } catch (e) {
    if (e instanceof Layout.LayoutError) return Effect.die(e)
    return Effect.fail(new SchemaIssue.InvalidValue({ message: e instanceof Error ? e.message : String(e) }, input))
  }
}

const binaryCache = new WeakMap<Schema.Top, Schema.Top>()
const jsonCache = new WeakMap<Schema.Top, Schema.Top>()

/**
 * Derives a protobuf binary codec. The root schema must be a struct (message)
 * or `Void` (an empty message).
 *
 * Layout errors (for example a property without a field number) are thrown
 * when the codec is created.
 *
 * @example
 * ```ts
 * import { Schema } from "effect"
 * import { Protobuf } from "@effect/protobuf"
 *
 * const User = Schema.Struct({
 *   id: Protobuf.UInt64.pipe(Protobuf.field(1)),
 *   name: Schema.String.pipe(Protobuf.field(2))
 * })
 *
 * const codec = Protobuf.toCodec(User)
 * const bytes = Schema.encodeSync(codec)({ id: 1n, name: "Ada" })
 * ```
 *
 * @stability unstable
 * @since 4.0.0
 */
export const toCodec = <S extends Schema.Top>(schema: S): toCodec<S> => {
  const cached = binaryCache.get(schema)
  if (cached) return cached as any
  const root = Layout.compileRoot(schema.ast)
  const codec = (Schema.Uint8Array as unknown as Schema.Codec<Uint8Array<ArrayBuffer>>).pipe(
    Schema.decodeTo(
      schema as any,
      SchemaTransformation.transformEffect<unknown, Uint8Array<ArrayBuffer>>({
        decode: (bytes) => wrap(() => Binary.decodeRoot(root, bytes), bytes),
        encode: (value) => wrap(() => Binary.encodeRoot(root, value), value)
      })
    )
  )
  binaryCache.set(schema, codec)
  return codec as any
}

/**
 * Derives a codec for the proto3 canonical JSON mapping (field names in
 * lowerCamelCase, 64-bit integers as strings, enums by name, bytes as base64,
 * well-known types in their special forms).
 *
 * Unknown JSON fields are ignored.
 *
 * @stability unstable
 * @since 4.0.0
 */
export const toCodecJson = <S extends Schema.Top>(schema: S): toCodecJson<S> => {
  const cached = jsonCache.get(schema)
  if (cached) return cached as any
  const root = Layout.compileRoot(schema.ast)
  const codec = Schema.Json.pipe(
    Schema.decodeTo(
      schema as any,
      SchemaTransformation.transformEffect<unknown, Schema.Json>({
        decode: (json) => wrap(() => Json.decodeRootJson(root, json), json),
        encode: (value) => wrap(() => Json.encodeRootJson(root, value) as Schema.Json, value)
      })
    )
  )
  jsonCache.set(schema, codec)
  return codec as any
}

/**
 * Checks that a schema can be laid out as a protobuf message, throwing a
 * descriptive error otherwise.
 *
 * @stability unstable
 * @since 4.0.0
 */
export const validate = (schema: Schema.Top): void => {
  Layout.compileRoot(schema.ast)
}

/**
 * Returns the full protobuf type name of a message schema (its `identifier`
 * annotation), if any.
 *
 * @stability unstable
 * @since 4.0.0
 */
export const typeName = (schema: Schema.Top): string | undefined => {
  const root = Layout.compileRoot(schema.ast)
  return root._ === "void" ? "google.protobuf.Empty" : root.desc.typeName
}

