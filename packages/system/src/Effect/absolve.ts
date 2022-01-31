// ets_tracing: off

import * as E from "../Either/index.js"
import { chain_ } from "./core.js"
import type { Effect } from "./effect.js"
import { fromEither } from "./fromEither.js"

/**
 * Returns an effect that submerges the error case of an `Either` into the
 * `Effect`.
 */
export function absolve<R, E, E2, A>(
  v: Effect<R, E, E.Either<E2, A>>,
  __trace?: string
) {
  return chain_(v, (e) => fromEither(() => e), __trace)
}
