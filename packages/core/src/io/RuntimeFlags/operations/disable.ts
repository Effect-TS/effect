/**
 * @tsplus pipeable effect/core/io/RuntimeFlags disable
 */
export function disable(flag: RuntimeFlags.Flag) {
  return (self: RuntimeFlags): RuntimeFlags => (self & ~flag) as RuntimeFlags
}
