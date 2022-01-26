import * as C from "../../../collection/immutable/Chunk/core"
import type { Cause } from "../../Cause"
import { failures } from "../../Cause"
import { Effect } from "../definition"

/**
 * Exposes all parallel errors in a single call.
 *
 * @ets fluent ets/Effect parallelErrors
 */
export function parallelErrors<R, E, A>(
  self: Effect<R, E, A>,
  __etsTrace?: string
): Effect<R, C.Chunk<E>, A> {
  return self
    .foldCauseEffect((cause) => {
      const f = failures(cause)

      if (f.length === 0) {
        return Effect.failCauseNow(<Cause<never>>cause)
      } else {
        return Effect.failNow(f)
      }
    }, Effect.succeedNow)
    .mapError(C.from)
}
