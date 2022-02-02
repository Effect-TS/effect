// ets_tracing: off

import * as E from "../../Either"
import { chain_ } from "./chain"
import type { Stream } from "./definitions"
import { fail } from "./fail"
import { succeed } from "./succeed"

/**
 * Submerges the error case of an `Either` into the `Stream`.
 */
export function absolve<R, E, E2, O>(
  xs: Stream<R, E, E.Either<E2, O>>
): Stream<R, E | E2, O> {
  return chain_(xs, E.fold(fail, succeed))
}
