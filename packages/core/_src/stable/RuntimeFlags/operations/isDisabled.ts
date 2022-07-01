import type { RuntimeFlags } from "@effect/core/stable/RuntimeFlags/definition"

/**
 * @tsplus pipeable effect/core/stable/RuntimeFlags isDisabled
 */
export function isDisabled(flag: RuntimeFlags.Flag) {
  return (self: RuntimeFlags): boolean => !self.isEnabled(flag)
}
