import { base } from "@effect/core/io/RuntimeFlags/patch/_internal/base"

/**
 * @tsplus getter effect/core/io/RuntimeFlags.Patch enabled
 */
export function enabled(self: RuntimeFlags.Patch): number {
  return (self >> 16) & base
}
