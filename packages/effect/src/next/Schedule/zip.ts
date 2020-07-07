import { zipPar_ } from "../Effect/zipPar_"

import { Schedule } from "./schedule"

/**
 * Returns a new schedule that continues only as long as both schedules
 * continue, using the maximum of the delays of the two schedules.
 */
export const zip = <A, S2, R2, ST2, A2 extends A, B2>(
  that: Schedule<S2, R2, ST2, A2, B2>
) => <S, R, ST, B>(self: Schedule<S, R, ST, A, B>) => zip_(self, that)

/**
 * Returns a new schedule that continues only as long as both schedules
 * continue, using the maximum of the delays of the two schedules.
 */
export const zip_ = <S, R, ST, A, B, S2, R2, ST2, A2 extends A, B2>(
  self: Schedule<S, R, ST, A, B>,
  that: Schedule<S2, R2, ST2, A2, B2>
): Schedule<unknown, R & R2, [ST, ST2], A2, [B, B2]> =>
  new Schedule<unknown, R & R2, [ST, ST2], A2, [B, B2]>(
    zipPar_(self.initial, that.initial),
    (a, [s0, s1]) => zipPar_(self.update(a, s0), that.update(a, s1)),
    (a, [s0, s1]) => [self.extract(a, s0), that.extract(a, s1)]
  )
