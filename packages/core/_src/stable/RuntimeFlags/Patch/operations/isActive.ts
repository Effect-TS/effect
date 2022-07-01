import type { RuntimeFlags } from "@effect/core/stable/RuntimeFlags/definition"
import type { Patch } from "@effect/core/stable/RuntimeFlags/Patch/definition"

/**
 * @tsplus pipeable effect/core/stable/RuntimeFlags/Patch isActive
 */
export function isActive(flag: RuntimeFlags.Flag): (self: Patch) => boolean {
  return (self) => (self.active & flag) !== 0
}
