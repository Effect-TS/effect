// ets_tracing: off

import { access } from "./core.js"

/**
 * Returns an effectful function that extracts out the second element of a
 * tuple.
 */
export function second<A>(__trace?: string) {
  return access((a: [unknown, A]) => a, __trace)
}
