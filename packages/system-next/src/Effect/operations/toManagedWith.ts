import type { Managed } from "../../Managed/definition"
import { acquireReleaseWith_ } from "../../Managed/operations/acquireReleaseWith"
import type { Effect } from "../definition"

/**
 * Converts this Effect to a Managed. This Effect and the provided release action
 * will be performed uninterruptibly.
 *
 * @ets fluent ets/Effect toManagedWith
 */
export function toManagedWith_<R, R1, E, A>(
  self: Effect<R, E, A>,
  release: (a: A) => Effect<R1, never, any>
): Managed<R & R1, E, A> {
  return acquireReleaseWith_(self, release)
}

/**
 * Converts this Effect to a Managed. This Effect and the provided release action
 * will be performed uninterruptibly.
 *
 * @ets_data_first toManagedWith_
 */
export function toManagedWith<R1, A>(
  release: (a: A) => Effect<R1, never, any>
): <R, E>(self: Effect<R, E, A>) => Managed<R & R1, E, A> {
  return (self) => toManagedWith_(self, release)
}
