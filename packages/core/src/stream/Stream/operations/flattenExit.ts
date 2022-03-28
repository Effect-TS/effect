import { Effect } from "../../../io/Effect"
import type { Exit } from "../../../io/Exit"
import type { Stream } from "../definition"

/**
 * Flattens `Exit` values. `Exit.Failure` values translate to stream
 * failures while `Exit.Success` values translate to stream elements.
 *
 * @tsplus fluent ets/Stream flattenExit
 */
export function flattenExit<R, E, E2, A>(
  self: Stream<R, E, Exit<E2, A>>,
  __tsplusTrace?: string
): Stream<R, E | E2, A> {
  return self.mapEffect((exit) => Effect.done(exit))
}
