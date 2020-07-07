import { chain_ } from "../Effect/chain_"
import { Effect } from "../Effect/effect"
import { fail } from "../Effect/fail"

import { Schedule } from "./schedule"
import { updated_ } from "./updated_"

/**
 * Peeks at the output produced by this schedule, executes some action, and
 * then continues the schedule or not based on the specified state predicate.
 */
export const check_ = <S, R, ST, A, B, S2, R2>(
  self: Schedule<S, R, ST, A, B>,
  f: (a: A, b: B) => Effect<S2, R2, never, boolean>
): Schedule<S | S2, R & R2, ST, A, B> =>
  updated_(self, (upd) => (a, s) =>
    chain_(f(a, self.extract(a, s)), (b) => (b ? fail(undefined) : upd(a, s)))
  )

/**
 * Peeks at the output produced by this schedule, executes some action, and
 * then continues the schedule or not based on the specified state predicate.
 */
export const check = <A, B, S2, R2>(
  f: (a: A, b: B) => Effect<S2, R2, never, boolean>
) => <S, R, ST>(self: Schedule<S, R, ST, A, B>) => check_(self, f)
