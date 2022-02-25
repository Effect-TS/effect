import { Chunk } from "../../../collection/immutable/Chunk"
import type { Cause } from "../../Cause"
import { failures } from "../../Cause"
import { Effect } from "../definition"

/**
 * Exposes all parallel errors in a single call.
 *
 * @tsplus fluent ets/Effect parallelErrors
 */
export function parallelErrors<R, E, A>(
  self: Effect<R, E, A>,
  __tsplusTrace?: string
): Effect<R, Chunk<E>, A> {
  return self
    .foldCauseEffect((cause) => {
      const f = failures(cause)
      return f.length === 0
        ? Effect.failCauseNow(<Cause<never>>cause)
        : Effect.failNow(f)
    }, Effect.succeedNow)
    .mapError(Chunk.from)
}
