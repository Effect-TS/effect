/**
 * @tsplus pipeable effect/core/io/RuntimeFlags enable
 */
export function enable(flag: RuntimeFlags.Flag) {
  return (self: RuntimeFlags): RuntimeFlags => (self | flag) as RuntimeFlags
}
