import type { Effect } from "../../Effect"
import { managedUse } from "../../Effect/operations/excl-forEach"
import type { Managed } from "../definition"

/**
 * Run an effect while acquiring the resource before and releasing it after.
 *
 * @tsplus fluent ets/Managed use
 */
export function use_<R, E, A, R2, E2, B>(
  self: Managed<R, E, A>,
  f: (a: A) => Effect<R2, E2, B>,
  __tsplusTrace?: string
): Effect<R & R2, E | E2, B> {
  return managedUse(self, f)
}

/**
 * Run an effect while acquiring the resource before and releasing it after.
 *
 * @ets_data_first use_
 */
export function use<A, R2, E2, B>(f: (a: A) => Effect<R2, E2, B>, __tsplusTrace?: string) {
  return <R, E>(self: Managed<R, E, A>): Effect<R & R2, E | E2, B> => use_(self, f)
}
