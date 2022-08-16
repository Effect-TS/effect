/**
 * @tsplus pipeable effect/core/io/RuntimeFlags/Patch both
 */
export function both(that: RuntimeFlags.Patch) {
  return (self: RuntimeFlags.Patch): RuntimeFlags.Patch =>
    RuntimeFlags.Patch(self.active | that.active, self.enabled & that.enabled)
}
