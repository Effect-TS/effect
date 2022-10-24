/**
 * @tsplus pipeable effect/core/io/RuntimeFlags.Patch either
 * @category mutations
 * @since 1.0.0
 */
export function either(that: RuntimeFlags.Patch) {
  return (self: RuntimeFlags.Patch): RuntimeFlags.Patch =>
    RuntimeFlags.Patch(self.active | that.active, self.enabled | that.enabled)
}
