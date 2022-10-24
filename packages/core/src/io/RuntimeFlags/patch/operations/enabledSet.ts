/**
 * @tsplus getter effect/core/io/RuntimeFlags.Patch enabledSet
 * @category getters
 * @since 1.0.0
 */
export function enabledSet(self: RuntimeFlags.Patch) {
  return ((self.active & self.enabled) as RuntimeFlags).toSet
}
