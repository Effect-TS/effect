// ets_tracing: off

import type { Cause } from "../Cause/cause.js"
import type { Exit } from "../Exit/exit.js"
import { bracketExit_ } from "./bracketExit.js"
import { unit } from "./core.js"
import type { Effect } from "./effect.js"

/**
 * Execute a cleanup function when the effect completes
 */
export function onExit_<R, E, A, R2, E2, X>(
  self: Effect<R, E, A>,
  cleanup: (exit: Exit<E, A>) => Effect<R2, E2, X>,
  __trace?: string
): Effect<R & R2, E | E2, A> {
  return bracketExit_(
    unit,
    () => self,
    (_, e) => cleanup(e),
    __trace
  )
}

/**
 * Execute a cleanup function when the effect completes
 *
 * @ets_data_first onExit_
 */
export function onExit<E, A, R2, E2, X>(
  cleanup: (exit: Exit<E, A>) => Effect<R2, E2, X>,
  __trace?: string
) {
  return <R>(self: Effect<R, E, A>): Effect<R & R2, E | E2, A> =>
    onExit_(self, cleanup, __trace)
}

/**
 * Execute a cleanup function when the effect errors
 *
 * @ets_data_first onError_
 */
export function onError<E, A, R2, E2, X>(
  cleanup: (exit: Cause<E>) => Effect<R2, E2, X>,
  __trace?: string
) {
  return <R>(self: Effect<R, E, A>): Effect<R & R2, E | E2, A> =>
    onError_(self, cleanup, __trace)
}

/**
 * Execute a cleanup function when the effect errors
 */
export function onError_<R, E, A, R2, E2, X>(
  self: Effect<R, E, A>,
  cleanup: (exit: Cause<E>) => Effect<R2, E2, X>,
  __trace?: string
): Effect<R & R2, E | E2, A> {
  return onExit_(
    self,
    (e) => {
      switch (e._tag) {
        case "Failure": {
          return cleanup(e.cause)
        }
        case "Success": {
          return unit
        }
      }
    },
    __trace
  )
}
