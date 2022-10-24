import { identity } from "@fp-ts/data/Function"

/**
 * Zips this stream with another point-wise, and keeps only elements from the
 * other stream.
 *
 * The provided default value will be used if this stream ends before the
 * other one.
 *
 * @tsplus static effect/core/stream/Stream.Aspects zipAllRight
 * @tsplus pipeable effect/core/stream/Stream zipAllRight
 * @category zipping
 * @since 1.0.0
 */
export function zipAllRight<R2, E2, A2>(that: Stream<R2, E2, A2>, def: A2) {
  return <R, E, A>(self: Stream<R, E, A>): Stream<R | R2, E | E2, A2> =>
    self.zipAllWith(that, () => def, identity, (_, a2) => a2)
}
