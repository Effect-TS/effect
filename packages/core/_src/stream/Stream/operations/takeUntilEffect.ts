import { loopOnPartialChunks } from "@effect/core/stream/Stream/operations/_internal/loopOnPartialChunks";

/**
 * Takes all elements of the stream until the specified effectual predicate
 * evaluates to `true`.
 *
 * @tsplus fluent ets/Stream takeUntilEffect
 */
export function takeUntilEffect_<R, E, A, R2, E2>(
  self: Stream<R, E, A>,
  f: (a: A) => Effect<R2, E2, boolean>,
  __tsplusTrace?: string
): Stream<R & R2, E | E2, A> {
  return loopOnPartialChunks(self, (chunk, emit) =>
    chunk
      .takeWhileEffect((a) => emit(a) > f(a).negate())
      .map((taken) => chunk.drop(taken.length).take(1).isEmpty()));
}

/**
 * Takes all elements of the stream until the specified effectual predicate
 * evaluates to `true`.
 *
 * @tsplus static ets/Stream/Aspects takeUntilEffect
 */
export const takeUntilEffect = Pipeable(takeUntilEffect_);
