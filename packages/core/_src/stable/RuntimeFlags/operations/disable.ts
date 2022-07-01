import type { RuntimeFlags } from "@effect/core/stable/RuntimeFlags/definition"

/**
 * @tsplus pipeable effect/core/stable/RuntimeFlags disable
 */
export function disable(flag: RuntimeFlags.Flag) {
  return (self: RuntimeFlags): RuntimeFlags => (self & ~flag) as RuntimeFlags
}
