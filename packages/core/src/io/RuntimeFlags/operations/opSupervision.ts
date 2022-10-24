/**
 * @tsplus getter effect/core/io/RuntimeFlags opSupervision
 * @category getters
 * @since 1.0.0
 */
export function opSupervision(self: RuntimeFlags): boolean {
  return self.isEnabled(RuntimeFlags.OpSupervision)
}
