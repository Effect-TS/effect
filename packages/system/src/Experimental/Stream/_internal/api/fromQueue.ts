// ets_tracing: off

import * as CS from "../../../../Cause/index.js"
import * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import * as T from "../../../../Effect/index.js"
import { pipe } from "../../../../Function/index.js"
import * as Q from "../../../../Queue/index.js"
import * as Pull from "../../Pull/index.js"
import * as C from "../core.js"
import * as RepeatEffectChunkOption from "./repeatEffectChunkOption.js"

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
