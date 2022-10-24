/**
 * @tsplus pipeable effect/core/io/RuntimeFlags/Patch includes
 * @category elements
 * @since 1.0.0
 */
export function includes(flag: RuntimeFlags.Flag) {
  return (self: RuntimeFlags.Patch): boolean => (self.active & flag) !== 0
}
