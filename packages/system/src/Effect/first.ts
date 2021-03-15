// tracing: off

import { access } from "./core"

/**
 * Returns an effectful function that extracts out the first element of a
 * tuple.
 */
export function first<A>(__trace?: string) {
  return access((_: readonly [A, unknown]) => _[0], __trace)
}
