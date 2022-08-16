/**
 * @tsplus getter effect/core/io/RuntimeFlags diff
 */
export function diff(that: RuntimeFlags) {
  return (self: RuntimeFlags): RuntimeFlags.Patch => RuntimeFlags.Patch(self ^ that, self)
}
