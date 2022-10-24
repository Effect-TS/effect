/**
 * @tsplus pipeable effect/core/io/RuntimeFlags enableAll
 * @category mutations
 * @since 1.0.0
 */
export function enableAll(flags: RuntimeFlags) {
  return (self: RuntimeFlags): RuntimeFlags => (self | flags) as RuntimeFlags
}
