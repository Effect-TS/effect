import * as Map from "../../../collection/immutable/Map"
import type { LazyArg } from "../../../data/Function"
import { FiberRef } from "../../FiberRef"
import type { Managed } from "../definition"

/**
 * Annotates each log in managed effects composed after this.
 *
 * @tsplus static ets/ManagedOps logAnnotate
 */
export function logAnnotate(
  key: LazyArg<string>,
  value: LazyArg<string>,
  __tsplusTrace?: string
): Managed<unknown, never, void> {
  return FiberRef.currentLogAnnotations.value
    .get()
    .toManaged()
    .flatMap((annotations) =>
      FiberRef.currentLogAnnotations.value.locallyManaged(
        Map.insert_(annotations, key(), value())
      )
    )
}
