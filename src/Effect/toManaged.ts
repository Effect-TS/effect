import { fromEffect, makeExit_ } from "../Managed/core"
import type { Managed } from "../Managed/managed"
import type { Effect } from "./effect"

export function toManaged(): <R, E, A>(self: Effect<R, E, A>) => Managed<R, E, A>
export function toManaged<A, R>(
  release: (a: A) => Effect<R, never, any>
): <R1, E1>(self: Effect<R1, E1, A>) => Managed<R1 & R, E1, A>
export function toManaged<A, R = unknown>(
  release?: (a: A) => Effect<R, never, any>
): <R1, E1>(self: Effect<R1, E1, A>) => Managed<R1 & R, E1, A> {
  return (self) => (release ? makeExit_(self, (a) => release(a)) : fromEffect(self))
}
