/**
 * @since 1.0.0
 */

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
