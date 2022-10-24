import { pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"

/**
 * Zips each element with both the previous and next element.
 *
 * @tsplus getter effect/core/stream/Stream zipWithPreviousAndNext
 * @category zipping
 * @since 1.0.0
 */
export function zipWithPreviousAndNext<R, E, A>(
  self: Stream<R, E, A>
): Stream<R, E, readonly [Option.Option<A>, A, Option.Option<A>]> {
  return self
    .zipWithPrevious
    .zipWithNext
    .map(([[prev, curr], next]) =>
      [prev, curr, pipe(next, Option.map((tuple) => tuple[1]))] as const
    )
}
