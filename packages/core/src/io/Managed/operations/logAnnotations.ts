import type { Map } from "../../../collection/immutable/Map"
import { FiberRef } from "../../FiberRef"
import { Managed } from "../definition"

/**
 * Retrieves current log annotations.
 *
 * @tsplus static ets/ManagedOps logAnnotations
 */
export function logAnnotations(
  __tsplusTrace?: string
): Managed<unknown, never, Map<string, string>> {
  return Managed.fromEffect(FiberRef.currentLogAnnotations.value.get())
}
