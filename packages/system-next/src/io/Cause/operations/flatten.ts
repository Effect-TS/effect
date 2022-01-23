import { identity } from "../../../data/Function/core"
import type { Cause } from "../definition"
import { chain_ } from "./chain"

/**
 * Flattens a nested cause.
 */
export function flatten<E>(self: Cause<Cause<E>>): Cause<E> {
  return chain_(self, identity)
}
