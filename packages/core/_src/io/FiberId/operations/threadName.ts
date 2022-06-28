/**
 * Creates a string representing the name of the current thread of execution
 * represented by the specified `FiberId`.
 *
 * @tsplus getter effect/core/io/FiberId threadName
 */
export function threadName(self: FiberId): string {
  const identifiers = Chunk.from(self.ids)
    .map((n) => `${n}`)
    .join(",")
  return `effect-ts-fiber-${identifiers}`
}
