/**
 * @tsplus getter effect/core/io/RuntimeFlags currentFiber
 * @category getters
 * @since 1.0.0
 */
export function currentFiber(self: RuntimeFlags): boolean {
  return self.isEnabled(RuntimeFlags.CurrentFiber)
}
