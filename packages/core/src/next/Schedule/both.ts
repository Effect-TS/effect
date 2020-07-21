import { zipPar_ } from "../Effect/zipPar_"

import { Schedule } from "./schedule"

/**
 * Returns a new schedule that continues only as long as both schedules
 * continue, using the maximum of the delays of the two schedules.
 */
export const both_ = <S, R, ST, B, A, R1, ST1, S1, C, A1 extends A = A>(
  self: Schedule<S, R, ST, A, B>,
  that: Schedule<S1, R1, ST1, A1, C>
) =>
  new Schedule<unknown, R & R1, [ST, ST1], A1, [B, C]>(
    zipPar_(self.initial, that.initial),
    (a, s) => zipPar_(self.update(a, s[0]), that.update(a, s[1])),
    (a, s) => [self.extract(a, s[0]), that.extract(a, s[1])]
  )

/**
 * Returns a new schedule that continues only as long as both schedules
 * continue, using the maximum of the delays of the two schedules.
 */
export const both = <A, R1, ST1, S1, C, A1 extends A = A>(
  that: Schedule<S1, R1, ST1, A1, C>
) => <S, R, ST, B>(self: Schedule<S, R, ST, A, B>) =>
  new Schedule<unknown, R & R1, [ST, ST1], A1, [B, C]>(
    zipPar_(self.initial, that.initial),
    (a, s) => zipPar_(self.update(a, s[0]), that.update(a, s[1])),
    (a, s) => [self.extract(a, s[0]), that.extract(a, s[1])]
  )
