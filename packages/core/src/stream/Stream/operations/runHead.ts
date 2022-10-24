import type { Option } from "@fp-ts/data/Option"

/**
 * Runs the stream to completion and yields the first value emitted by it,
 * discarding the rest of the elements.
 *
 * @tsplus getter effect/core/stream/Stream runHead
 * @category destructors
 * @since 1.0.0
 */
export function runHead<R, E, A>(
  self: Stream<R, E, A>
): Effect<R, E, Option<A>> {
  return self.run(Sink.head())
}
