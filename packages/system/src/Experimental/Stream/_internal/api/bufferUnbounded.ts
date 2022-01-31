// ets_tracing: off

import type * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import * as Q from "../../../../Queue/index.js"
import * as CH from "../../Channel/index.js"
import * as TK from "../../Take/index.js"
import * as C from "../core.js"
import * as ToQueueUnbounded from "./toQueueUnbounded.js"

/**
 * Allows a faster producer to progress independently of a slower consumer by buffering
 * elements into an unbounded queue.
 */
export function bufferUnbounded<R, E, A>(self: C.Stream<R, E, A>): C.Stream<R, E, A> {
  const queue = ToQueueUnbounded.toQueueUnbounded(self)

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
        TK.fold(
          CH.end(undefined),
          (error) => CH.failCause(error),
          (value) => CH.zipRight_(CH.write(value), process)
        )
      )

      return process
    })
  )
}
