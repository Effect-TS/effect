/**
 * @tsplus pipeable effect/core/io/RuntimeFlags isEnabled
 * @category getters
 * @since 1.0.0
 */
export function isEnabled(flag: RuntimeFlags.Flag) {
  return (self: RuntimeFlags): boolean => (self & flag) !== 0
}
