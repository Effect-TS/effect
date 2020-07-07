import { andThenEither_ } from "./andThenEither_"
import { map_ } from "./map_"
import { Schedule } from "./schedule"

/**
 * The same as `andThenEither`, but merges the output.
 */
export const andThen_ = <S, R, ST, B, A, R1, ST1, S1, C, A1 extends A = A>(
  self: Schedule<S, R, ST, A, B>,
  that: Schedule<S1, R1, ST1, A1, C>
) => map_(andThenEither_(self, that), (a) => (a._tag === "Left" ? a.left : a.right))
