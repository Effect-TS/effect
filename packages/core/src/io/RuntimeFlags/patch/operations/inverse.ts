/**
 * @tsplus getter effect/core/io/RuntimeFlags.Patch inverse
 * @category mutations
 * @since 1.0.0
 */
export function inverse(self: RuntimeFlags.Patch): RuntimeFlags.Patch {
  return RuntimeFlags.Patch(self.active, ~self.enabled)
}
