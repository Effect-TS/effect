import type { RuntimeFlags } from "@effect/core/stable/RuntimeFlags/definition"
import type { Patch } from "@effect/core/stable/RuntimeFlags/Patch/definition"

/**
 * @tsplus getter effect/core/stable/RuntimeFlags/Patch disabledSet
 */
export function disabledSet(self: Patch) {
  return ((self.active & ~self.enabled) as RuntimeFlags).toSet
}
