// ets_tracing: off

import type * as Tp from "../Collections/Immutable/Tuple/index.js"
import { access } from "./core.js"

/**
 * Returns an effectful function that extracts out the first element of a
 * tuple.
 */
export function first<A>(__trace?: string) {
  return access((_: Tp.Tuple<[A, unknown]>) => _.get(0), __trace)
}
