// ets_tracing: off

import { identity } from "../../Function"
import type { Exit } from "../definition"
import { chain_ } from "./chain"

/**
 * Flattens an `Exit` of an `Exit` into a single `Exit` value.
 */
export function flatten<E, E1, A>(self: Exit<E, Exit<E1, A>>): Exit<E | E1, A> {
  return chain_(self, identity)
}
