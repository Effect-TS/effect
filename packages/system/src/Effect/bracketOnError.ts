import type { Exit } from "../Exit"
import { bracketExit_ } from "./bracketExit_"
import { unit } from "./core"
import type { Effect } from "./effect"

/**
 * Executes the release effect only if there was an error.
 */
export function bracketOnError<E, A, S1, E1, R1, A1, S2, R2, E2, A2>(
  use: (a: A) => Effect<S1, R1, E1, A1>,
  release: (a: A, e: Exit<E1, A1>) => Effect<S2, R2, E2, any>
) {
  return <S, R>(acquire: Effect<S, R, E, A>) => bracketOnError_(acquire, use, release)
}

/**
 * Executes the release effect only if there was an error.
 */
export function bracketOnError_<S, R, E, A, S1, E1, R1, A1, S2, R2, E2, A2>(
  acquire: Effect<S, R, E, A>,
  use: (a: A) => Effect<S1, R1, E1, A1>,
  release: (a: A, e: Exit<E1, A1>) => Effect<S2, R2, E2, any>
): Effect<S | S1 | S2, R & R1 & R2, E | E1 | E2, A1> {
  return bracketExit_(acquire, use, (a, e) =>
    e._tag === "Success" ? unit : release(a, e)
  )
}
