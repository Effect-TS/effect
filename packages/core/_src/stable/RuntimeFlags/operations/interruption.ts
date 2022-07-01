import { RuntimeFlags } from "@effect/core/stable/RuntimeFlags/definition"

/**
 * @tsplus getter effect/core/stable/RuntimeFlags interruption
 */
export function interruption(self: RuntimeFlags): boolean {
  return self.isEnabled(RuntimeFlags.Interruption)
}
