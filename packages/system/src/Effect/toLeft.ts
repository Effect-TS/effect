// ets_tracing: off

import * as E from "../Either/core.js"
import { chain_, succeed, succeedWith } from "./core.js"
import type { UIO } from "./effect.js"

/**
 * Returns an effect with the value on the left part.
 */
export function toLeftWith<A>(a: () => A, __trace?: string): UIO<E.Either<A, never>> {
  return chain_(succeedWith(a), (x) => succeed(E.left(x)), __trace)
}

/**
 * Returns an effect with the value on the left part.
 */
export function toLeft<A>(a: A, __trace?: string): UIO<E.Either<A, never>> {
  return succeed(E.left(a), __trace)
}
