// ets_tracing: off

import * as E from "../../Either/index.js"
import { chain_ } from "./chain.js"
import type { Stream } from "./definitions.js"
import { fail } from "./fail.js"
import { succeed } from "./succeed.js"

/**
 * Submerges the error case of an `Either` into the `Stream`.
 */
export function absolve<R, E, E2, O>(
  xs: Stream<R, E, E.Either<E2, O>>
): Stream<R, E | E2, O> {
  return chain_(xs, E.fold(fail, succeed))
}
