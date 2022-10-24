import { pipe } from "@fp-ts/data/Function"
import * as List from "@fp-ts/data/List"

/**
 * Collects all bindings into a list.
 *
 * @tsplus getter effect/core/stm/TMap toList
 * @category conversions
 * @since 1.0.0
 */
export function toList<K, V>(self: TMap<K, V>): USTM<List.List<readonly [K, V]>> {
  return self.fold(List.empty<readonly [K, V]>(), (acc, kv) => pipe(acc, List.prepend(kv)))
}
