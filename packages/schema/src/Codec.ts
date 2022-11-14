/**
 * @since 1.0.0
 */

import type { Decoder } from "@fp-ts/codec/Decoder"
import type { Encoder } from "@fp-ts/codec/Encoder"
import type { Declarations } from "@fp-ts/codec/Meta"
import type { Schema } from "@fp-ts/codec/Schema"

/**
 * @since 1.0.0
 */
export interface Codec<in out IO> {
  readonly decoderFor: (declarations: Declarations) => <A>(schema: Schema<A>) => Decoder<IO, A>
  readonly encoderFor: (declarations: Declarations) => <A>(schema: Schema<A>) => Encoder<IO, A>
}
