import * as Cause from "../../Cause"
import type { RIO } from "../definition"
import { Effect } from "../definition"

/**
 * When this effect succeeds with a cause, then this method returns a new
 * effect that either fails with the cause that this effect succeeded with, or
 * succeeds with unit, depending on whether the cause is empty.
 *
 * This operation is the opposite of `cause`.
 *
 * @tsplus fluent ets/Effect uncause
 */
export function uncause<R, E>(
  self: RIO<R, Cause.Cause<E>>,
  __etsTrace?: string
): Effect<R, E, void> {
  return self.flatMap((c) => (Cause.isEmpty(c) ? Effect.unit : Effect.failCauseNow(c)))
}
