// ets_tracing: off

import * as E from "../Either"
import { succeed } from "./core"
import type { Effect, RIO } from "./effect"
import { foldM_ } from "./foldM"

/**
 * Returns an effect whose failure and success have been lifted into an
 * `Either`. The resulting effect cannot fail, because the failure case has
 * been exposed as part of the `Either` success case.
 *
 * This method is useful for recovering from effects that may fail.
 *
 * The error parameter of the returned is `never`, since it is
 * guaranteed the effect does not model failure.
 */
export function either<R, E, A>(
  self: Effect<R, E, A>,
  __trace?: string
): RIO<R, E.Either<E, A>> {
  return foldM_(
    self,
    (e) => succeed(E.left(e)),
    (a) => succeed(E.right(a)),
    __trace
  )
}
