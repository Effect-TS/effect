import type { Managed } from "../definition"
import type { Effect } from "./_internal/effect-api"
import { environment } from "./environment"
import { mapEffect_ } from "./mapEffect"

/**
 * Effectfully accesses the environment of the effect.
 */
export function environmentWithEffect<R0, R, E, A>(
  f: (_: R0) => Effect<R, E, A>,
  __trace?: string
): Managed<R & R0, E, A> {
  return mapEffect_(environment<R0>(), f, __trace)
}
