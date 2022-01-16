// ets_tracing: off

import type { Cause } from "../../Cause"
import * as Exit from "../../Exit/operations/failCause"
import type { Fiber } from "../definition"
import { done } from "./done"

/**
 * Creates a `Fiber` that has already failed with the specified cause.
 */
export function failCause<E>(cause: Cause<E>): Fiber<E, never> {
  return done(Exit.failCause(cause))
}
