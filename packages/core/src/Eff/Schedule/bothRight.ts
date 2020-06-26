import { both_ } from "./both"
import { map_ } from "./map_"
import { Schedule } from "./schedule"

/**
 * The same as `both`, but ignores the left output.
 */
export const bothRight = <A, S2, R2, A2 extends A, B2>(
  that: Schedule<S2, R2, A2, B2>
) => <S, R, B>(self: Schedule<S, R, A, B>) => bothRight_(self, that)

/**
 * The same as `both_`, but ignores the left output.
 */
export const bothRight_ = <S, R, A, B, S2, R2, A2 extends A, B2>(
  self: Schedule<S, R, A, B>,
  that: Schedule<S2, R2, A2, B2>
): Schedule<unknown, R & R2, A2, B2> => map_(both_(self, that), ([_, b]) => b)
