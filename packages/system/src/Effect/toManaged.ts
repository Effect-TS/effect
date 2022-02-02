// ets_tracing: off

import { fromEffect } from "../Managed/fromEffect"
import { makeExit_ } from "../Managed/makeExit"
import type { Managed } from "../Managed/managed"
import type { Effect } from "./effect"

/**
 * Converts this Effect to a Managed. This Effect and the provided release action
 * will be performed uninterruptibly.
 */
export function toManaged<A, R1, E1>(self: Effect<R1, E1, A>): Managed<R1, E1, A> {
  return fromEffect(self)
}

/**
 * Converts this Effect to a Managed. This Effect and the provided release action
 * will be performed uninterruptibly.
 */
export function toManagedRelease_<A, R1, E1, R>(
  self: Effect<R1, E1, A>,
  release: (a: A) => Effect<R, never, any>
): Managed<R1 & R, E1, A> {
  return makeExit_(self, release)
}

/**
 * Converts this Effect to a Managed. This Effect and the provided release action
 * will be performed uninterruptibly.
 *
 * @ets_data_first toManagedRelease_
 */
export function toManagedRelease<R, A>(
  release: (a: A) => Effect<R, never, any>
): <R1, E1>(self: Effect<R1, E1, A>) => Managed<R1 & R, E1, A> {
  return (self) => makeExit_(self, release)
}
