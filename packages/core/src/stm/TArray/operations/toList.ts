import { List } from "../../../collection/immutable/List"
import type { USTM } from "../../STM"
import { STM } from "../../STM"
import type { TArray } from "../definition"
import { concrete } from "./_internal/InternalTArray"

/**
 * Collects all elements into a list.
 *
 * @tsplus fluent ets/TArray toList
 */
export function toList<A>(self: TArray<A>): USTM<List<A>> {
  concrete(self)
  return STM.forEach(self.chunk, (tref) => tref.get()).map(List.from)
}
