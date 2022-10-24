/**
 * @tsplus pipeable effect/core/io/RuntimeFlags disable
 * @category mutations
 * @since 1.0.0
 */
export function disable(flag: RuntimeFlags.Flag) {
  return (self: RuntimeFlags): RuntimeFlags => (self & ~flag) as RuntimeFlags
}
