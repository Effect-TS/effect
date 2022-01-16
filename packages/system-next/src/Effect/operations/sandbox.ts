// ets_tracing: off

import type { Cause } from "../../Cause"
import type { Effect } from "../definition"
import { failNow } from "./failNow"
import { foldCauseEffect_ } from "./foldCauseEffect"
import { succeedNow } from "./succeedNow"

/**
 * Exposes the full cause of failure of this effect.
 */
export function sandbox<R, E, A>(
  self: Effect<R, E, A>,
  __trace?: string
): Effect<R, Cause<E>, A> {
  return foldCauseEffect_(self, failNow, succeedNow)
}
