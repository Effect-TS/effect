// tracing: off

import { tuple } from "../Function"
import { access } from "./core"

/**
 * Returns an effectful function that merely swaps the elements in a `Tuple2`.
 */
export function swap<A, B>(__trace?: string) {
  return access(([a, b]: readonly [A, B]) => tuple(b, a), __trace)
}
