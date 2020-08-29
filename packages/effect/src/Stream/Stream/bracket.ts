import type { Effect } from "../../Effect"
import { make_ } from "../../Managed"
import { managed } from "./managed"

/**
 * Creates a stream from a single value that will get cleaned up after the
 * stream is consumed
 */
export const bracket = <S1, R1, A>(
  release: (a: A) => Effect<S1, R1, never, unknown>
) => <S, R, E>(acquire: Effect<S, R, E, A>) => managed(make_(acquire, release))
