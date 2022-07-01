import type { Patch } from "@effect/core/stable/RuntimeFlags/Patch/definition"

/**
 * @tsplus pipeable effect/core/stable/RuntimeFlags/Patch andThen
 */
export function andThen(that: Patch): (self: Patch) => Patch {
  return self => (self | that) as Patch
}
