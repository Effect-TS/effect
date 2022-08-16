/**
 * @tsplus pipeable effect/core/io/RuntimeFlags disableAll
 */
export function disableAll(flags: RuntimeFlags) {
  return (self: RuntimeFlags): RuntimeFlags => (self & ~flags) as RuntimeFlags
}
