import type { Either } from "../../Either"
import type { Managed } from "../definition"
import { chain_ } from "./chain"
import { fromEither } from "./fromEither"

/**
 * Submerges the error case of an `Either` into the `Managed`. The inverse
 * operation of `Managed.either`.
 */
export function absolve<R, E, E2, A>(
  self: Managed<R, E, Either<E2, A>>,
  __trace?: string
): Managed<R, E | E2, A> {
  return chain_(self, fromEither, __trace)
}
