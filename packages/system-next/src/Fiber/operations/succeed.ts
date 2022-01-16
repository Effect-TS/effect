// ets_tracing: off

import * as Exit from "../../Exit/operations/succeed"
import type { Fiber } from "../definition"
import { done } from "./done"

/**
 * Returns a fiber that has already succeeded with the specified value.
 */
export function succeed<A>(a: A): Fiber<never, A> {
  return done(Exit.succeed(a))
}
