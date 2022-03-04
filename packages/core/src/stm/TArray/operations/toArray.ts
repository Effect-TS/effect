import type { Array } from "../../../collection/immutable/Array"
import type { USTM } from "../../STM"
import { STM } from "../../STM"
import type { TArray } from "../definition"
import { concrete } from "./_internal/InternalTArray"

/**
 * Collects all elements into an Array.
 *
 * @tsplus fluent ets/TArray toArray
 */
export function toArray<A>(self: TArray<A>): USTM<Array<A>> {
  concrete(self)
  return STM.forEach(self.chunk, (tref) => tref.get()).map((chunk) => chunk.toArray())
}
