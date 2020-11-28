import type { Effect } from "../../Effect"
import { make_ } from "../../Managed"
import { managed } from "./managed"

/**
 * Creates a stream from a single value that will get cleaned up after the
 * stream is consumed
 */
export function bracket_<R, R1, E, A>(
  acquire: Effect<R, E, A>,
  release: (a: A) => Effect<R1, never, unknown>
) {
  return managed(make_(acquire, release))
}

/**
 * Creates a stream from a single value that will get cleaned up after the
 * stream is consumed
 */
export function bracket<R1, A>(release: (a: A) => Effect<R1, never, unknown>) {
  return <R, E>(acquire: Effect<R, E, A>) => bracket_(acquire, release)
}
