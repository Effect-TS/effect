import * as O from "../../Option"
import { tapBoth_ } from "../Effect"
import { Effect } from "../Effect/effect"

import { Schedule } from "./schedule"
import { updated_ } from "./updated_"

/**
 * A new schedule that applies the current one but runs the specified effect
 * for every decision of this schedule. This can be used to create schedules
 * that log failures, decisions, or computed values.
 */
export const onDecision_ = <S, R, ST, A1 extends A, B, A, S2, R2>(
  self: Schedule<S, R, ST, A, B>,
  f: (a: A1, o: O.Option<ST>) => Effect<S2, R2, never, any>
): Schedule<S | S2, R & R2, ST, A1, B> =>
  updated_(self, (update) => (a, s) =>
    tapBoth_(
      update(a, s),
      () => f(a, O.none),
      (s) => f(a, O.some(s))
    )
  )

/**
 * A new schedule that applies the current one but runs the specified effect
 * for every decision of this schedule. This can be used to create schedules
 * that log failures, decisions, or computed values.
 */
export const onDecision = <ST, A, B, A1 extends A, S2, R2>(
  f: (a: A1, o: O.Option<ST>) => Effect<S2, R2, never, any>
) => <S, R>(self: Schedule<S, R, ST, A, B>): Schedule<S | S2, R & R2, ST, A1, B> =>
  onDecision_(self, f)
