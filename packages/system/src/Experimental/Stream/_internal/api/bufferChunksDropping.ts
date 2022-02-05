// ets_tracing: off

import type * as Tp from "../../../../Collections/Immutable/Tuple/index.js"
import * as T from "../../../../Effect/index.js"
import type * as P from "../../../../Promise/index.js"
import * as Q from "../../../../Queue/index.js"
import type * as TK from "../../Take/index.js"
import * as C from "../core.js"
import * as BufferSignal from "./_internal/bufferSignal.js"

/**
 * Allows a faster producer to progress independently of a slower consumer by buffering
 * up to `capacity` chunks in a dropping queue.
 */
export function bufferChunksDropping_<R, E, A>(
  self: C.Stream<R, E, A>,
  capacity: number
): C.Stream<R, E, A> {
  const queue = T.toManagedRelease_(
    Q.makeDropping<Tp.Tuple<[TK.Take<E, A>, P.Promise<never, void>]>>(capacity),
    Q.shutdown
  )

  return new C.Stream(BufferSignal.bufferSignal<R, E, A>(queue, self.channel))
}

/**
 * Allows a faster producer to progress independently of a slower consumer by buffering
 * up to `capacity` chunks in a dropping queue.
 *
 * @ets_data_first bufferChunksDropping_
 */
export function bufferChunksDropping(capacity: number) {
  return <R, E, A>(self: C.Stream<R, E, A>) => bufferChunksDropping_(self, capacity)
}
