import type { LazyArg } from "../../../data/Function"
import { FiberRef } from "../../FiberRef"
import { LogSpan } from "../../LogSpan"
import type { Managed } from "../definition"

/**
 * Adjusts the label for the logging span for managed effects composed after
 * this.
 *
 * @tsplus static ets/ManagedOps logSpan
 */
export function logSpan(
  label: LazyArg<string>,
  __tsplusTrace?: string
): Managed<unknown, never, void> {
  return FiberRef.currentLogSpan.value
    .get()
    .toManaged()
    .flatMap((stack) => {
      const now = Date.now()
      const logSpan = LogSpan(label(), now)
      return FiberRef.currentLogSpan.value.locallyManaged(stack.prepend(logSpan))
    })
}
