import { chain_ } from "../Effect/chain_"
import { Effect } from "../Effect/effect"
import { fail } from "../Effect/fail"
import { succeedNow } from "../Effect/succeedNow"

import { Schedule } from "./schedule"
import { updated_ } from "./updated_"

/**
 * Returns a new schedule that continues the schedule only until the predicate
 * is satisfied on the output value of the schedule.
 */
export const untilOutputM_ = <S, R, ST, A, B, S1, R1>(
  self: Schedule<S, R, ST, A, B>,
  f: (a: B) => Effect<S1, R1, never, boolean>
) =>
  updated_(self, (update) => (a, s) =>
    chain_(f(self.extract(a, s)), (b) => (b ? fail(undefined) : update(a, s)))
  )

/**
 * Returns a new schedule that continues the schedule only until the predicate
 * is satisfied on the output value of the schedule.
 */
export const untilOutputM = <B, S1, R1>(
  f: (a: B) => Effect<S1, R1, never, boolean>
) => <S, R, ST, A>(self: Schedule<S, R, ST, A, B>) => untilOutputM_(self, f)

/**
 * Returns a new schedule that continues the schedule only until the predicate
 * is satisfied on the output value of the schedule.
 */
export const untilOutput_ = <S, R, ST, A, B>(
  self: Schedule<S, R, ST, A, B>,
  f: (a: B) => boolean
) => untilOutputM_(self, (a) => succeedNow(f(a)))

/**
 * Returns a new schedule that continues the schedule only until the predicate
 * is satisfied on the output value of the schedule.
 */
export const untilOutput = <B>(f: (a: B) => boolean) => <S, R, ST, A>(
  self: Schedule<S, R, ST, A, B>
) => untilOutput_(self, f)
