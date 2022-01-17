import type { Effect } from "../definition"
import { chain_ } from "./chain"
import { environment } from "./environment"

/**
 * Effectually accesses the environment of the effect.
 */
export function environmentWithEffect<R, R0, E, A>(
  f: (env: R0) => Effect<R, E, A>,
  __trace?: string
): Effect<R & R0, E, A> {
  return chain_(environment<R0>(), f, __trace)
}
