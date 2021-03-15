// tracing: off

import * as E from "../Either/core"
import { pipe } from "../Function"
import { chain_, effectTotal, succeed } from "./core"
import type { UIO } from "./effect"

/**
 * Returns an effect with the value on the left part.
 */
export function left<A>(a: () => A, __trace?: string): UIO<E.Either<A, never>> {
  return chain_(effectTotal(a), (x) => pipe(x, E.left, succeed), __trace)
}
