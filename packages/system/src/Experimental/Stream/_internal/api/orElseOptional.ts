// ets_tracing: off

import * as O from "../../../../Option/index.js"
import type * as C from "../core.js"
import * as CatchAll from "./catchAll.js"
import * as Fail from "./fail.js"

/**
 * Switches to the provided stream in case this one fails with the `None` value.
 *
 * See also `Stream#catchAll`.
 */
export function orElseOptional_<R, R1, E, E1, A, A1>(
  self: C.Stream<R, O.Option<E>, A>,
  that: C.Stream<R1, O.Option<E1>, A1>
): C.Stream<R & R1, O.Option<E | E1>, A | A1> {
  return CatchAll.catchAll_(
    self,
    O.fold(
      (): C.Stream<R & R1, O.Option<E | E1>, A | A1> => that,
      (e) => Fail.fail(O.some(e))
    )
  )
}

/**
 * Switches to the provided stream in case this one fails with the `None` value.
 *
 * See also `Stream#catchAll`.
 *
 * @ets_data_first orElseOptional_
 */
export function orElseOptional<R1, E1, A1>(that: C.Stream<R1, O.Option<E1>, A1>) {
  return <R, E, A>(self: C.Stream<R, O.Option<E>, A>) => orElseOptional_(self, that)
}
