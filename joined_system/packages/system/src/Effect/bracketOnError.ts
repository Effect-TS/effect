import type { Exit } from "../Exit"
import { bracketExit_ } from "./bracketExit_"
import { unit } from "./core"
import type { Effect } from "./effect"

/**
 * Executes the release effect only if there was an error.
 */
export function bracketOnError<E, A, E1, R1, A1, R2, E2, A2>(
  use: (a: A) => Effect<R1, E1, A1>,
  release: (a: A, e: Exit<E1, A1>) => Effect<R2, E2, any>
) {
  return <R>(acquire: Effect<R, E, A>) => bracketOnError_(acquire, use, release)
}

/**
 * Executes the release effect only if there was an error.
 */
export function bracketOnError_<R, E, A, E1, R1, A1, R2, E2, A2>(
  acquire: Effect<R, E, A>,
  use: (a: A) => Effect<R1, E1, A1>,
  release: (a: A, e: Exit<E1, A1>) => Effect<R2, E2, any>
): Effect<R & R1 & R2, E | E1 | E2, A1> {
  return bracketExit_(acquire, use, (a, e) =>
    e._tag === "Success" ? unit : release(a, e)
  )
}
