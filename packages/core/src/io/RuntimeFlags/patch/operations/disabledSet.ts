/**
 * @tsplus getter effect/core/io/RuntimeFlags.Patch disabledSet
 * @category getters
 * @since 1.0.0
 */
export function disabledSet(self: RuntimeFlags.Patch) {
  return ((self.active & ~self.enabled) as RuntimeFlags).toSet
}
