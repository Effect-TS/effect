/**
 * @tsplus getter effect/core/io/RuntimeFlags interruption
 * @category getters
 * @since 1.0.0
 */
export function interruption(self: RuntimeFlags): boolean {
  return self.isEnabled(RuntimeFlags.Interruption)
}
