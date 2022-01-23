import * as Exit from "../../Exit/operations/fail"
import type { Fiber } from "../definition"
import { done } from "./done"

/**
 * A fiber that has already failed with the specified value.
 */
export function fail<E>(e: E): Fiber<E, never> {
  return done(Exit.fail(e))
}
