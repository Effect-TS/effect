/**
 * @tsplus getter effect/core/io/RuntimeFlags cooperativeYielding
 * @category getters
 * @since 1.0.0
 */
export function cooperativeYielding(self: RuntimeFlags): boolean {
  return self.isEnabled(RuntimeFlags.CooperativeYielding)
}
