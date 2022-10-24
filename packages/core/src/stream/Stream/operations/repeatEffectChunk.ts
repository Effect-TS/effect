import type { Chunk } from "@fp-ts/data/Chunk"
import * as Option from "@fp-ts/data/Option"

/**
 * Creates a stream from an effect producing chunks of `A` values which
 * repeats forever.
 *
 * @tsplus static effect/core/stream/Stream.Ops repeatEffectChunk
 * @category repetition
 * @since 1.0.0
 */
export function repeatEffectChunk<R, E, A>(effect: Effect<R, E, Chunk<A>>): Stream<R, E, A> {
  return Stream.repeatEffectChunkOption(effect.mapError(Option.some))
}
