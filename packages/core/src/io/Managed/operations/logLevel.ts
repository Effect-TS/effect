import { FiberRef } from "../../FiberRef"
import type { LogLevel } from "../../LogLevel"
import type { Managed } from "../definition"

/**
 * Sets the log level for managed effects composed after this.
 *
 * @tsplus static ets/ManagedOps logLevel
 */
export function logLevel(
  level: LogLevel,
  __tsplusTrace?: string
): Managed<unknown, never, void> {
  return FiberRef.currentLogLevel.value.locallyManaged(level)
}
