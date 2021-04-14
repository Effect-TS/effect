// tracing: off

import * as E from "../Either/core"
import { chain_, effectTotal, succeed } from "./core"
import type { UIO } from "./effect"

/**
 * Returns an effect with the value on the left part.
 */
export function toLeftWith<A>(a: () => A, __trace?: string): UIO<E.Either<A, never>> {
  return chain_(effectTotal(a), (x) => succeed(E.left(x)), __trace)
}

/**
 * Returns an effect with the value on the left part.
 */
export function toLeft<A>(a: A, __trace?: string): UIO<E.Either<A, never>> {
  return succeed(E.left(a), __trace)
}
