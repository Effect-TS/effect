import { concreteTMap } from "@effect/core/stm/TMap/operations/_internal/InternalTMap"

/**
 * Returns the number of bindings.
 *
 * @tsplus fluent ets/TMap size
 */
export function size<K, V>(self: TMap<K, V>): USTM<number> {
  concreteTMap(self)
  return self.tSize.get()
}
