import { zipPar_ } from "../Effect/zipPar_"

import { Schedule, ScheduleClass } from "./schedule"

/**
 * Returns a new schedule that continues only as long as both schedules
 * continue, using the maximum of the delays of the two schedules.
 */
export const both = <A, S2, R2, A2 extends A, B2>(that: Schedule<S2, R2, A2, B2>) => <
  S,
  R,
  B
>(
  self: Schedule<S, R, A, B>
) => both_(self, that)

/**
 * Returns a new schedule that continues only as long as both schedules
 * continue, using the maximum of the delays of the two schedules.
 */
export const both_ = <S, R, A, B, S2, R2, A2 extends A, B2>(
  self: Schedule<S, R, A, B>,
  that: Schedule<S2, R2, A2, B2>
): Schedule<unknown, R & R2, A2, [B, B2]> =>
  new ScheduleClass<unknown, R & R2, [any, any], A2, [B, B2]>(
    zipPar_(self.initial, that.initial),
    (a, [s0, s1]) => zipPar_(self.update(a, s0), that.update(a, s1)),
    (a, [s0, s1]) => [self.extract(a, s0), that.extract(a, s1)]
  )
