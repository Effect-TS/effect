/**
 * @since 1.0.0
 */

import type { Chunk } from "@fp-ts/data/Chunk"
import { identity, pipe } from "@fp-ts/data/Function"
import type { Json, JsonArray, JsonObject } from "@fp-ts/data/Json"
import { parse as parseJSON, stringify as stringifyJSON } from "@fp-ts/data/Json"
import type { Option } from "@fp-ts/data/Option"
import type { Arbitrary } from "@fp-ts/schema/Arbitrary"
import * as A from "@fp-ts/schema/Arbitrary"
import * as DataChunk from "@fp-ts/schema/data/Chunk"
import * as DataOption from "@fp-ts/schema/data/Option"
import * as DataReadonlySet from "@fp-ts/schema/data/ReadonlySet"
import type { UnknownArray } from "@fp-ts/schema/data/UnknownArray"
import type { UnknownObject } from "@fp-ts/schema/data/UnknownObject"
import type { Decoder } from "@fp-ts/schema/Decoder"
import type { Guard } from "@fp-ts/schema/Guard"
import * as G from "@fp-ts/schema/Guard"
import type { JsonDecoder } from "@fp-ts/schema/JsonDecoder"
import * as JD from "@fp-ts/schema/JsonDecoder"
import type { JsonEncoder } from "@fp-ts/schema/JsonEncoder"
import * as JE from "@fp-ts/schema/JsonEncoder"
import type { Pretty } from "@fp-ts/schema/Pretty"
import * as P from "@fp-ts/schema/Pretty"
import type { Provider } from "@fp-ts/schema/Provider"
import { empty } from "@fp-ts/schema/Provider"
import type { Schema } from "@fp-ts/schema/Schema"
import * as S from "@fp-ts/schema/Schema"

/**
 * @since 1.0.0
 */
export interface JsonCodec<in out A>
  extends Schema<A>, JsonDecoder<A>, JsonEncoder<A>, Guard<A>, Arbitrary<A>, Pretty<A>
{
  readonly parseOrThrow: (text: string) => A
  readonly stringify: (value: A) => string
  readonly of: (value: A) => A
}

export {
  /**
   * @since 1.0.0
   */
  Infer
} from "@fp-ts/schema/Schema"

// ---------------------------------------------
// constructors
// ---------------------------------------------

/**
 * @since 1.0.0
 */
export const make = <A>(
  schema: Schema<A>,
  decode: JsonDecoder<A>["decode"],
  encode: JsonEncoder<A>["encode"],
  is: Guard<A>["is"],
  arbitrary: Arbitrary<A>["arbitrary"],
  pretty: Pretty<A>["pretty"]
): JsonCodec<A> =>
  ({
    ast: schema.ast,
    decode,
    encode,
    is,
    arbitrary,
    pretty,
    parseOrThrow: (text: string) => {
      const json = parseJSON(text)
      if (json._tag === "Left") {
        throw new Error(`Cannot parse JSON from: ${text}`)
      }
      const result = decode(json.right)
      if (result._tag === "Right") {
        return result.right
      }
      throw new Error(
        `Cannot parse object, errors: ${result.left.map((_) => JSON.stringify(_)).join(", ")}`
      )
    },
    stringify: (value: A) => {
      const str = stringifyJSON(encode(value))
      if (str._tag === "Left") {
        throw new Error(`Cannot encode JSON, error: ${String(str.left)}`)
      }
      return str.right
    },
    of: identity
  }) as any

/**
 * @since 1.0.0
 */
export const provideJsonCodecFor = (provider: Provider) => {
  const jsonDecoderFor = JD.provideJsonDecoderFor(provider)
  const jsonEncoderFor = JE.provideJsonEncoderFor(provider)
  const guardFor = G.provideGuardFor(provider)
  const arbitraryFor = A.provideArbitraryFor(provider)
  const prettyFor = P.providePrettyFor(provider)
  return <A>(schema: Schema<A>): JsonCodec<A> =>
    make(
      schema,
      jsonDecoderFor(schema).decode,
      jsonEncoderFor(schema).encode,
      guardFor(schema).is,
      arbitraryFor(schema).arbitrary,
      prettyFor(schema).pretty
    )
}

/**
 * @since 1.0.0
 */
export const jsonCodecFor: <A>(schema: Schema<A>) => JsonCodec<A> = provideJsonCodecFor(empty)

/**
 * @since 1.0.0
 */
export const literal = <A extends ReadonlyArray<string | number | boolean | null | undefined>>(
  ...a: A
): JsonCodec<A[number]> => jsonCodecFor(S.literal(...a))

/**
 * @since 1.0.0
 */
export const nativeEnum = <A extends { [_: string]: string | number }>(
  nativeEnum: A
): JsonCodec<A> => jsonCodecFor(S.nativeEnum(nativeEnum))

// ---------------------------------------------
// filters
// ---------------------------------------------

/**
 * @since 1.0.0
 */
export const minLength = (minLength: number) =>
  <A extends { length: number }>(self: Schema<A>): JsonCodec<A> =>
    jsonCodecFor(S.minLength(minLength)(self))

/**
 * @since 1.0.0
 */
export const maxLength = (maxLength: number) =>
  <A extends { length: number }>(self: Schema<A>): JsonCodec<A> =>
    jsonCodecFor(S.maxLength(maxLength)(self))

/**
 * @since 1.0.0
 */
export const min = (min: number) =>
  <A extends number>(self: Schema<A>): JsonCodec<A> => jsonCodecFor(S.min(min)(self))

/**
 * @since 1.0.0
 */
export const max = (max: number) =>
  <A extends number>(self: Schema<A>): JsonCodec<A> => jsonCodecFor(S.max(max)(self))

// ---------------------------------------------
// combinators
// ---------------------------------------------

/**
 * @since 1.0.0
 */
export const union = <Members extends ReadonlyArray<Schema<any>>>(
  ...members: Members
): JsonCodec<S.Infer<Members[number]>> => jsonCodecFor(S.union(...members))

/**
 * @since 1.0.0
 */
export const keyof = <A>(schema: Schema<A>): JsonCodec<keyof A> => jsonCodecFor(S.keyof(schema))

/**
 * @since 1.0.0
 */
export const tuple = <Components extends ReadonlyArray<Schema<any>>>(
  ...components: Components
): JsonCodec<{ readonly [K in keyof Components]: S.Infer<Components[K]> }> =>
  jsonCodecFor(S.tuple<Components>(...components))

/**
 * @since 1.0.0
 */
export const withRest = <R>(rest: Schema<R>) =>
  <A extends ReadonlyArray<any>>(self: Schema<A>): Schema<readonly [...A, ...Array<R>]> =>
    jsonCodecFor(S.withRest(rest)(self))

/**
 * @since 1.0.0
 */
export const array = <A>(item: Schema<A>): JsonCodec<ReadonlyArray<A>> =>
  jsonCodecFor(S.array(item))

/**
 * @since 1.0.0
 */
export const nonEmptyArray = <A>(
  item: Schema<A>
): JsonCodec<readonly [A, ...Array<A>]> => jsonCodecFor(S.nonEmptyArray(item))

/**
 * @since 1.0.0
 */
export const struct: {
  <Required extends Record<PropertyKey, Schema<any>>>(
    required: Required
  ): JsonCodec<{ readonly [K in keyof Required]: S.Infer<Required[K]> }>
  <
    Required extends Record<PropertyKey, Schema<any>>,
    Optional extends Record<PropertyKey, Schema<any>>
  >(
    required: Required,
    optional: Optional
  ): JsonCodec<
    S.Spread<
      & { readonly [K in keyof Required]: S.Infer<Required[K]> }
      & { readonly [K in keyof Optional]?: S.Infer<Optional[K]> }
    >
  >
} = <
  Required extends Record<PropertyKey, Schema<any>>,
  Optional extends Record<PropertyKey, Schema<any>>
>(
  required: Required,
  optional?: Optional
): JsonCodec<
  S.Spread<
    & { readonly [K in keyof Required]: S.Infer<Required[K]> }
    & { readonly [K in keyof Optional]?: S.Infer<Optional[K]> }
  >
> => jsonCodecFor(S.struct(required, optional || {}))

/**
 * @since 1.0.0
 */
export const pick = <A, Keys extends ReadonlyArray<keyof A>>(...keys: Keys) =>
  (self: Schema<A>): JsonCodec<{ readonly [P in Keys[number]]: A[P] }> =>
    jsonCodecFor(pipe(self, S.pick(...keys)))

/**
 * @since 1.0.0
 */
export const omit = <A, Keys extends ReadonlyArray<keyof A>>(...keys: Keys) =>
  (self: Schema<A>): JsonCodec<{ readonly [P in Exclude<keyof A, Keys[number]>]: A[P] }> =>
    jsonCodecFor(pipe(self, S.omit(...keys)))

/**
 * @since 1.0.0
 */
export const partial = <A>(self: Schema<A>): JsonCodec<Partial<A>> => jsonCodecFor(S.partial(self))

/**
 * @since 1.0.0
 */
export const stringIndexSignature = <A>(value: Schema<A>): JsonCodec<{ readonly [_: string]: A }> =>
  jsonCodecFor(S.symbolIndexSignature(value))

/**
 * @since 1.0.0
 */
export const symbolIndexSignature = <A>(value: Schema<A>): JsonCodec<{ readonly [_: symbol]: A }> =>
  jsonCodecFor(S.symbolIndexSignature(value))

/**
 * @since 1.0.0
 */
export const extend = <B>(
  that: Schema<B>
) => <A>(self: Schema<A>): JsonCodec<A & B> => jsonCodecFor(S.extend(that)(self))

/**
 * @since 1.0.0
 */
export const lazy = <A>(f: () => Schema<A>): JsonCodec<A> => jsonCodecFor(S.lazy(f))

/**
 * @since 1.0.0
 */
export const filter = <A>(
  id: symbol,
  decode: Decoder<A, A>["decode"]
) => (schema: Schema<A>): JsonCodec<A> => jsonCodecFor(S.filter(id, decode)(schema))

/**
 * @since 1.0.0
 */
export const filterWith = <Config, A>(
  id: symbol,
  decode: (config: Config) => Decoder<A, A>["decode"]
) =>
  (config: Config) =>
    (schema: Schema<A>): JsonCodec<A> => jsonCodecFor(S.filterWith(id, decode)(config)(schema))

/**
 * @since 1.0.0
 */
export const refine = <A, B extends A>(
  id: symbol,
  decode: Decoder<A, B>["decode"]
) => (schema: Schema<A>): JsonCodec<B> => jsonCodecFor(S.refine(id, decode)(schema))

// ---------------------------------------------
// data
// ---------------------------------------------

/**
 * @since 1.0.0
 */
export const string: JsonCodec<string> = jsonCodecFor(S.string)

/**
 * @since 1.0.0
 */
export const number: JsonCodec<number> = jsonCodecFor(S.number)

/**
 * @since 1.0.0
 */
export const boolean: JsonCodec<boolean> = jsonCodecFor(S.boolean)

/**
 * @since 1.0.0
 */
export const bigint: JsonCodec<bigint> = jsonCodecFor(S.bigint)

/**
 * @since 1.0.0
 */
export const unknown: JsonCodec<unknown> = jsonCodecFor(S.unknown)

/**
 * @since 1.0.0
 */
export const unknownArray: JsonCodec<UnknownArray> = jsonCodecFor(S.unknownArray)

/**
 * @since 1.0.0
 */
export const unknownObject: JsonCodec<UnknownObject> = jsonCodecFor(S.unknownObject)

/**
 * @since 1.0.0
 */
export const any: JsonCodec<any> = jsonCodecFor(S.any)

/**
 * @since 1.0.0
 */
export const never: JsonCodec<never> = jsonCodecFor(S.never)

/**
 * @since 1.0.0
 */
export const json: JsonCodec<Json> = jsonCodecFor(S.json)

/**
 * @since 1.0.0
 */
export const jsonArray: JsonCodec<JsonArray> = jsonCodecFor(S.jsonArray)

/**
 * @since 1.0.0
 */
export const jsonObject: JsonCodec<JsonObject> = jsonCodecFor(S.jsonObject)

/**
 * @since 1.0.0
 */
export const option = <A>(value: Schema<A>): JsonCodec<Option<A>> =>
  jsonCodecFor(DataOption.schema(value))

/**
 * @since 1.0.0
 */
export const chunk = <A>(value: Schema<A>): JsonCodec<Chunk<A>> =>
  jsonCodecFor(DataChunk.schema(value))

/**
 * @since 1.0.0
 */
export const readonlySet: <A>(schema: Schema<A>) => JsonCodec<ReadonlySet<A>> = (schema) =>
  jsonCodecFor(DataReadonlySet.schema(schema))
