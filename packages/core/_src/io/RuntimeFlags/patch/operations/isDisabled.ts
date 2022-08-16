/**
 * @tsplus pipeable effect/core/io/RuntimeFlags.Patch isDisabled
 */
export function isDisabled(flag: RuntimeFlags.Flag) {
  return (self: RuntimeFlags.Patch): boolean => self.isActive(flag) && ((self.enabled & flag) !== 0)
}
