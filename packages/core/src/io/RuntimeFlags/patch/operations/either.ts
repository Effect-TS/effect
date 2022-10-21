/**
 * @tsplus pipeable effect/core/io/RuntimeFlags.Patch either
 */
export function either(that: RuntimeFlags.Patch) {
  return (self: RuntimeFlags.Patch): RuntimeFlags.Patch =>
    RuntimeFlags.Patch(self.active | that.active, self.enabled | that.enabled)
}
