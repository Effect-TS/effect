/**
 * @tsplus getter effect/core/io/RuntimeFlags fiberRoots
 */
export function fiberRoots(self: RuntimeFlags): boolean {
  return self.isEnabled(RuntimeFlags.FiberRoots)
}
