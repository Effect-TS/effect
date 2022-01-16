// ets_tracing: off

import type { Either } from "../../Either"
import type { Effect } from "../definition"
import { suspendSucceed } from "."
import { chain_ } from "./chain"
import { fromEither } from "./fromEither"

/**
 * Submerges the error case of an `Either` into the `Effect`. The inverse
 * operation of `either`.
 */
export function absolve<R, E, A>(
  self: Effect<R, E, Either<E, A>>,
  __trace?: string
): Effect<R, E, A> {
  return chain_(
    suspendSucceed(() => self),
    (e) => fromEither(() => e),
    __trace
  )
}
