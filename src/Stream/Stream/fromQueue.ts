import * as C from "../../Cause"
import { pipe } from "../../Function"
import * as Q from "../../Queue"
import * as T from "../_internal/effect"
import * as Pull from "../Pull"
import type { Stream } from "./definitions"
import { repeatEffectChunkOption } from "./repeatEffectChunkOption"

/**
 * Creates a stream from a {@link XQueue} of values
 */
export function fromQueue<R, E, O>(
  queue: Q.XQueue<never, R, unknown, E, never, O>
): Stream<R, E, O> {
  return pipe(
    queue,
    Q.takeBetween(1, Number.MAX_SAFE_INTEGER),
    T.catchAllCause((c) =>
      T.chain_(queue.isShutdown, (down) =>
        down && C.interrupted(c) ? Pull.end : Pull.halt(c)
      )
    ),
    repeatEffectChunkOption
  )
}
