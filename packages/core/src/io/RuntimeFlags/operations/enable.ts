/**
 * @tsplus pipeable effect/core/io/RuntimeFlags enable
 * @category mutations
 * @since 1.0.0
 */
export function enable(flag: RuntimeFlags.Flag) {
  return (self: RuntimeFlags): RuntimeFlags => (self | flag) as RuntimeFlags
}
