import type { TArray } from "../definition"
import { concrete } from "./_internal/InternalTArray"

/**
 * Checks if the array is empty.
 *
 * @tsplus fluent ets/TArray isEmpty
 */
export function isEmpty<A>(self: TArray<A>): boolean {
  concrete(self)
  return self.chunk.length <= 0
}
