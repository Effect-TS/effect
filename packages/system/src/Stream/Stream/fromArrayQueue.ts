import * as T from "../_internal/effect"
import type { Array } from "../../Array"
import * as Cause from "../../Cause"
import type { XQueue } from "../../Queue"
import { end, halt } from "../Pull"
import type { AsyncRE } from "./definitions"
import { repeatEffectChunkOption } from "./repeatEffectChunkOption"

export function fromArrayQueue<S, R, E, O>(
  queue: XQueue<never, R, unknown, E, never, Array<O>>
): AsyncRE<R, E, O> {
  return repeatEffectChunkOption(
    T.catchAllCause_(queue.take, (c) =>
      T.chain_(queue.isShutdown, (down) =>
        down && Cause.interrupted(c) ? end : halt(c)
      )
    )
  )
}
