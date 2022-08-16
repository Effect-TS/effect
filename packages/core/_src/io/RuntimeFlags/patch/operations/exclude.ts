/**
 * @tsplus pipeable effect/core/io/RuntimeFlags.Patch exclude
 */
export function exclude(flag: RuntimeFlags.Flag) {
  return (self: RuntimeFlags.Patch): RuntimeFlags.Patch =>
    RuntimeFlags.Patch(self.active & ~flag, self.enabled)
}
