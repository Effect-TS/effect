import { chain } from "./core"
import type { Effect, RIO } from "./effect"
import { flipWith_ } from "./flipWith"

/**
 * Creates a composite effect that represents this effect followed by another
 * one that may depend on the error produced by this one.
 */
export function chainError<E, R2, E2>(f: (e: E) => RIO<R2, E2>) {
  return <R, A>(self: Effect<R, E, A>) => chainError_(self, f)
}

/**
 * Creates a composite effect that represents this effect followed by another
 * one that may depend on the error produced by this one.
 */
export function chainError_<R, E, A, R2, E2>(
  self: Effect<R, E, A>,
  f: (e: E) => RIO<R2, E2>
) {
  return flipWith_(self, chain(f))
}
