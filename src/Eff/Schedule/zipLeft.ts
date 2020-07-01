import { map_ } from "./map_"
import { Schedule } from "./schedule"
import { zip_ } from "./zip"

/**
 * The same as `zip`, but ignores the right output.
 */
export const zipLeft = <A, S2, R2, ST2, A2 extends A, B2>(
  that: Schedule<S2, R2, ST2, A2, B2>
) => <S, R, ST, B>(self: Schedule<S, R, ST, A, B>) => zipLeft_(self, that)

/**
 * The same as `zip_`, but ignores the right output.
 */
export const zipLeft_ = <S, R, ST, A, B, S2, R2, ST2, A2 extends A, B2>(
  self: Schedule<S, R, ST, A, B>,
  that: Schedule<S2, R2, ST2, A2, B2>
): Schedule<unknown, R & R2, [ST, ST2], A2, B> => map_(zip_(self, that), ([b, _]) => b)
