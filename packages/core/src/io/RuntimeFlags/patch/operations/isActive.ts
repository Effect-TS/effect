/**
 * @tsplus pipeable effect/core/io/RuntimeFlags.Patch isActive
 * @category elements
 * @since 1.0.0
 */
export function isActive(flag: RuntimeFlags.Flag) {
  return (self: RuntimeFlags.Patch): boolean => (self.active & flag) !== 0
}
