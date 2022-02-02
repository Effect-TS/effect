// ets_tracing: off

import * as T from "../../../../Effect/index.js"
import * as M from "../../../../Managed/index.js"
import type * as Q from "../../../../Queue/index.js"
import type * as TK from "../../Take/index.js"
import type * as C from "../core.js"
import * as RunIntoManaged from "./runIntoManaged.js"

/**
 * Enqueues elements of this stream into a queue. Stream failure and ending will also be
 * signalled.
 */
export function runInto_<R, R1, E extends E1, E1, A>(
  self: C.Stream<R, E, A>,
  queue: Q.XQueue<R1, never, never, unknown, TK.Take<E1, A>, any>
): T.Effect<R & R1, E | E1, void> {
  return M.use_(RunIntoManaged.runIntoManaged_(self, queue), (_) => T.unit)
}

/**
 * Enqueues elements of this stream into a queue. Stream failure and ending will also be
 * signalled.
 *
 * @ets_data_first runInto_
 */
export function runInto<R1, E1, A>(
  queue: Q.XQueue<R1, never, never, unknown, TK.Take<E1, A>, any>
) {
  return <R, E extends E1>(self: C.Stream<R, E, A>) => runInto_(self, queue)
}
