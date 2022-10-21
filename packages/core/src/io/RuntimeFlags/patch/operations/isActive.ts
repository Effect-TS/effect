/**
 * @tsplus pipeable effect/core/io/RuntimeFlags.Patch isActive
 */
export function isActive(flag: RuntimeFlags.Flag) {
  return (self: RuntimeFlags.Patch): boolean => (self.active & flag) !== 0
}
