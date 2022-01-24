import * as Cause from "../../Cause"
import type { Effect, RIO } from "../definition"
import { chain_ } from "./chain"
import { failCause } from "./failCause"
import { unit } from "./unit"

/**
 * When this effect succeeds with a cause, then this method returns a new
 * effect that either fails with the cause that this effect succeeded with, or
 * succeeds with unit, depending on whether the cause is empty.
 *
 * This operation is the opposite of `cause`.
 *
 * @ets fluent ets/Effect uncause
 */
export function uncause<R, E>(
  self: RIO<R, Cause.Cause<E>>,
  __trace?: string
): Effect<R, E, void> {
  return chain_(self, (c) => (Cause.isEmpty(c) ? unit : failCause(c)), __trace)
}
