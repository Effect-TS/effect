/**
 * @tsplus pipeable effect/core/io/RuntimeFlags/Patch includes
 */
export function includes(flag: RuntimeFlags.Flag) {
  return (self: RuntimeFlags.Patch): boolean => (self.active & flag) !== 0
}
