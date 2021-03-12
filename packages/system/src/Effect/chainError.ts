// tracing: off

import { chain } from "./core"
import type { Effect, RIO } from "./effect"
import { flipWith_ } from "./flipWith"

/**
 * Creates a composite effect that represents this effect followed by another
 * one that may depend on the error produced by this one.
 *
 * @dataFirst chainError_
 */
export function chainError<E, R2, E2>(f: (e: E) => RIO<R2, E2>, __trace?: string) {
  return <R, A>(self: Effect<R, E, A>) => chainError_(self, f, __trace)
}

/**
 * Creates a composite effect that represents this effect followed by another
 * one that may depend on the error produced by this one.
 */
export function chainError_<R, E, A, R2, E2>(
  self: Effect<R, E, A>,
  f: (e: E) => RIO<R2, E2>,
  __trace?: string
) {
  return flipWith_(self, chain(f, __trace))
}
