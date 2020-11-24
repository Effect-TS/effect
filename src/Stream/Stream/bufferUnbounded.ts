import * as T from "../../Effect"
import { pipe } from "../../Function"
import * as M from "../../Managed"
import * as Ref from "../../Ref"
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
      M.bind("done", () => T.toManaged_(Ref.makeRef(true))),
      M.bind("queue", () => toQueueUnbounded(self)),
      M.map(({ done, queue }) =>
        T.chain_(done.get, (_) => {
          if (_) {
            return Pull.end
          } else {
            return T.chain_(
              queue.take,
              Take.foldM(
                () => T.andThen_(done.set(true), Pull.end),
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
