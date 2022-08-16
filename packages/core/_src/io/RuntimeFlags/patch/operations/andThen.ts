/**
 * @tsplus pipeable effect/core/io/RuntimeFlags.Patch andThen
 */
export function andThen(that: RuntimeFlags.Patch) {
  return (self: RuntimeFlags.Patch): RuntimeFlags.Patch => (self | that) as RuntimeFlags.Patch
}
