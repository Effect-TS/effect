/**
 * @since 1.0.0
 */

import type { Arbitrary } from "@fp-ts/schema/Arbitrary"
import * as A from "@fp-ts/schema/Arbitrary"
import type { Guard } from "@fp-ts/schema/Guard"
import * as G from "@fp-ts/schema/Guard"
import type { Pretty } from "@fp-ts/schema/Pretty"
import * as P from "@fp-ts/schema/Pretty"
import type { Provider } from "@fp-ts/schema/Provider"
import { empty } from "@fp-ts/schema/Provider"
import type { Schema } from "@fp-ts/schema/Schema"
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
