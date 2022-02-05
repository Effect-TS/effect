// ets_tracing: off

import * as CS from "../../../../Cause/index.js"
import * as O from "../../../../Option/index.js"
import * as CH from "../../Channel/index.js"
import * as C from "../core.js"

/**
 * Keeps some of the errors, and terminates the fiber with the rest, using
 * the specified function to convert the `E` into a `Throwable`.
 */
export function refineOrDieWith_<R, E, E1, A>(
  self: C.Stream<R, E, A>,
  pf: (e: E) => O.Option<E1>,
  f: (e: E) => any
): C.Stream<R, E | E1, A> {
  return new C.Stream(
    CH.catchAll_(self.channel, (e) =>
      O.fold_(
        pf(e),
        () => CH.failCause(CS.die(f(e))),
        (e1) => CH.fail(e1)
      )
    )
  )
}

/**
 * Keeps some of the errors, and terminates the fiber with the rest, using
 * the specified function to convert the `E` into a `Throwable`.
 *
 * @ets_data_first refineOrDieWith_
 */
export function refineOrDieWith<E, E1>(pf: (e: E) => O.Option<E1>, f: (e: E) => any) {
  return <R, A>(self: C.Stream<R, E, A>) => refineOrDieWith_(self, pf, f)
}
