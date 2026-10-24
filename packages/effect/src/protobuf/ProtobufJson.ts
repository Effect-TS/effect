/**
 * The protobuf JSON mapping (ProtoJSON) of protobuf schemas, the JSON that
 * Connect, gRPC transcoding, and the protobuf runtimes of other languages read
 * and write.
 *
 * **Mental model**
 *
 * `ProtobufJson.toCodec` derives a codec from the same schemas as
 * `Protobuf.toCodec`: a message decoded from JSON is the message decoded from
 * its bytes. The codec reads and writes JSON values; compose it with
 * `Schema.fromJsonString` for JSON text.
 *
 * Output is canonical: fields in field-number order under their JSON names,
 * without fields that hold their default value. Input is as lenient as the
 * specification asks: a field under its JSON name or its name in the `.proto`
 * file, `null` for an unset field, and 64-bit integers as numbers or strings.
 *
 * | protobuf                            | JSON                                         |
 * | ----------------------------------- | -------------------------------------------- |
 * | 32-bit integers, `double`, `float`  | number; `"NaN"`, `"Infinity"`, `"-Infinity"` |
 * | 64-bit integers                     | decimal string                               |
 * | `bytes`                             | base64 string                                |
 * | enum                                | value name, or number                        |
 * | oneof                               | the key of its case                          |
 * | `Timestamp`                         | RFC 3339 string, such as `"2026-01-01T00:00:00Z"` |
 * | `Duration`                          | seconds, such as `"1.5s"`                    |
 * | `FieldMask`                         | comma-separated paths in lowerCamelCase      |
 * | `Struct`, `Value`, `ListValue`      | JSON object, value, and array                |
 * | wrappers, such as `StringValue`     | the value                                    |
 * | `Any`                               | object with `"@type"`                        |
 * | extensions                          | `"[full.name]"` keys                         |
 *
 * **Gotchas**
 *
 * - JSON cannot hold unknown fields: encoding drops them, and decoding fails
 *   for keys that the message does not declare, unless `ignoreUnknownFields`
 *   is set.
 * - `Any` values and extensions need the `registry` that holds their schemas.
 *
 * @stability experimental
 * @since 4.0.7
 */
import type * as Schema from "../Schema.ts"
import * as Compile from "./internal/compile.ts"
import * as Json from "./internal/json.ts"
import type * as Layout from "./internal/layout.ts"
import * as Transform from "./internal/transform.ts"
import type * as Protobuf from "./Protobuf.ts"

/**
 * The options of {@link toCodec}.
 *
 * @stability experimental
 * @category models
 * @since 4.0.7
 */
export interface Options {
  /**
   * Writes the fields without presence that hold their default value, such
   * as `0`, `""`, `[]`, and `{}`.
   *
   * @default false
   */
  readonly alwaysEmitImplicit?: boolean | undefined
  /**
   * Writes enum values as their numbers rather than their names.
   *
   * @default false
   */
  readonly enumAsInteger?: boolean | undefined
  /**
   * Writes field names as in the `.proto` file, such as `user_id`, rather than
   * their JSON names.
   *
   * @default false
   */
  readonly useProtoFieldName?: boolean | undefined
  /**
   * Skips the keys of fields that a message does not declare, and enum value
   * names that an enum does not have, rather than failing to decode.
   *
   * @default false
   */
  readonly ignoreUnknownFields?: boolean | undefined
  /**
   * The messages that `google.protobuf.Any` values hold, and the extensions to
   * read and write as `"[full.name]"` keys.
   */
  readonly registry?: Protobuf.Registry | undefined
}

/**
 * The codec type returned by {@link toCodec}.
 *
 * @stability experimental
 * @category models
 * @since 4.0.7
 */
export interface toCodec<S extends Schema.Constraint> extends
  Schema.Codec<
    S["Type"],
    Schema.Json,
    S["DecodingServices"],
    S["EncodingServices"]
  >
{}

/**
 * Derives a protobuf JSON codec from a schema.
 *
 * **Details**
 *
 * The root schema is a message, as for `Protobuf.toCodec`. Derived codecs are
 * memoized by schema identity and options.
 *
 * **Gotchas**
 *
 * - Layout errors throw when the codec is created.
 * - Malformed input fails to decode with a `Schema.SchemaError`, as does a
 *   value the schema rejects.
 *
 * **Example** (Encoding and decoding a message)
 *
 * ```ts import.meta.vitest
 * import { Schema } from "effect"
 * import { Protobuf, ProtobufJson } from "effect/protobuf"
 *
 * // message User { uint64 id = 1; string display_name = 2; }
 * const User = Protobuf.Message("acme.v1.User", {
 *   id: Protobuf.UInt64.pipe(Protobuf.field(1)),
 *   displayName: Schema.String.pipe(Protobuf.field(2))
 * })
 *
 * const codec = ProtobufJson.toCodec(User)
 * Schema.encodeSync(codec)({ id: 1n, displayName: "Ada" }) // => { id: "1", displayName: "Ada" }
 * Schema.decodeSync(codec)({ id: 1, display_name: "Ada" }) // => { id: 1n, displayName: "Ada" }
 *
 * // JSON text
 * Schema.encodeSync(Schema.fromJsonString(codec))({ id: 2n, displayName: "" }) // => "{\"id\":\"2\"}"
 * ```
 *
 * @stability experimental
 * @category constructors
 * @since 4.0.7
 */
export const toCodec = <S extends Schema.Constraint>(schema: S, options?: Options): toCodec<S> => {
  const registry = options?.registry
  let bySchema = codecCache
  if (registry !== undefined) {
    bySchema = registryCodecCache.get(registry) ?? new WeakMap()
    registryCodecCache.set(registry, bySchema)
  }
  let byOptions = bySchema.get(schema)
  if (byOptions === undefined) {
    byOptions = new Map()
    bySchema.set(schema, byOptions)
  }
  const jsonOptions: Json.Options = {
    alwaysEmitImplicit: options?.alwaysEmitImplicit === true,
    enumAsInteger: options?.enumAsInteger === true,
    useProtoFieldName: options?.useProtoFieldName === true,
    ignoreUnknownFields: options?.ignoreUnknownFields === true,
    resolver: registry === undefined ? undefined : resolver(registry)
  }
  const key = `${+jsonOptions.alwaysEmitImplicit}${+jsonOptions.enumAsInteger}${+jsonOptions
    .useProtoFieldName}${+jsonOptions.ignoreUnknownFields}`
  const cached = byOptions.get(key)
  if (cached !== undefined) return cached
  const out = Transform.derive(
    Transform.Json,
    schema,
    Json.makeCodec(rootOf(schema), jsonOptions)
  ) as unknown as toCodec<S>
  byOptions.set(key, out)
  return out
}

// Codecs by schema, and by the options other than the registry.
const codecCache = new WeakMap<Schema.Constraint, Map<string, toCodec<any>>>()
const registryCodecCache = new WeakMap<Protobuf.Registry, WeakMap<Schema.Constraint, Map<string, toCodec<any>>>>()
const roots = new WeakMap<Schema.Constraint, Layout.Root>()

const rootOf = (schema: Schema.Constraint): Layout.Root => {
  let root = roots.get(schema)
  if (root === undefined) {
    root = Compile.compile(schema.ast)
    roots.set(schema, root)
  }
  return root
}

const resolvers = new WeakMap<Protobuf.Registry, Json.Resolver>()

const resolver = (registry: Protobuf.Registry): Json.Resolver => {
  let out = resolvers.get(registry)
  if (out === undefined) {
    const extensions = new Map<string, ReadonlyArray<Json.Extension>>()
    out = {
      message: (name) => {
        const schema = registry.messages.get(name)
        return schema === undefined ? undefined : rootOf(schema)
      },
      extensions: (message) => {
        let list = extensions.get(message)
        if (list === undefined) {
          const named: Array<Json.Extension> = []
          for (const extension of registry.extensions.get(message) ?? []) {
            if (extension.name === undefined || extension.messageSet) continue
            named.push({ name: extension.name, layout: extension.layout as Layout.MessageType })
          }
          list = named
          extensions.set(message, list)
        }
        return list
      }
    }
    resolvers.set(registry, out)
  }
  return out
}
