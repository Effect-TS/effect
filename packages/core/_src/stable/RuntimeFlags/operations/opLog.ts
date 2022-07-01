import { RuntimeFlags } from "@effect/core/stable/RuntimeFlags/definition"

/**
 * @tsplus getter effect/core/stable/RuntimeFlags opLog
 */
export function opLog(self: RuntimeFlags): boolean {
  return self.isEnabled(RuntimeFlags.OpLog)
}
