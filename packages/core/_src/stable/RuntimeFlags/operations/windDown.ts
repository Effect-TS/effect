import { RuntimeFlags } from "@effect/core/stable/RuntimeFlags/definition"

/**
 * @tsplus getter effect/core/stable/RuntimeFlags windDown
 */
export function windDown(self: RuntimeFlags): boolean {
  return self.isEnabled(RuntimeFlags.WindDown)
}
