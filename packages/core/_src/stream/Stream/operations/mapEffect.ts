import { loopOnPartialChunksElements } from "@effect-ts/core/stream/Stream/operations/_internal/loopOnPartialChunksElements";

/**
 * Maps over elements of the stream with the specified effectful function.
 *
 * @tsplus fluent ets/Stream mapEffect
 */
export function mapEffect_<R, E, A, R1, E1, B>(
  self: Stream<R, E, A>,
  f: (a: A) => Effect<R1, E1, B>,
  __tsplusTrace?: string
): Stream<R & R1, E | E1, B> {
  return loopOnPartialChunksElements(self, (a, emit) => f(a).flatMap(emit));
}

/**
 * Maps over elements of the stream with the specified effectful function.
 *
 * @tsplus static ets/Stream/Aspects mapEffect
 */
export const mapEffect = Pipeable(mapEffect_);
