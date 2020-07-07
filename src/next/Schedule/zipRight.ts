import { map_ } from "./map_"
import { Schedule } from "./schedule"
import { zip_ } from "./zip"

/**
 * The same as `zip`, but ignores the left output.
 */
export const zipRight = <A, S2, R2, ST2, A2 extends A, B2>(
  that: Schedule<S2, R2, ST2, A2, B2>
) => <S, R, B>(self: Schedule<S, R, ST2, A, B>) => zipRight_(self, that)

/**
 * The same as `zip_`, but ignores the left output.
 */
export const zipRight_ = <S, R, ST, A, B, S2, R2, ST2, A2 extends A, B2>(
  self: Schedule<S, R, ST, A, B>,
  that: Schedule<S2, R2, ST2, A2, B2>
): Schedule<unknown, R & R2, [ST, ST2], A2, B2> => map_(zip_(self, that), ([_, b]) => b)
