// ets_tracing: off

import * as T from "../../../../Effect/index.js"
import { pipe } from "../../../../Function/index.js"
import * as M from "../../../../Managed/index.js"
import * as Q from "../../../../Queue/index.js"
import type * as TK from "../../Take/index.js"
import type * as C from "../core.js"
import * as RunIntoManaged from "./runIntoManaged.js"

/**
 * Converts the stream into an unbounded managed queue. After the managed queue
 * is used, the queue will never again produce values and should be discarded.
 */
export function toQueueUnbounded<R, E, A>(
  self: C.Stream<R, E, A>
): M.RIO<R, Q.Queue<TK.Take<E, A>>> {
  return pipe(
    M.do,
    M.bind("queue", () =>
      T.toManagedRelease_(Q.makeUnbounded<TK.Take<E, A>>(), Q.shutdown)
    ),
    M.tap(({ queue }) => M.fork(RunIntoManaged.runIntoManaged_(self, queue))),
    M.map(({ queue }) => queue)
  )
}
