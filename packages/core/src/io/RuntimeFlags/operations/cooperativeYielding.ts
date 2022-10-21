/**
 * @tsplus getter effect/core/io/RuntimeFlags cooperativeYielding
 */
export function cooperativeYielding(self: RuntimeFlags): boolean {
  return self.isEnabled(RuntimeFlags.CooperativeYielding)
}
