// ets_tracing: off
import * as C from "../../Cause/index.js"
import { pipe } from "../../Function/index.js"
import * as Q from "../../Queue/index.js"
import * as T from "../_internal/effect.js"
import * as Pull from "../Pull/index.js"
import type { Stream } from "./definitions.js"
import { repeatEffectChunkOption } from "./repeatEffectChunkOption.js"

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
      T.chain_(Q.isShutdown(queue), (down) =>
        down && C.interrupted(c) ? Pull.end : Pull.halt(c)
      )
    ),
    repeatEffectChunkOption
  )
}
