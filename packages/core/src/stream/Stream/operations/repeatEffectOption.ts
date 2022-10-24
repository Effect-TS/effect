import * as Chunk from "@fp-ts/data/Chunk"
import type { Option } from "@fp-ts/data/Option"

/**
 * Creates a stream from an effect producing values of type `A` until it fails
 * with `None`.
 *
 * @tsplus static effect/core/stream/Stream.Ops repeatEffectOption
 * @category repetition
 * @since 1.0.0
 */
export function repeatEffectOption<R, E, A>(effect: Effect<R, Option<E>, A>): Stream<R, E, A> {
  return Stream.repeatEffectChunkOption(effect.map(Chunk.single))
}
