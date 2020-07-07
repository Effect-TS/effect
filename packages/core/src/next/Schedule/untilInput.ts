import { chain_ } from "../Effect/chain_"
import { Effect } from "../Effect/effect"
import { fail } from "../Effect/fail"
import { succeedNow } from "../Effect/succeedNow"

import { Schedule } from "./schedule"
import { updated_ } from "./updated_"

/**
 * Returns a new schedule that continues the schedule only until the effectful predicate
 * is satisfied on the input of the schedule.
 */
export const untilInputM_ = <S, R, ST, A, B, S1, R1, A1 extends A>(
  self: Schedule<S, R, ST, A, B>,
  f: (a: A1) => Effect<S1, R1, never, boolean>
) =>
  updated_(self, (update) => (a: A1, s) =>
    chain_(f(a), (b) => (b ? fail(undefined) : update(a, s)))
  )

/**
 * Returns a new schedule that continues the schedule only until the effectful predicate
 * is satisfied on the input of the schedule.
 */
export const untilInputM = <A, S1, R1, A1 extends A>(
  f: (a: A1) => Effect<S1, R1, never, boolean>
) => <S, R, ST, B>(self: Schedule<S, R, ST, A, B>) => untilInputM_(self, f)

/**
 * Returns a new schedule that continues the schedule only until the predicate
 * is satisfied on the input of the schedule.
 */
export const untilInput_ = <S, R, ST, A, B, A1 extends A>(
  self: Schedule<S, R, ST, A, B>,
  f: (a: A1) => boolean
) => untilInputM_(self, (a: A1) => succeedNow(f(a)))

/**
 * Returns a new schedule that continues the schedule only until the predicate
 * is satisfied on the input of the schedule.
 */
export const untilInput = <A, A1 extends A>(f: (a: A1) => boolean) => <S, R, ST, B>(
  self: Schedule<S, R, ST, A, B>
) => untilInput_(self, f)
