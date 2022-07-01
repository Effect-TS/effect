import { RuntimeFlags } from "@effect/core/stable/RuntimeFlags/definition"

/**
 * @tsplus getter effect/core/stable/RuntimeFlags currentFiber
 */
export function currentFiber(self: RuntimeFlags): boolean {
  return self.isEnabled(RuntimeFlags.CurrentFiber)
}
