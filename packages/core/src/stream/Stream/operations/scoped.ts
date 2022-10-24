import { StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import * as Chunk from "@fp-ts/data/Chunk"

/**
 * Creates a single-valued stream from a scoped resource.
 *
 * @tsplus static effect/core/stream/Stream.Ops scoped
 * @category constructors
 * @since 1.0.0
 */
export function scoped<R, E, A>(effect: Effect<R, E, A>): Stream<Exclude<R, Scope>, E, A> {
  return new StreamInternal(Channel.scoped(effect.map(Chunk.single)))
}
