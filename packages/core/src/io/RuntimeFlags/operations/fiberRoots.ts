/**
 * @tsplus getter effect/core/io/RuntimeFlags fiberRoots
 * @category getters
 * @since 1.0.0
 */
export function fiberRoots(self: RuntimeFlags): boolean {
  return self.isEnabled(RuntimeFlags.FiberRoots)
}
