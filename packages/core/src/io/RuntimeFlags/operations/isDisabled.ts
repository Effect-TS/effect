/**
 * @tsplus pipeable effect/core/io/RuntimeFlags isDisabled
 */
export function isDisabled(flag: RuntimeFlags.Flag) {
  return (self: RuntimeFlags): boolean => !self.isEnabled(flag)
}
