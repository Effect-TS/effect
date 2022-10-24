/**
 * @tsplus pipeable effect/core/io/RuntimeFlags.Patch exclude
 * @category mutations
 * @since 1.0.0
 */
export function exclude(flag: RuntimeFlags.Flag) {
  return (self: RuntimeFlags.Patch): RuntimeFlags.Patch =>
    RuntimeFlags.Patch(self.active & ~flag, self.enabled)
}
