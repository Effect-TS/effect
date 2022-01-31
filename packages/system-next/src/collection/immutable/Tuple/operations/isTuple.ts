import type { Tuple } from "../definition"
import { TupleSym } from "../definition"

/**
 * Checks if the provided value is a `Tuple`.
 *
 * @tsplus static ets/TupleOps isTuple
 */
export function isTuple(self: unknown): self is Tuple<unknown[]> {
  return typeof self === "object" && self != null && TupleSym in self
}
