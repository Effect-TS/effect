/**
 * Creates a string representing the name of the current thread of execution
 * represented by the specified `FiberId`.
 *
 * @tsplus getter effect/core/io/FiberId threadName
 */
export function threadName(self: FiberId): string {
  return Chunk.from(self.ids)
    .map((n) => `${n}`)
    .join(",")
}
