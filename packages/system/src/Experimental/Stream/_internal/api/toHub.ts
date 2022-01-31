// ets_tracing: off

import * as T from "../../../../Effect"
import { pipe } from "../../../../Function"
import * as H from "../../../../Hub"
import * as M from "../../../../Managed"
import type * as TK from "../../Take"
import type * as C from "../core.js"
import * as RunIntoHubManaged from "./runIntoHubManaged.js"

/**
 * Converts the stream to a managed hub of chunks. After the managed hub is used,
 * the hub will never again produce values and should be discarded.
 */
export function toHub_<R, E, A>(
  self: C.Stream<R, E, A>,
  capacity: number
): M.RIO<R, H.Hub<TK.Take<E, A>>> {
  return pipe(
    M.do,
    M.bind("hub", () =>
      T.toManagedRelease_(H.makeBounded<TK.Take<E, A>>(capacity), (_) => H.shutdown(_))
    ),
    M.tap(({ hub }) => M.fork(RunIntoHubManaged.runIntoHubManaged_(self, hub))),
    M.map(({ hub }) => hub)
  )
}

/**
 * Converts the stream to a managed hub of chunks. After the managed hub is used,
 * the hub will never again produce values and should be discarded.
 *
 * @ets_data_first toHub_
 */
export function toHub(capacity: number) {
  return <R, E, A>(self: C.Stream<R, E, A>) => toHub_(self, capacity)
}
