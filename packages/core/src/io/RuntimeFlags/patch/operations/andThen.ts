/**
 * @tsplus pipeable effect/core/io/RuntimeFlags.Patch andThen
 * @category mutations
 * @since 1.0.0
 */
export function andThen(that: RuntimeFlags.Patch) {
  return (self: RuntimeFlags.Patch): RuntimeFlags.Patch => (self | that) as RuntimeFlags.Patch
}
