// tracing: off

import * as E from "../../Either"
import { chain_ } from "../core"
import type { Managed } from "../managed"
import { fromEither } from "./fromEither"

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
