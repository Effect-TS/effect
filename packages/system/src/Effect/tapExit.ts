// ets_tracing: off

import { failureOrCause } from "../Cause/index.js"
import * as E from "../Either/index.js"
import * as Ex from "../Exit/index.js"
import { chain_, foldCauseM_, halt, succeed } from "./core.js"
import type { Effect } from "./effect.js"

/**
 * Returns an effect that effectfully "peeks" at the result of this effect as an `Exit`.
 */
export function tapExit_<R, R1, E, E1, A, A1>(
  self: Effect<R, E, A>,
  f: (exit: Ex.Exit<E, A>) => Effect<R1, E1, A1>,
  __trace?: string
) {
  return foldCauseM_(
    self,
    (c) =>
      E.fold_(
        failureOrCause(c),
        (e) => chain_(f(Ex.fail(e)), (_) => halt(c)),
        (c) => halt(c)
      ),
    (a) => chain_(f(Ex.succeed(a)), (_) => succeed(a)),
    __trace
  )
}

/**
 * Returns an effect that effectfully "peeks" at the result of this effect as an `Exit`.
 *
 * @ets_data_first tapExit_
 */
export function tapExit<R1, E, E1, A, A1>(
  f: (exit: Ex.Exit<E, A>) => Effect<R1, E1, A1>,
  __trace?: string
) {
  return <R>(self: Effect<R, E, A>) => tapExit_(self, f, __trace)
}
