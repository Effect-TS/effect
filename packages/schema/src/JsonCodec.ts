/**
 * @since 1.0.0
 */

import { pipe } from "@fp-ts/data/Function"
import type { Arbitrary } from "@fp-ts/schema/Arbitrary"
import * as A from "@fp-ts/schema/Arbitrary"
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
{}

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
): JsonCodec<A> => ({ ast: schema.ast, decode, encode, is, arbitrary, pretty }) as any

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
export const literal = <A extends ReadonlyArray<string | number | boolean | null | undefined>>(
  ...a: A
): JsonCodec<A[number]> => jsonCodecFor(S.literal(...a))

/**
 * @since 1.0.0
 */
export const nativeEnum = <A extends { [_: string]: string | number }>(
  nativeEnum: A
): JsonCodec<A> => jsonCodecFor(S.nativeEnum(nativeEnum))

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
export const struct = <Fields extends Record<PropertyKey, Schema<any>>>(
  fields: Fields
): JsonCodec<{ readonly [K in keyof Fields]: S.Infer<Fields[K]> }> => jsonCodecFor(S.struct(fields))

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
