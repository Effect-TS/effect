import { pipe } from "../../Function"

import * as T from "./effect"
import { Schedule } from "./schedule"

/**
 * Returns the composition of this schedule and the specified schedule,
 * by piping the output of this one into the input of the other.
 * Effects described by this schedule will always be executed before the effects described by the second schedule.
 */
export const into_ = <S, R, ST, A, B, S2, R2, ST2, C>(
  self: Schedule<S, R, ST, A, B>,
  that: Schedule<S2, R2, ST2, B, C>
) =>
  new Schedule<S | S2, R & R2, [ST, ST2], A, C>(
    T.zip_(self.initial, that.initial),
    (a, s) =>
      pipe(
        T.of,
        T.bind("s1", () => self.update(a, s[0])),
        T.bind("s2", () => that.update(self.extract(a, s[0]), s[1])),
        T.map((s) => [s.s1, s.s2])
      ),
    (a, s) => that.extract(self.extract(a, s[0]), s[1])
  )

/**
 * Returns the composition of this schedule and the specified schedule,
 * by piping the output of this one into the input of the other.
 * Effects described by this schedule will always be executed before the effects described by the second schedule.
 */
export const into = <S2, R2, ST2, B, C>(that: Schedule<S2, R2, ST2, B, C>) => <
  S,
  R,
  ST,
  A
>(
  self: Schedule<S, R, ST, A, B>
) => into_(self, that)
