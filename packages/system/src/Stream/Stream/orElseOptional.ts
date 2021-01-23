import * as O from "../../Option"
import { catchAll_ } from "./catchAll"
import type { Stream } from "./definitions"
import { fail } from "./fail"

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
