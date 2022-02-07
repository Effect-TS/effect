// ets_tracing: off

import type * as CS from "../../../../Cause/index.js"
import * as O from "../../../../Option/index.js"
import type * as C from "../core.js"
import * as CatchAllCause from "./catchAllCause.js"
import * as FailCause from "./failCause.js"

/**
 * Switches over to the stream produced by the provided function in case this one
 * fails with some errors. Allows recovery from all causes of failure, including interruption if the
 * stream is uninterruptible.
 */
export function catchSomeCause_<R, R1, E, E1, A, A1>(
  self: C.Stream<R, E, A>,
  pf: (e: CS.Cause<E>) => O.Option<C.Stream<R1, E1, A1>>
): C.Stream<R & R1, E | E1, A | A1> {
  return CatchAllCause.catchAllCause_(
    self,
    (e): C.Stream<R1, E | E1, A1> =>
      O.fold_(
        pf(e),
        () => FailCause.failCause(e),
        (_) => _
      )
  )
}

/**
 * Switches over to the stream produced by the provided function in case this one
 * fails with some errors. Allows recovery from all causes of failure, including interruption if the
 * stream is uninterruptible.
 *
 * @ets_data_first catchSomeCause_
 */
export function catchSomeCause<R1, E, E1, A1>(
  pf: (e: CS.Cause<E>) => O.Option<C.Stream<R1, E1, A1>>
) {
  return <R, A>(self: C.Stream<R, E, A>) => catchSomeCause_(self, pf)
}
