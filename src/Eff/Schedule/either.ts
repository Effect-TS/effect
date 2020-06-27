import * as E from "../../Either"
import { map_ as effectMap_ } from "../Effect/map_"
import { raceEither_ } from "../Effect/race"
import { zip_ } from "../Effect/zip_"

import { map_ } from "./map_"
import { Schedule, ScheduleClass } from "./schedule"

/**
 * Returns the composition of this schedule and the specified schedule,
 * by piping the output of this one into the input of the other.
 * Effects described by this schedule will always be executed before the effects described by the second schedule.
 */
export const either_ = <S, R, A, B, S1, R1, A1 extends A, C>(
  self: Schedule<S, R, A, B>,
  that: Schedule<S1, R1, A1, C>
): Schedule<unknown, R & R1, A1, [B, C]> =>
  new ScheduleClass<unknown, R & R1, [any, any], A1, [B, C]>(
    zip_(self.initial, that.initial),
    (a, s) =>
      effectMap_(
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
export const either = <A, B, S1, R1, A1 extends A, C>(
  that: Schedule<S1, R1, A1, C>
) => <S, R>(self: Schedule<S, R, A, B>): Schedule<unknown, R & R1, A1, [B, C]> =>
  either_(self, that)

/**
 * The same as `either` followed by `map`.
 */
export const eitherWith_ = <S, R, A, B, S1, R1, A1 extends A, C, D>(
  self: Schedule<S, R, A, B>,
  that: Schedule<S1, R1, A1, C>,
  f: (b: B, c: C) => D
): Schedule<unknown, R & R1, A1, D> => map_(either_(self, that), ([b, c]) => f(b, c))

/**
 * The same as `either` followed by `map`.
 */
export const eitherWith = <B, C, D>(f: (b: B, c: C) => D) => <A, S1, R1, A1 extends A>(
  that: Schedule<S1, R1, A1, C>
) => <S, R>(self: Schedule<S, R, A, B>) => eitherWith_(self, that, f)
