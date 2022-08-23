/**
 * @tsplus pipeable effect/core/io/RuntimeFlags isEnabled
 */
export function isEnabled(flag: RuntimeFlags.Flag) {
  return (self: RuntimeFlags): boolean => (self & flag) !== 0
}
