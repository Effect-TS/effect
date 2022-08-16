/**
 * @tsplus getter effect/core/io/RuntimeFlags.Patch disabledSet
 */
export function disabledSet(self: RuntimeFlags.Patch) {
  return ((self.active & ~self.enabled) as RuntimeFlags).toSet
}
