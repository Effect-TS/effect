import { both_ } from "./both"
import { map_ } from "./map_"
import { Schedule } from "./schedule"

/**
 * The same as `both`, but ignores the right output.
 */
export const bothLeft = <A, S2, R2, ST2, A2 extends A, B2>(
  that: Schedule<S2, R2, ST2, A2, B2>
) => <S, R, ST, B>(self: Schedule<S, R, ST, A, B>) => bothLeft_(self, that)

/**
 * The same as `both_`, but ignores the right output.
 */
export const bothLeft_ = <S, R, ST, A, B, S2, R2, ST2, A2 extends A, B2>(
  self: Schedule<S, R, ST, A, B>,
  that: Schedule<S2, R2, ST2, A2, B2>
): Schedule<unknown, R & R2, [ST, ST2], A2, B> => map_(both_(self, that), ([b, _]) => b)
