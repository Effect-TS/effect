import * as E from "../Either"
import { chain_ } from "./core"
import type { Effect } from "./effect"
import { fromEither } from "./fromEither"

/**
 * Returns an effect that submerges the error case of an `Either` into the
 * `Effect`.
 */
export function absolve<R, E, E2, A>(v: Effect<R, E, E.Either<E2, A>>) {
  return chain_(v, (e) => fromEither(() => e))
}
