import * as C from "../../Collections/Immutable/Chunk"
import { pipe } from "../../Function"
import type { FiberId } from "../definition"
import { ids } from "./ids"

/**
 * Creates a string representing the name of the current thread of execution
 * represented by the specified `FiberId`.
 */
export function threadName(self: FiberId): string {
  const identifiers = pipe(
    C.from(ids(self)),
    C.map((n) => `${n}`),
    C.join(",")
  )
  return `effect-ts-fiber-${identifiers}`
}
