import { RuntimeFlags } from "@effect/core/stable/RuntimeFlags/definition"

/**
 * @tsplus getter effect/core/stable/RuntimeFlags cooperativeYielding
 */
export function cooperativeYielding(self: RuntimeFlags): boolean {
  return self.isEnabled(RuntimeFlags.CooperativeYielding)
}
