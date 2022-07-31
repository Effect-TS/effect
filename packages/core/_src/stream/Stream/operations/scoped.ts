import { StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Creates a single-valued stream from a scoped resource.
 *
 * @tsplus static effect/core/stream/Stream.Ops scoped
 */
export function scoped<R, E, A>(
  effect: LazyArg<Effect<R, E, A>>
): Stream<Exclude<R, Scope>, E, A> {
  return new StreamInternal(Channel.scoped(effect().map(Chunk.single)))
}
