/**
 * Creates a string representing the name of the current thread of execution
 * represented by the specified `FiberId`.
 *
 * @tsplus getter effect/core/io/FiberId threadName
 * @category destructors
 * @since 1.0.0
 */
export function threadName(self: FiberId): string {
  const identifiers = Array.from(self.ids).map((n) => `${n}`).join(",")
  const plural = identifiers.length > 1
  return `effect-fiber${plural ? "s" : ""}-${identifiers}`
}
