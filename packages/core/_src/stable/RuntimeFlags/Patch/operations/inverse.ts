import { Patch } from "@effect/core/stable/RuntimeFlags/Patch/definition"

/**
 * @tsplus getter effect/core/stable/RuntimeFlags/Patch inverse
 */
export function inverse(self: Patch): Patch {
  return Patch(self.active, ~self.enabled)
}
