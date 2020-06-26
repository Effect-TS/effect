import * as E from "../../Either"
import { map_ } from "../Effect/map_"
import { zip_ } from "../Effect/zip_"

import { Schedule, ScheduleClass } from "./schedule"

/**
 * Chooses between two schedules with different outputs.
 */
export const choose_ = <S, R, A, B, S2, R2, A2, B2>(
  self: Schedule<S, R, A, B>,
  that: Schedule<S2, R2, A2, B2>
): Schedule<S | S2, R & R2, E.Either<A, A2>, E.Either<B, B2>> =>
  new ScheduleClass<S | S2, R & R2, [any, any], E.Either<A, A2>, E.Either<B, B2>>(
    zip_(self.initial, that.initial),
    (a, s) =>
      E.fold_(
        a,
        (a) => map_(self.update(a, s[0]), (a): [any, any] => [a, s[1]]),
        (a) => map_(that.update(a, s[1]), (a): [any, any] => [s[0], a])
      ),
    (a, s) =>
      E.fold_(
        a,
        (a) => E.left(self.extract(a, s[0])),
        (a) => E.right(that.extract(a, s[1]))
      )
  )

/**
 * Chooses between two schedules with different outputs.
 */
export const choose = <S, R, A, B, S2, R2, A2, B2>(that: Schedule<S2, R2, A2, B2>) => (
  self: Schedule<S, R, A, B>
): Schedule<S | S2, R & R2, E.Either<A, A2>, E.Either<B, B2>> => choose_(self, that)
