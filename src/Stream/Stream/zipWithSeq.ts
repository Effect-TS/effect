import { pipe } from "../../Function"
import type { Stream } from "./definitions"
import { zipWith } from "./zipWith"

/**
 * Zips this stream with another point-wise and applies the function to the paired elements.
 *
 * The new stream will end when one of the sides ends.
 *
 * Pull will be executed sequentially
 */
export const zipWithSeq = <O, O2, O3, S1, R1, E1>(
  that: Stream<S1, R1, E1, O2>,
  f: (a: O, a1: O2) => O3
) => <S, R, E>(self: Stream<S, R, E, O>): Stream<S | S1, R & R1, E1 | E, O3> =>
  pipe(self, zipWith(that, f, "seq"))
