// ets_tracing: off

import { pipe } from "../../Function/index.js"
import * as Q from "../../Queue/index.js"
import * as Ref from "../../Ref/index.js"
import * as T from "../_internal/effect.js"
import * as M from "../_internal/managed.js"
import * as Pull from "../Pull/index.js"
import * as Take from "../Take/index.js"
import { Stream } from "./definitions.js"
import { toQueueUnbounded } from "./toQueueUnbounded.js"

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
