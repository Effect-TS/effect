import type { RIO } from "../definition"
import { Effect } from "../definition"

/**
 * Returns a new effect where the error channel has been merged into the
 * success channel to their common combined type.
 *
 * @tsplus fluent ets/Effect merge
 */
export function merge<R, E, A>(
  self: Effect<R, E, A>,
  __tsplusTrace?: string
): RIO<R, E | A> {
  return self.foldEffect((e) => Effect.succeedNow(e), Effect.succeedNow)
}
