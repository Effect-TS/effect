/**
 * @tsplus getter effect/core/io/RuntimeFlags.Patch inverse
 */
export function inverse(self: RuntimeFlags.Patch): RuntimeFlags.Patch {
  return RuntimeFlags.Patch(self.active, ~self.enabled)
}
