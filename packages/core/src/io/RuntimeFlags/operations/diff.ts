/**
 * @tsplus getter effect/core/io/RuntimeFlags diff
 * @category diffing
 * @since 1.0.0
 */
export function diff(that: RuntimeFlags) {
  return (self: RuntimeFlags): RuntimeFlags.Patch => RuntimeFlags.Patch(self ^ that, self)
}
