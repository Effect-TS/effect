/**
 * @tsplus getter effect/core/io/RuntimeFlags currentFiber
 */
export function currentFiber(self: RuntimeFlags): boolean {
  return self.isEnabled(RuntimeFlags.CurrentFiber)
}
