// ets_tracing: off

import { pipe } from "../../Function"
import * as Q from "../../Queue"
import * as Ref from "../../Ref"
import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import * as Pull from "../Pull"
import * as Take from "../Take"
import { Stream } from "./definitions"
import { toQueueUnbounded } from "./toQueueUnbounded"

/**
 * Allows a faster producer to progress independently of a slower consumer by buffering
 * elements into an unbounded queue.
 */
export function bufferUnbounded<R, E, O>(self: Stream<R, E, O>): Stream<R, E, O> {
  return new Stream(
    pipe(
      M.do,
      M.bind("done", () => T.toManaged(Ref.makeRef(true))),
      M.bind("queue", () => toQueueUnbounded(self)),
      M.map(({ done, queue }) =>
        T.chain_(done.get, (_) => {
          if (_) {
            return Pull.end
          } else {
            return T.chain_(
              Q.take(queue),
              Take.foldM(
                () => T.zipRight_(done.set(true), Pull.end),
                Pull.halt,
                Pull.emitChunk
              )
            )
          }
        })
      )
    )
  )
}
