import { zipPar_ } from "../Effect"
import { zip_ } from "../Effect/zip_"

import { Schedule, ScheduleClass } from "./schedule"

/**
 * Split the input
 */
export const split = <S2, R2, A2, B2>(that: Schedule<S2, R2, A2, B2>) => <S, R, A, B>(
  self: Schedule<S, R, A, B>
) => split_(self, that)

/**
 * Split the input
 */
export const split_ = <S, R, A, B, S2, R2, A2, B2>(
  self: Schedule<S, R, A, B>,
  that: Schedule<S2, R2, A2, B2>
): Schedule<unknown, R & R2, [A, A2], [B, B2]> =>
  new ScheduleClass<unknown, R & R2, [any, any], [A, A2], [B, B2]>(
    zip_(self.initial, that.initial),
    ([a0, a1], [s0, s1]) => zipPar_(self.update(a0, s0), that.update(a1, s1)),
    ([a0, a1], [s0, s1]) => [self.extract(a0, s0), that.extract(a1, s1)]
  )
