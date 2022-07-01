import { allFlags } from "@effect/core/stable/RuntimeFlags/_internal"
import type { RuntimeFlags } from "@effect/core/stable/RuntimeFlags/definition"

/**
 * @tsplus getter effect/core/stable/RuntimeFlags toSet
 */
export function toSet(self: RuntimeFlags) {
  return new Set(Object.values(allFlags).filter((flag) => self.isEnabled(flag)))
}
