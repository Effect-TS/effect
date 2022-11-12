/**
 * @since 1.0.0
 */

import type { Decoder } from "@fp-ts/codec/Decoder"
import type { Encoder } from "@fp-ts/codec/Encoder"
import type { Schema } from "@fp-ts/codec/Schema"

/**
 * @since 1.0.0
 */
export interface Codec<in out IO> {
  readonly decoderFor: <A>(schema: Schema<A>) => Decoder<IO, A>
  readonly encoderFor: <A>(schema: Schema<A>) => Encoder<IO, A>
}
