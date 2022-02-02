import { Chunk } from "../../../collection/immutable/Chunk"
import type { FiberId } from "../definition"

/**
 * Creates a string representing the name of the current thread of execution
 * represented by the specified `FiberId`.
 *
 * @tsplus fluent ets/FiberId threadName
 */
export function threadName(self: FiberId): string {
  const identifiers = Chunk.from(self.ids)
    .map((n) => `${n}`)
    .join(",")
  return `effect-ts-fiber-${identifiers}`
}
