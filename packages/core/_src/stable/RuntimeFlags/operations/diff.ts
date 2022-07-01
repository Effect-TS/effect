import type { RuntimeFlags } from "@effect/core/stable/RuntimeFlags/definition"
import { Patch } from "@effect/core/stable/RuntimeFlags/Patch/definition"

/**
 * @tsplus getter effect/core/stable/RuntimeFlags diff
 */
export function diff(that: RuntimeFlags) {
  return (self: RuntimeFlags) => Patch(self ^ that, self)
}
