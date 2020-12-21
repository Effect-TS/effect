import type { Stream } from "./definitions"
import { zipAllWith } from "./zipAllWith"

/**
 * Zips this stream with another point-wise, creating a new stream of pairs of elements
 * from both sides.
 *
 * The defaults `defaultLeft` and `defaultRight` will be used if the streams have different lengths
 * and one of the streams has ended before the other.
 */
export function zipAll<R, R1, E, E1, O, O2>(
  self: Stream<R, E, O>,
  that: Stream<R1, E1, O2>
) {
  return (defaultLeft: O, defaultRight: O2): Stream<R & R1, E | E1, readonly [O, O2]> =>
    zipAllWith(self, that)(
      (_) => [_, defaultRight] as const,
      (_) => [defaultLeft, _] as const
    )((a, b) => [a, b] as const)
}
