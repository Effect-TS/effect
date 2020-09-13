import { chain } from "./core"
import type { Effect } from "./effect"
import { flipWith_ } from "./flipWith"

/**
 * Creates a composite effect that represents this effect followed by another
 * one that may depend on the error produced by this one.
 */
export function chainError<E, S2, R2, E2>(f: (e: E) => Effect<S2, R2, never, E2>) {
  return <S, R, A>(self: Effect<S, R, E, A>) => chainError_(self, f)
}

/**
 * Creates a composite effect that represents this effect followed by another
 * one that may depend on the error produced by this one.
 */
export function chainError_<S, R, E, A, S2, R2, E2>(
  self: Effect<S, R, E, A>,
  f: (e: E) => Effect<S2, R2, never, E2>
) {
  return flipWith_(self, chain(f))
}
