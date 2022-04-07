import { StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal";

/**
 * Creates a single-valued stream from a scoped resource.
 *
 * @tsplus static ets/Stream/Ops scoped
 */
export function scoped<R, E, A>(
  effect: LazyArg<Effect<R & Has<Scope>, E, A>>,
  __tsplusTrace?: string
): Stream<R, E, A> {
  return new StreamInternal(Channel.scopedOut(effect().map(Chunk.single)));
}
