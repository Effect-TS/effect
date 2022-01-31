// ets_tracing: off

import * as T from "../../../../Effect/index.js"
import { pipe } from "../../../../Function/index.js"
import * as M from "../../../../Managed/index.js"
import * as Q from "../../../../Queue/index.js"
import type * as TK from "../../Take/index.js"
import type * as C from "../core.js"
import * as RunIntoManaged from "./runIntoManaged.js"

/**
 * Converts the stream to a managed queue of chunks. After the managed queue is used,
 * the queue will never again produce values and should be discarded.
 */
export function toQueue_<R, E, A>(
  self: C.Stream<R, E, A>,
  capacity = 2
): M.RIO<R, Q.Queue<TK.Take<E, A>>> {
  return pipe(
    M.do,
    M.bind("queue", () =>
      T.toManagedRelease_(Q.makeBounded<TK.Take<E, A>>(capacity), Q.shutdown)
    ),
    M.tap(({ queue }) => M.fork(RunIntoManaged.runIntoManaged_(self, queue))),
    M.map(({ queue }) => queue)
  )
}

/**
 * Converts the stream to a managed queue of chunks. After the managed queue is used,
 * the queue will never again produce values and should be discarded.
 *
 * @ets_data_first toQueue_
 */
export function toQueue(capacity = 2) {
  return <R, E, A>(self: C.Stream<R, E, A>) => toQueue_(self, capacity)
}
