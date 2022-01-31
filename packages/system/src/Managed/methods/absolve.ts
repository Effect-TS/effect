// ets_tracing: off

import * as E from "../../Either/index.js"
import { chain_ } from "../core.js"
import type { Managed } from "../managed.js"
import { fromEither } from "./fromEither.js"

/**
 * Submerges the error case of an `Either` into the `Managed`. The inverse
 * operation of `Managed.either`.
 */
export function absolve<R, E, E2, A>(
  self: Managed<R, E, E.Either<E2, A>>,
  __trace?: string
) {
  return chain_(self, fromEither, __trace)
}
