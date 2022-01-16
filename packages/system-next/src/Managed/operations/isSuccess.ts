// ets_tracing: off

import { constFalse, constTrue } from "../../Function"
import type { Managed } from "../definition"
import { fold_ } from "./fold"

/**
 * Returns whether this managed effect is a success.
 */
export function isSuccess<R, E, A>(self: Managed<R, E, A>, __trace?: string) {
  return fold_(self, constFalse, constTrue, __trace)
}
