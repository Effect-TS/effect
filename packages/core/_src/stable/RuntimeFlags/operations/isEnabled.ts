import type { RuntimeFlags } from "@effect/core/stable/RuntimeFlags/definition"

/**
 * @tsplus pipeable effect/core/stable/RuntimeFlags isEnabled
 */
export function isEnabled(flag: RuntimeFlags.Flag) {
  return (self: RuntimeFlags): boolean => !!(self & flag)
}
