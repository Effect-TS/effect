import { Patch } from "@effect/core/stable/RuntimeFlags/Patch/definition"

/**
 * @tsplus pipeable effect/core/stable/RuntimeFlags/Patch both
 */
export function both(that: Patch): (self: Patch) => Patch {
  return self => Patch(self.active | that.active, self.enabled & that.enabled)
}
