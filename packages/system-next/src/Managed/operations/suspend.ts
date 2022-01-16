// ets_tracing: off

import type { Managed } from "../definition"
import { chain_ } from "./chain"
import { unit } from "./unit"

/**
 * Returns a lazily constructed Managed.
 */
export function suspend<R, E, A>(
  managed: () => Managed<R, E, A>,
  __trace?: string
): Managed<R, E, A> {
  return chain_(unit, managed, __trace)
}
