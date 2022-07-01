import type { RuntimeFlags } from "@effect/core/stable/RuntimeFlags/definition"
import type { Patch } from "@effect/core/stable/RuntimeFlags/Patch/definition"

/**
 * @tsplus pipeable effect/core/stable/RuntimeFlags/Patch isDisabled
 */
export function isDisabled(flag: RuntimeFlags.Flag): (self: Patch) => boolean {
  return (self) => self.isActive(flag) && ((self.enabled & flag) !== 0)
}
