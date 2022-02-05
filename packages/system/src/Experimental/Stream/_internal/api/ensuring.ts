// ets_tracing: off

import type * as T from "../../../../Effect/index.js"
import * as CH from "../../Channel/index.js"
import * as C from "../core.js"

/**
 * Executes the provided finalizer after this stream's finalizers run.
 */
export function ensuring_<R, R1, E, A, Z>(
  self: C.Stream<R, E, A>,
  fin: T.Effect<R1, never, Z>
): C.Stream<R & R1, E, A> {
  return new C.Stream(CH.ensuring_(self.channel, fin))
}

/**
 * Executes the provided finalizer after this stream's finalizers run.
 *
 * @ets_data_first ensuring_
 */
export function ensuring<R1, Z>(fin: T.Effect<R1, never, Z>) {
  return <R, E, A>(self: C.Stream<R, E, A>) => ensuring_(self, fin)
}
