import type { Managed } from "../definition"
import { chain_ } from "./chain"
import { environment } from "./environment"

/**
 * Create a managed that accesses the environment.
 */
export function environmentWithManaged<R0, R, E, A>(
  f: (_: R0) => Managed<R, E, A>,
  __trace?: string
): Managed<R & R0, E, A> {
  return chain_(environment<R0>(), f, __trace)
}
