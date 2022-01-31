import { join } from "../../../collection/immutable/Chunk/api/join"
import * as C from "../../../collection/immutable/Chunk/core"
import { pipe } from "../../../data/Function"
import type { FiberId } from "../definition"

/**
 * Creates a string representing the name of the current thread of execution
 * represented by the specified `FiberId`.
 *
 * @tsplus fluent ets/FiberId threadName
 */
export function threadName(self: FiberId): string {
  const identifiers = pipe(
    C.from(self.ids),
    C.map((n) => `${n}`),
    join(",")
  )
  return `effect-ts-fiber-${identifiers}`
}
