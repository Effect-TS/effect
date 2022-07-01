import type { RuntimeFlags } from "@effect/core/stable/RuntimeFlags/definition"
import type { Patch } from "@effect/core/stable/RuntimeFlags/Patch/definition"

/**
 * @tsplus pipeable effect/core/stable/RuntimeFlags patch
 */
export function patch(patch: Patch): (self: RuntimeFlags) => RuntimeFlags {
  return (self) =>
    (
      (self & (~patch.active | patch.enabled)) |
      (patch.active & patch.enabled)
    ) as RuntimeFlags
}
