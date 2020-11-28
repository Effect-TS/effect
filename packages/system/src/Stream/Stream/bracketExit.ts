import type { Effect } from "../../Effect"
import type { Exit } from "../../Exit"
import { makeExit_ } from "../../Managed"
import { managed } from "./managed"

/**
 * Creates a stream from a single value that will get cleaned up after the
 * stream is consumed
 */
export function bracketExit_<R, R1, E, A>(
  acquire: Effect<R, E, A>,
  release: (a: A, exit: Exit<unknown, unknown>) => Effect<R1, never, unknown>
) {
  return managed(makeExit_(acquire, release))
}

/**
 * Creates a stream from a single value that will get cleaned up after the
 * stream is consumed
 */
export function bracketExit<R1, A>(
  release: (a: A, exit: Exit<unknown, unknown>) => Effect<R1, never, unknown>
) {
  return <R, E>(acquire: Effect<R, E, A>) => bracketExit_(acquire, release)
}
