// ets_tracing: off

import * as CS from "../../../../Cause"
import * as CK from "../../../../Collections/Immutable/Chunk"
import * as T from "../../../../Effect"
import { pipe } from "../../../../Function"
import * as Q from "../../../../Queue"
import * as Pull from "../../Pull"
import * as C from "../core"
import * as RepeatEffectChunkOption from "./repeatEffectChunkOption"

/**
 * Creates a stream from a `XQueue` of values
 */
export function fromQueue_<R, E, O>(
  queue: Q.XQueue<never, R, unknown, E, never, O>,
  maxChunkSize: number = C.DEFAULT_CHUNK_SIZE
): C.Stream<R, E, O> {
  return RepeatEffectChunkOption.repeatEffectChunkOption(
    pipe(
      Q.takeBetween_(queue, 1, maxChunkSize),
      T.map(CK.from),
      T.catchAllCause((c) =>
        T.chain_(Q.isShutdown(queue), (down) => {
          if (down && CS.interrupted(c)) {
            return Pull.end
          } else {
            return Pull.failCause(c)
          }
        })
      )
    )
  )
}

/**
 * Creates a stream from a `XQueue` of values
 */
export function fromQueue(maxChunkSize: number = C.DEFAULT_CHUNK_SIZE) {
  return <R, E, O>(queue: Q.XQueue<never, R, unknown, E, never, O>) =>
    fromQueue_(queue, maxChunkSize)
}
