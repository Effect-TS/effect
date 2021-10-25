// ets_tracing: off

import * as T from "../../../../Effect"
import type * as Ex from "../../../../Exit"
import { pipe } from "../../../../Function"
import * as M from "../../../../Managed"
import type * as O from "../../../../Option"
import * as Q from "../../../../Queue"
import type * as C from "../core"
import * as RunIntoElementsManaged from "./runIntoElementsManaged"

/**
 * Converts the stream to a managed queue of elements. After the managed queue is used,
 * the queue will never again produce values and should be discarded.
 */
export function toQueueOfElements_<R, E, A>(
  self: C.Stream<R, E, A>,
  capacity = 2
): M.RIO<R, Q.Queue<Ex.Exit<O.Option<E>, A>>> {
  return pipe(
    M.do,
    M.bind("queue", () =>
      T.toManagedRelease_(Q.makeBounded<Ex.Exit<O.Option<E>, A>>(capacity), Q.shutdown)
    ),
    M.tap(({ queue }) =>
      M.fork(RunIntoElementsManaged.runIntoElementsManaged_(self, queue))
    ),
    M.map(({ queue }) => queue)
  )
}

/**
 * Converts the stream to a managed queue of elements. After the managed queue is used,
 * the queue will never again produce values and should be discarded.
 *
 * @ets_data_first toQueueOfElements_
 */
export function toQueueOfElements(capacity = 2) {
  return <R, E, A>(self: C.Stream<R, E, A>) => toQueueOfElements_(self, capacity)
}
