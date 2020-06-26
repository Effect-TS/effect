import * as E from "../../Either"
import { map_ } from "../Effect/map_"
import { raceEither_ } from "../Effect/race"
import { zip_ } from "../Effect/zip_"

import { Schedule, ScheduleClass } from "./schedule"

/**
 * Returns the composition of this schedule and the specified schedule,
 * by piping the output of this one into the input of the other.
 * Effects described by this schedule will always be executed before the effects described by the second schedule.
 */
export const or_ = <S, R, A, B, S1, R1, A1 extends A, C>(
  self: Schedule<S, R, A, B>,
  that: Schedule<S1, R1, A1, C>
): Schedule<unknown, R & R1, A1, [B, C]> =>
  new ScheduleClass<unknown, R & R1, [any, any], A1, [B, C]>(
    zip_(self.initial, that.initial),
    (a, s) =>
      map_(
        raceEither_(self.update(a, s[0]), that.update(a, s[1])),
        E.fold(
          (s1): [any, any] => [s1, s[1]],
          (s2): [any, any] => [s[1], s2]
        )
      ),
    (a, s) => [self.extract(a, s[0]), that.extract(a, s[1])]
  )

/**
 * Returns the composition of this schedule and the specified schedule,
 * by piping the output of this one into the input of the other.
 * Effects described by this schedule will always be executed before the effects described by the second schedule.
 */
export const or = <S, R, A, B, A1 extends A>(that: Schedule<S, R, A, B>) => <S1, R1, C>(
  self: Schedule<S1, R1, A1, C>
) => or_(self, that)
