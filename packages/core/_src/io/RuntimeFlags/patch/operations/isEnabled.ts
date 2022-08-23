/**
 * @tsplus pipeable effect/core/io/RuntimeFlags.Patch isEnabled
 */
export function isEnabled(flag: RuntimeFlags.Flag) {
  return (self: RuntimeFlags.Patch): boolean => self.isActive(flag) && ((self.enabled & flag) !== 0)
}
