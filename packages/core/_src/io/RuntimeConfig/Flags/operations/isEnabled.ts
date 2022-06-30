/**
 * @tsplus static effect/core/io/RuntimeConfig/RuntimeConfigFlags.Aspects isEnabled
 * @tsplus pipeable effect/core/io/RuntimeConfig/RuntimeConfigFlags isEnabled
 */
export function isEnabled(flag: RuntimeConfigFlag) {
  return (self: RuntimeConfigFlags): boolean => self.flags.has(flag)
}
