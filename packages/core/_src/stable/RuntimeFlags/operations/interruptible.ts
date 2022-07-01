import type { RuntimeFlags } from "@effect/core/stable/RuntimeFlags/definition"

/**
 * @tsplus getter effect/core/stable/RuntimeFlags interruptible
 */
export function interruptible(self: RuntimeFlags): boolean {
  return self.interruption && !self.windDown
}
