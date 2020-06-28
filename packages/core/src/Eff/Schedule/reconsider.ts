import * as E from "../../Either"
import { Effect } from "../Effect/effect"
import { foldM_ } from "../Effect/foldM_"

import { Schedule } from "./schedule"
import { updated_ } from "./updated_"

/**
 * Returns a new schedule that effectfully reconsiders the decision made by
 * this schedule.
 * The provided either will be a Left if the schedule has failed and will contain the old state
 * or a Right with the new state if the schedule has updated successfully.
 */
export const reconsider_ = <S, R, ST, A, B, S1, R1, A1 extends A>(
  self: Schedule<S, R, ST, A, B>,
  f: (a: A1, e: E.Either<ST, ST>) => Effect<S1, R1, void, ST>
): Schedule<S | S1, R & R1, ST, A1, B> =>
  updated_(self, (update) => (a: A1, s) =>
    foldM_(
      update(a, s),
      () => f(a, E.left(s)),
      (s1) => f(a, E.right(s1))
    )
  )

/**
 * Returns a new schedule that effectfully reconsiders the decision made by
 * this schedule.
 * The provided either will be a Left if the schedule has failed and will contain the old state
 * or a Right with the new state if the schedule has updated successfully.
 */
export const reconsider = <ST, A, S1, R1, A1 extends A>(
  f: (a: A1, e: E.Either<ST, ST>) => Effect<S1, R1, void, ST>
) => <S, R, B>(self: Schedule<S, R, ST, A, B>): Schedule<S | S1, R & R1, ST, A1, B> =>
  reconsider_(self, f)
