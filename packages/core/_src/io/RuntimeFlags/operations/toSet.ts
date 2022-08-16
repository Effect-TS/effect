import { allFlags } from "@effect/core/io/RuntimeFlags/_internal/allFlags"

/**
 * @tsplus getter effect/core/io/RuntimeFlags toSet
 */
export function toSet(self: RuntimeFlags) {
  return new Set(Object.values(allFlags).filter((flag) => self.isEnabled(flag)))
}
