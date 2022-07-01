import { base } from "@effect/core/stable/RuntimeFlags/Patch/_internal"
import type { Patch } from "@effect/core/stable/RuntimeFlags/Patch/definition"

/**
 * @tsplus getter effect/core/stable/RuntimeFlags/Patch active
 */
export function active(self: Patch): number {
  return (self >> 0) & base
}
