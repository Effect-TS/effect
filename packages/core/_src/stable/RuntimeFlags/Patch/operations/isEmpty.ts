import type { Patch } from "@effect/core/stable/RuntimeFlags/Patch/definition"

/**
 * @tsplus getter effect/core/stable/RuntimeFlags/Patch isEmpty
 */
export function isEmpty(self: Patch): boolean {
  return self.active === 0
}
