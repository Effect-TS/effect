/**
 * @since 1.0.0
 */

import type { Json } from "@fp-ts/data/Json"
import type { Decoder } from "@fp-ts/schema/Decoder"
import type { Encoder } from "@fp-ts/schema/Encoder"
import * as JD from "@fp-ts/schema/JsonDecoder"
import * as JE from "@fp-ts/schema/JsonEncoder"
import type { Provider } from "@fp-ts/schema/Provider"
import { empty } from "@fp-ts/schema/Provider"
import type { Schema } from "@fp-ts/schema/Schema"

/**
 * @since 1.0.0
 */
export interface JsonCodec<in out A> extends Schema<A>, Decoder<Json, A>, Encoder<Json, A> {}

/**
 * @since 1.0.0
 */
export const make = <A>(
  decoder: JD.JsonDecoder<A>,
  encode: Encoder<Json, A>["encode"]
): JsonCodec<A> => ({ ...decoder, encode }) as any

/**
 * @since 1.0.0
 */
export const provideJsonCodecFor = (provider: Provider) => {
  const jsonDecoderFor = JD.provideJsonDecoderFor(provider)
  const jsonEncoderFor = JE.provideJsonEncoderFor(provider)
  return <A>(schema: Schema<A>): JsonCodec<A> =>
    make(jsonDecoderFor(schema), jsonEncoderFor(schema).encode)
}

/**
 * @since 1.0.0
 */
export const jsonCodecFor: <A>(schema: Schema<A>) => JsonCodec<A> = provideJsonCodecFor(empty)
