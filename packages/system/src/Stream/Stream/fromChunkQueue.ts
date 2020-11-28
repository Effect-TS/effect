import type * as A from "../../Array"
import * as C from "../../Cause"
import type * as Q from "../../Queue"
import * as T from "../_internal/effect"
import * as Pull from "../Pull"
import type { Stream } from "./definitions"
import { repeatEffectChunkOption } from "./repeatEffectChunkOption"

/**
 * Creates a stream from a {@link XQueue} of values
 */
export function fromChunkQueue<R, E, O>(
  queue: Q.XQueue<never, R, unknown, E, never, A.Array<O>>
): Stream<R, E, O> {
  return repeatEffectChunkOption(
    T.catchAllCause_(queue.take, (c) =>
      T.chain_(queue.isShutdown, (down) =>
        down && C.interrupted(c) ? Pull.end : Pull.halt(c)
      )
    )
  )
}
