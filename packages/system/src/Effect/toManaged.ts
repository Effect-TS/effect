import { makeExit_ } from "../Managed/core"
import { fromEffect } from "../Managed/fromEffect"
import type { Managed } from "../Managed/managed"
import type { Effect } from "./effect"

/**
 * Converts this Effect to a Managed. This Effect and the provided release action
 * will be performed uninterruptibly.
 */
export function toManaged_<R, E, A>(self: Effect<R, E, A>): Managed<R, E, A>
export function toManaged_<A, R, R1, E1>(
  self: Effect<R1, E1, A>,
  release: (a: A) => Effect<R, never, any>
): Managed<R1 & R, E1, A>
export function toManaged_<A, R1, E1, R = unknown>(
  self: Effect<R1, E1, A>,
  release?: (a: A) => Effect<R, never, any>
): Managed<R1 & R, E1, A> {
  return release ? makeExit_(self, (a) => release(a)) : fromEffect(self)
}

/**
 * Converts this Effect to a Managed. This Effect and the provided release action
 * will be performed uninterruptibly.
 */
export function toManaged(): <R, E, A>(self: Effect<R, E, A>) => Managed<R, E, A>
export function toManaged<A, R>(
  release: (a: A) => Effect<R, never, any>
): <R1, E1>(self: Effect<R1, E1, A>) => Managed<R1 & R, E1, A>
export function toManaged<A, R = unknown>(
  release?: (a: A) => Effect<R, never, any>
): <R1, E1>(self: Effect<R1, E1, A>) => Managed<R1 & R, E1, A> {
  return (self) => (release ? makeExit_(self, (a) => release(a)) : fromEffect(self))
}
