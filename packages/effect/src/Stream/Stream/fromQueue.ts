import { interrupted } from "../../Cause/core"
import { catchAllCause } from "../../Effect/catchAllCause_"
import { chain_ } from "../../Effect/core"
import { pipe } from "../../Function"
import type { XQueue } from "../../Queue"
import { takeBetween } from "../../Queue"
import { end, halt } from "../Pull"
import type { AsyncRE } from "./definitions"
import { repeatEffectChunkOption } from "./repeatEffectChunkOption"

/**
 * Creates a stream from a {@link XQueue} of values
 */
export function fromQueue<R, E, O>(
  queue: XQueue<never, R, unknown, E, never, O>
): AsyncRE<R, E, O> {
  return pipe(
    queue,
    takeBetween(1, Number.MAX_SAFE_INTEGER),
    catchAllCause((c) =>
      chain_(queue.isShutdown, (down) => (down && interrupted(c) ? end : halt(c)))
    ),
    repeatEffectChunkOption
  )
}
