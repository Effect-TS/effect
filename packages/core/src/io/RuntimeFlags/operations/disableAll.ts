/**
 * @tsplus pipeable effect/core/io/RuntimeFlags disableAll
 * @category mutations
 * @since 1.0.0
 */
export function disableAll(flags: RuntimeFlags) {
  return (self: RuntimeFlags): RuntimeFlags => (self & ~flags) as RuntimeFlags
}
