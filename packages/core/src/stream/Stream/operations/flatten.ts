import { identity } from "@fp-ts/data/Function"

/**
 * Flattens this stream-of-streams into a stream made of the concatenation in
 * strict order of all the streams.
 *
 * @tsplus getter effect/core/stream/Stream flatten
 * @category sequencing
 * @since 1.0.0
 */
export function flatten<R, E, R1, E1, A>(
  self: Stream<R, E, Stream<R1, E1, A>>
): Stream<R | R1, E | E1, A> {
  return self.flatMap(identity)
}
