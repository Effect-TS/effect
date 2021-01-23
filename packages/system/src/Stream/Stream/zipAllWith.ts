import * as T from "../_internal/effect"
import type { Stream } from "./definitions"
import { zipAllWithExec } from "./zipAllWithExec"

/**
 * Zips this stream with another point-wise. The provided functions will be used to create elements
 * for the composed stream.
 *
 * The functions `left` and `right` will be used if the streams have different lengths
 * and one of the streams has ended before the other.
 */
export function zipAllWith<R, R1, E, E1, O, O2>(
  self: Stream<R, E, O>,
  that: Stream<R1, E1, O2>
) {
  return <O3>(left: (o: O) => O3, right: (o2: O2) => O3) => (
    both: (o: O, o2: O2) => O3
  ): Stream<R & R1, E | E1, O3> =>
    zipAllWithExec(self, that)(T.parallel)(left, right)(both)
}
