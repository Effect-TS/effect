// ets_tracing: off

import * as T from "../../../../Effect"
import { pipe } from "../../../../Function"
import * as M from "../../../../Managed"
import * as Q from "../../../../Queue"
import type * as TK from "../../Take"
import type * as C from "../core"
import * as RunIntoManaged from "./runIntoManaged"

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
