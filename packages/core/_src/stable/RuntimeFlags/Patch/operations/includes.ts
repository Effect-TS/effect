import type { RuntimeFlags } from "@effect/core/stable/RuntimeFlags/definition"
import type { Patch } from "@effect/core/stable/RuntimeFlags/Patch/definition"

/**
 * @tsplus pipeable effect/core/stable/RuntimeFlags/Patch includes
 */
export function includes(flag: RuntimeFlags.Flag): (self: Patch) => boolean {
  return (self) => (self.active & flag) !== 0
}
