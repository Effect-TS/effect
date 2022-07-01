import { RuntimeFlags } from "@effect/core/stable/RuntimeFlags/definition"

/**
 * @tsplus getter effect/core/stable/RuntimeFlags fiberRoots
 */
export function fiberRoots(self: RuntimeFlags): boolean {
  return self.isEnabled(RuntimeFlags.FiberRoots)
}
