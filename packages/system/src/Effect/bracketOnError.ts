// ets_tracing: off

import type { Exit } from "../Exit/index.js"
import { bracketExit_ } from "./bracketExit.js"
import { unit } from "./core.js"
import type { Effect } from "./effect.js"

/**
 * Executes the release effect only if there was an error.
 *
 * @ets_data_first bracketOnError_
 */
export function bracketOnError<E, A, E1, R1, A1, R2, E2, X>(
  use: (a: A) => Effect<R1, E1, A1>,
  release: (a: A, e: Exit<E1, A1>) => Effect<R2, E2, X>,
  __trace?: string
) {
  return <R>(acquire: Effect<R, E, A>) =>
    bracketOnError_(acquire, use, release, __trace)
}

/**
 * Executes the release effect only if there was an error.
 */
export function bracketOnError_<R, E, A, E1, R1, A1, R2, E2, X>(
  acquire: Effect<R, E, A>,
  use: (a: A) => Effect<R1, E1, A1>,
  release: (a: A, e: Exit<E1, A1>) => Effect<R2, E2, X>,
  __trace?: string
): Effect<R & R1 & R2, E | E1 | E2, A1> {
  return bracketExit_(
    acquire,
    use,
    (a, e): Effect<R2, E2, X | void> => (e._tag === "Success" ? unit : release(a, e)),
    __trace
  )
}
