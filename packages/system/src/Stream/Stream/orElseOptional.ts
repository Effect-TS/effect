// ets_tracing: off

import * as O from "../../Option/index.js"
import { catchAll_ } from "./catchAll.js"
import type { Stream } from "./definitions.js"
import { fail } from "./fail.js"

/**
 * Switches to the provided stream in case this one fails with the `None` value.
 *
 * See also `Stream#catchAll`.
 */
export function orElseOptional_<R, R1, E1, O, O1>(
  self: Stream<R, O.Option<E1>, O>,
  that: Stream<R1, O.Option<E1>, O1>
): Stream<R & R1, O.Option<E1>, O1 | O> {
  return catchAll_(
    self,
    O.fold(
      () => that,
      (e) => fail(O.some(e))
    )
  )
}

/**
 * Switches to the provided stream in case this one fails with the `None` value.
 *
 * See also `Stream#catchAll`.
 */
export function orElseOptional<R1, E1, O1>(that: Stream<R1, O.Option<E1>, O1>) {
  return <R, O>(self: Stream<R, O.Option<E1>, O>) => orElseOptional_(self, that)
}
