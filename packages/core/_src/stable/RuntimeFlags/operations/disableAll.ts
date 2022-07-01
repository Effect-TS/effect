import type { RuntimeFlags } from "@effect/core/stable/RuntimeFlags/definition"

/**
 * @tsplus pipeable effect/core/stable/RuntimeFlags disableAll
 */
export function disableAll(flags: RuntimeFlags) {
  return (self: RuntimeFlags): RuntimeFlags => (self & ~flags) as RuntimeFlags
}
