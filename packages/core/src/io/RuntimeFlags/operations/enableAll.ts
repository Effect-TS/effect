/**
 * @tsplus pipeable effect/core/io/RuntimeFlags enableAll
 */
export function enableAll(flags: RuntimeFlags) {
  return (self: RuntimeFlags): RuntimeFlags => (self | flags) as RuntimeFlags
}
