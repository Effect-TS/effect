/**
 * @since 1.0.0
 */

import type { Decoder } from "@fp-ts/codec/Decoder"
import type { Encoder } from "@fp-ts/codec/Encoder"
import type { Schema } from "@fp-ts/codec/Schema"
import type * as C from "@fp-ts/data/Context"

/**
 * @since 1.0.0
 */
export interface Codec<in out IO> {
  readonly decoderFor: <P>(
    ctx: C.Context<P>
  ) => <A>(schema: Schema<P, A>) => Decoder<IO, A>
  readonly encoderFor: <P>(
    ctx: C.Context<P>
  ) => <A>(schema: Schema<P, A>) => Encoder<IO, A>
}
