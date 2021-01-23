import * as E from "../Either/core"
import { flow } from "../Function"
import { chain_, effectTotal, succeed } from "./core"
import type { UIO } from "./effect"

/**
 *  Returns an effect with the value on the left part.
 */
export function left<A>(a: () => A): UIO<E.Either<A, never>> {
  return chain_(effectTotal(a), flow(E.left, succeed))
}
