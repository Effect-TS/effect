import { base } from "@effect/core/io/RuntimeFlags/patch/_internal/base"

/**
 * @tsplus getter effect/core/io/RuntimeFlags.Patch active
 */
export function active(self: RuntimeFlags.Patch): number {
  return (self >> 0) & base
}
