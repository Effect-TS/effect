/**
 * @since 1.0.0
 */

import { pipe } from "@fp-ts/data/Function"
import type { Arbitrary } from "@fp-ts/schema/Arbitrary"
import * as A from "@fp-ts/schema/Arbitrary"
import type { Guard } from "@fp-ts/schema/Guard"
import * as G from "@fp-ts/schema/Guard"
import type { Pretty } from "@fp-ts/schema/Pretty"
import * as P from "@fp-ts/schema/Pretty"
import type { Provider } from "@fp-ts/schema/Provider"
import { empty } from "@fp-ts/schema/Provider"
import type { Schema } from "@fp-ts/schema/Schema"
import * as S from "@fp-ts/schema/Schema"
import * as UD from "@fp-ts/schema/UnknownDecoder"
import type { UnknownDecoder } from "@fp-ts/schema/UnknownDecoder"
import * as UE from "@fp-ts/schema/UnknownEncoder"
import type { UnknownEncoder } from "@fp-ts/schema/UnknownEncoder"

/**
 * @since 1.0.0
 */
export interface UnknownCodec<in out A>
  extends Schema<A>, UnknownDecoder<A>, UnknownEncoder<A>, Guard<A>, Arbitrary<A>, Pretty<A>
{}

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
export const literal = <A extends ReadonlyArray<string | number | boolean | null | undefined>>(
  ...a: A
): UnknownCodec<A[number]> => unknownCodecFor(S.literal(...a))

/**
 * @since 1.0.0
 */
export const nativeEnum = <A extends { [_: string]: string | number }>(
  nativeEnum: A
): UnknownCodec<A> => unknownCodecFor(S.nativeEnum(nativeEnum))

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
export const struct = <Fields extends Record<PropertyKey, Schema<any>>>(
  fields: Fields
): UnknownCodec<{ readonly [K in keyof Fields]: S.Infer<Fields[K]> }> =>
  unknownCodecFor(S.struct(fields))

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
