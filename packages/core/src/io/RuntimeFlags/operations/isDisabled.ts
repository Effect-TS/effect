/**
 * @tsplus pipeable effect/core/io/RuntimeFlags isDisabled
 * @category getters
 * @since 1.0.0
 */
export function isDisabled(flag: RuntimeFlags.Flag) {
  return (self: RuntimeFlags): boolean => !self.isEnabled(flag)
}
