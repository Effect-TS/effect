import type { RuntimeFlags } from "@effect/core/stable/RuntimeFlags/definition"
import { Patch } from "@effect/core/stable/RuntimeFlags/Patch/definition"

/**
 * @tsplus pipeable effect/core/stable/RuntimeFlags/Patch exclude
 */
export function exclude(flag: RuntimeFlags.Flag): (self: Patch) => Patch {
  return (self) => Patch(self.active & ~flag, self.enabled)
}
