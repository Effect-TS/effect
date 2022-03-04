import type { TArray } from "../definition"
import { concrete } from "./_internal/InternalTArray"

/**
 * Returns the size of the array.
 *
 * @tsplus getter ets/TArray size
 */
export function size<A>(self: TArray<A>): number {
  concrete(self)
  return self.chunk.length
}
