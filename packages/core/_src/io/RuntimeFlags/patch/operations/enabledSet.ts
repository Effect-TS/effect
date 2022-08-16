/**
 * @tsplus getter effect/core/io/RuntimeFlags.Patch enabledSet
 */
export function enabledSet(self: RuntimeFlags.Patch) {
  return ((self.active & self.enabled) as RuntimeFlags).toSet
}
