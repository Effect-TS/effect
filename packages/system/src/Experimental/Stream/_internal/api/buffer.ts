// ets_tracing: off

import * as CS from "../../../../Cause/index.js"
import * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import * as Ex from "../../../../Exit/index.js"
import * as O from "../../../../Option/index.js"
import * as Q from "../../../../Queue/index.js"
import * as CH from "../../Channel/index.js"
import * as C from "../core.js"
import * as ToQueueOfElements from "./toQueueOfElements.js"

/**
 * Allows a faster producer to progress independently of a slower consumer by buffering
 * up to `capacity` chunks in a queue.
 */
export function buffer_<R, E, A>(
  self: C.Stream<R, E, A>,
  capacity: number
): C.Stream<R, E, A> {
  const queue = ToQueueOfElements.toQueueOfElements_(self, capacity)

  return new C.Stream(
    CH.managed_(queue, (queue) => {
      const process: CH.Channel<
        unknown,
        unknown,
        unknown,
        unknown,
        E,
        CK.Chunk<A>,
        void
      > = CH.chain_(
        CH.fromEffect(Q.take(queue)),
        Ex.fold(
          (_) =>
            O.fold_(
              CS.flipCauseOption(_),
              () => CH.end(undefined),
              (_) => CH.failCause(_)
            ),
          (value) => CH.zipRight_(CH.write(CK.single(value)), process)
        )
      )

      return process
    })
  )
}

/**
 * Allows a faster producer to progress independently of a slower consumer by buffering
 * up to `capacity` chunks in a queue.
 *
 * @ets_data_first buffer_
 */
export function buffer(capacity: number) {
  return <R, E, A>(self: C.Stream<R, E, A>) => buffer_(self, capacity)
}
