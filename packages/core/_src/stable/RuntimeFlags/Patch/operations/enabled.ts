import { base } from "@effect/core/stable/RuntimeFlags/Patch/_internal"
import type { Patch } from "@effect/core/stable/RuntimeFlags/Patch/definition"

/**
 * @tsplus getter effect/core/stable/RuntimeFlags/Patch enabled
 */
export function enabled(self: Patch): number {
  return (self >> 16) & base
}
