import * as Map from "../../../collection/immutable/Map"
import type { LazyArg } from "../../../data/Function"
import { FiberRef } from "../../../io/FiberRef"
import { Stream } from "../definition"

/**
 * Annotates each log in streams composed after this with the specified log
 * annotation.
 *
 * @tsplus static ets/StreamOps logAnnotate
 */
export function logAnnotate(
  key: LazyArg<string>,
  value: LazyArg<string>,
  __tsplusTrace?: string
): Stream<unknown, never, void> {
  return Stream.scoped(
    FiberRef.currentLogAnnotations.value
      .get()
      .flatMap((annotations) =>
        FiberRef.currentLogAnnotations.value.locallyScoped(
          Map.insert_(annotations, key(), value())
        )
      )
  )
}
