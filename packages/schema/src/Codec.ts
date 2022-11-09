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
export interface Codec<Whole> {
  readonly decoderFor: <P>(
    ctx: C.Context<P>
  ) => <E, A>(schema: Schema<P, E, A>) => Decoder<Whole, E, A>
  readonly encoderFor: <P>(
    ctx: C.Context<P>
  ) => <E, A>(schema: Schema<P, E, A>) => Encoder<Whole, A>
}
