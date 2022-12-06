/**
 * @since 1.0.0
 */

import type { Chunk } from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import type { Json, JsonArray, JsonObject } from "@fp-ts/data/Json"
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
import type { Pretty } from "@fp-ts/schema/Pretty"
import * as P from "@fp-ts/schema/Pretty"
import type { Provider } from "@fp-ts/schema/Provider"
import { empty } from "@fp-ts/schema/Provider"
import type { Schema } from "@fp-ts/schema/Schema"
import * as S from "@fp-ts/schema/Schema"
import type { UnknownDecoder } from "@fp-ts/schema/UnknownDecoder"
import * as UD from "@fp-ts/schema/UnknownDecoder"
import type { UnknownEncoder } from "@fp-ts/schema/UnknownEncoder"
import * as UE from "@fp-ts/schema/UnknownEncoder"

/**
 * @since 1.0.0
 */
export interface UnknownCodec<in out A>
  extends Schema<A>, UnknownDecoder<A>, UnknownEncoder<A>, Guard<A>, Arbitrary<A>, Pretty<A>
{}

export {
  /**
   * @since 1.0.0
   */ Infer
} from "@fp-ts/schema/Schema"

// ---------------------------------------------
// constructors
// ---------------------------------------------

/**
 * @since 1.0.0
 */
export const make = <A>(
  schema: Schema<A>,
  decode: UnknownDecoder<A>["decode"],
  encode: UnknownEncoder<A>["encode"],
  is: Guard<A>["is"],
  arbitrary: Arbitrary<A>["arbitrary"],
  pretty: Pretty<A>["pretty"]
): UnknownCodec<A> => ({ ast: schema.ast, decode, encode, is, arbitrary, pretty }) as any

/**
 * @since 1.0.0
 */
export const provideUnknownCodecFor = (provider: Provider) => {
  const unknownDecoderFor = UD.provideUnknownDecoderFor(provider)
  const unknownEncoderFor = UE.provideUnknownEncoderFor(provider)
  const guardFor = G.provideGuardFor(provider)
  const arbitraryFor = A.provideArbitraryFor(provider)
  const prettyFor = P.providePrettyFor(provider)
  return <A>(schema: Schema<A>): UnknownCodec<A> =>
    make(
      schema,
      unknownDecoderFor(schema).decode,
      unknownEncoderFor(schema).encode,
      guardFor(schema).is,
      arbitraryFor(schema).arbitrary,
      prettyFor(schema).pretty
    )
}

/**
 * @since 1.0.0
 */
export const unknownCodecFor: <A>(schema: Schema<A>) => UnknownCodec<A> = provideUnknownCodecFor(
  empty
)

/**
 * @since 1.0.0
 */
export const literal = <A extends ReadonlyArray<string | number | boolean | null | undefined>>(
  ...a: A
): UnknownCodec<A[number]> => unknownCodecFor(S.literal(...a))

/**
 * @since 1.0.0
 */
export const nativeEnum = <A extends { [_: string]: string | number }>(
  nativeEnum: A
): UnknownCodec<A> => unknownCodecFor(S.nativeEnum(nativeEnum))

// ---------------------------------------------
// filters
// ---------------------------------------------

/**
 * @since 1.0.0
 */
export const minLength = (minLength: number) =>
  <A extends { length: number }>(self: Schema<A>): UnknownCodec<A> =>
    unknownCodecFor(S.minLength(minLength)(self))

/**
 * @since 1.0.0
 */
export const maxLength = (maxLength: number) =>
  <A extends { length: number }>(self: Schema<A>): UnknownCodec<A> =>
    unknownCodecFor(S.maxLength(maxLength)(self))

/**
 * @since 1.0.0
 */
export const min = (min: number) =>
  <A extends number>(self: Schema<A>): UnknownCodec<A> => unknownCodecFor(S.min(min)(self))

/**
 * @since 1.0.0
 */
export const max = (max: number) =>
  <A extends number>(self: Schema<A>): UnknownCodec<A> => unknownCodecFor(S.max(max)(self))

// ---------------------------------------------
// combinators
// ---------------------------------------------

/**
 * @since 1.0.0
 */
export const union = <Members extends ReadonlyArray<Schema<any>>>(
  ...members: Members
): UnknownCodec<S.Infer<Members[number]>> => unknownCodecFor(S.union(...members))

/**
 * @since 1.0.0
 */
export const keyof = <A>(schema: Schema<A>): UnknownCodec<keyof A> =>
  unknownCodecFor(S.keyof(schema))

/**
 * @since 1.0.0
 */
export const tuple = <Components extends ReadonlyArray<Schema<any>>>(
  ...components: Components
): UnknownCodec<{ readonly [K in keyof Components]: S.Infer<Components[K]> }> =>
  unknownCodecFor(S.tuple<Components>(...components))

/**
 * @since 1.0.0
 */
export const withRest = <R>(rest: Schema<R>) =>
  <A extends ReadonlyArray<any>>(self: Schema<A>): Schema<readonly [...A, ...Array<R>]> =>
    unknownCodecFor(S.withRest(rest)(self))

/**
 * @since 1.0.0
 */
export const array = <A>(item: Schema<A>): UnknownCodec<ReadonlyArray<A>> =>
  unknownCodecFor(S.array(item))

/**
 * @since 1.0.0
 */
export const nonEmptyArray = <A>(
  item: Schema<A>
): UnknownCodec<readonly [A, ...Array<A>]> => unknownCodecFor(S.nonEmptyArray(item))

/**
 * @since 1.0.0
 */
export const struct: {
  <Required extends Record<PropertyKey, Schema<any>>>(
    required: Required
  ): UnknownCodec<{ readonly [K in keyof Required]: S.Infer<Required[K]> }>
  <
    Required extends Record<PropertyKey, Schema<any>>,
    Optional extends Record<PropertyKey, Schema<any>>
  >(
    required: Required,
    optional: Optional
  ): UnknownCodec<
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
): UnknownCodec<
  S.Spread<
    & { readonly [K in keyof Required]: S.Infer<Required[K]> }
    & { readonly [K in keyof Optional]?: S.Infer<Optional[K]> }
  >
> => unknownCodecFor(S.struct(required, optional || {}))

/**
 * @since 1.0.0
 */
export const pick = <A, Keys extends ReadonlyArray<keyof A>>(...keys: Keys) =>
  (self: Schema<A>): UnknownCodec<{ readonly [P in Keys[number]]: A[P] }> =>
    unknownCodecFor(pipe(self, S.pick(...keys)))

/**
 * @since 1.0.0
 */
export const omit = <A, Keys extends ReadonlyArray<keyof A>>(...keys: Keys) =>
  (self: Schema<A>): UnknownCodec<{ readonly [P in Exclude<keyof A, Keys[number]>]: A[P] }> =>
    unknownCodecFor(pipe(self, S.omit(...keys)))

/**
 * @since 1.0.0
 */
export const partial = <A>(self: Schema<A>): UnknownCodec<Partial<A>> =>
  unknownCodecFor(S.partial(self))

/**
 * @since 1.0.0
 */
export const stringIndexSignature = <A>(
  value: Schema<A>
): UnknownCodec<{ readonly [_: string]: A }> => unknownCodecFor(S.symbolIndexSignature(value))

/**
 * @since 1.0.0
 */
export const symbolIndexSignature = <A>(
  value: Schema<A>
): UnknownCodec<{ readonly [_: symbol]: A }> => unknownCodecFor(S.symbolIndexSignature(value))

/**
 * @since 1.0.0
 */
export const extend = <B>(
  that: Schema<B>
) => <A>(self: Schema<A>): UnknownCodec<A & B> => unknownCodecFor(S.extend(that)(self))

/**
 * @since 1.0.0
 */
export const lazy = <A>(f: () => Schema<A>): UnknownCodec<A> => unknownCodecFor(S.lazy(f))

/**
 * @since 1.0.0
 */
export const filter = <A>(
  id: symbol,
  decode: Decoder<A, A>["decode"]
) => (schema: Schema<A>): UnknownCodec<A> => unknownCodecFor(S.filter(id, decode)(schema))

/**
 * @since 1.0.0
 */
export const filterWith = <Config, A>(
  id: symbol,
  decode: (config: Config) => Decoder<A, A>["decode"]
) =>
  (config: Config) =>
    (schema: Schema<A>): UnknownCodec<A> =>
      unknownCodecFor(S.filterWith(id, decode)(config)(schema))

/**
 * @since 1.0.0
 */
export const refine = <A, B extends A>(
  id: symbol,
  decode: Decoder<A, B>["decode"]
) => (schema: Schema<A>): UnknownCodec<B> => unknownCodecFor(S.refine(id, decode)(schema))

// ---------------------------------------------
// data
// ---------------------------------------------

/**
 * @since 1.0.0
 */
export const string: UnknownCodec<string> = unknownCodecFor(S.string)

/**
 * @since 1.0.0
 */
export const number: UnknownCodec<number> = unknownCodecFor(S.number)

/**
 * @since 1.0.0
 */
export const boolean: UnknownCodec<boolean> = unknownCodecFor(S.boolean)

/**
 * @since 1.0.0
 */
export const bigint: UnknownCodec<bigint> = unknownCodecFor(S.bigint)

/**
 * @since 1.0.0
 */
export const unknown: UnknownCodec<unknown> = unknownCodecFor(S.unknown)

/**
 * @since 1.0.0
 */
export const unknownArray: UnknownCodec<UnknownArray> = unknownCodecFor(S.unknownArray)

/**
 * @since 1.0.0
 */
export const unknownObject: UnknownCodec<UnknownObject> = unknownCodecFor(
  S.unknownObject
)

/**
 * @since 1.0.0
 */
export const any: UnknownCodec<any> = unknownCodecFor(S.any)

/**
 * @since 1.0.0
 */
export const never: UnknownCodec<never> = unknownCodecFor(S.never)

/**
 * @since 1.0.0
 */
export const json: UnknownCodec<Json> = unknownCodecFor(S.json)

/**
 * @since 1.0.0
 */
export const jsonArray: UnknownCodec<JsonArray> = unknownCodecFor(S.jsonArray)

/**
 * @since 1.0.0
 */
export const jsonObject: UnknownCodec<JsonObject> = unknownCodecFor(S.jsonObject)

/**
 * @since 1.0.0
 */
export const option = <A>(value: Schema<A>): UnknownCodec<Option<A>> =>
  unknownCodecFor(DataOption.schema(value))

/**
 * @since 1.0.0
 */
export const chunk = <A>(value: Schema<A>): UnknownCodec<Chunk<A>> =>
  unknownCodecFor(DataChunk.schema(value))

/**
 * @since 1.0.0
 */
export const readonlySet: <A>(schema: Schema<A>) => UnknownCodec<ReadonlySet<A>> = (schema) =>
  unknownCodecFor(DataReadonlySet.schema(schema))
