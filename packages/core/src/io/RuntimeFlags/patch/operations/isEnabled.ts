/**
 * @tsplus pipeable effect/core/io/RuntimeFlags.Patch isEnabled
 * @category elements
 * @since 1.0.0
 */
export function isEnabled(flag: RuntimeFlags.Flag) {
  return (self: RuntimeFlags.Patch): boolean => self.isActive(flag) && ((self.enabled & flag) !== 0)
}
