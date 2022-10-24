import type { Option } from "@fp-ts/data/Option"

/**
 * Runs the stream to completion and yields the last value emitted by it,
 * discarding the rest of the elements.
 *
 * @tsplus getter effect/core/stream/Stream runLast
 * @category destructors
 * @since 1.0.0
 */
export function runLast<R, E, A>(
  self: Stream<R, E, A>
): Effect<R, E, Option<A>> {
  return self.run(Sink.last())
}
