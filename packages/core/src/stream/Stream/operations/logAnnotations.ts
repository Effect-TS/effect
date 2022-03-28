import type { Map } from "../../../collection/immutable/Map"
import { FiberRef } from "../../../io/FiberRef"
import { Stream } from "../definition"

/**
 * Retrieves the log annotations associated with the current scope.
 *
 * @tsplus static ets/StreamOps logAnnotations
 */
export function logAnnotations(
  __tsplusTrace?: string
): Stream<unknown, never, Map<string, string>> {
  return Stream.fromEffect(FiberRef.currentLogAnnotations.value.get())
}
