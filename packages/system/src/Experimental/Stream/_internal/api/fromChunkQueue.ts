// ets_tracing: off

import * as CS from "../../../../Cause"
import type * as CK from "../../../../Collections/Immutable/Chunk"
import * as T from "../../../../Effect"
import { pipe } from "../../../../Function"
import * as Q from "../../../../Queue"
import * as Pull from "../../Pull"
import type * as C from "../core"
import * as RepeatEffectChunkOption from "./repeatEffectChunkOption"

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
