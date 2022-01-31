// ets_tracing: off

import * as CS from "../../../../Cause/index.js"
import type * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import * as T from "../../../../Effect/index.js"
import { pipe } from "../../../../Function/index.js"
import * as Q from "../../../../Queue/index.js"
import * as Pull from "../../Pull/index.js"
import type * as C from "../core.js"
import * as RepeatEffectChunkOption from "./repeatEffectChunkOption.js"

/**
 * Creates a stream from a queue of values
 */
export function fromChunkQueue<R, E, O>(
  queue: Q.XQueue<never, R, unknown, E, never, CK.Chunk<O>>
): C.Stream<R, E, O> {
  return RepeatEffectChunkOption.repeatEffectChunkOption(
    pipe(
      queue,
      Q.take,
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
