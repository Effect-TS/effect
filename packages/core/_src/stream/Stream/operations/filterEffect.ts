import { loopOnPartialChunksElements } from "@effect-ts/core/stream/Stream/operations/_internal/loopOnPartialChunksElements";

/**
 * Effectfully filters the elements emitted by this stream.
 *
 * @tsplus fluent ets/Stream filterEffect
 */
export function filterEffect_<R, E, A, R1, E1>(
  self: Stream<R, E, A>,
  f: (a: A) => Effect<R1, E1, boolean>,
  __tsplusTrace?: string
): Stream<R & R1, E | E1, A> {
  return loopOnPartialChunksElements(self, (a, emit) => f(a).flatMap((b) => (b ? emit(a) : Effect.unit)));
}

/**
 * Effectfully filters the elements emitted by this stream.
 *
 * @tsplus static ets/Stream/Aspects filterEffect
 */
export const filterEffect = Pipeable(filterEffect_);
