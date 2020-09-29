import type { Effect } from "../../Effect"
import { make_ } from "../../Managed"
import { managed } from "./managed"

/**
 * Creates a stream from a single value that will get cleaned up after the
 * stream is consumed
 */
export const bracket = <R1, A>(release: (a: A) => Effect<R1, never, unknown>) => <R, E>(
  acquire: Effect<R, E, A>
) => managed(make_(acquire, release))
