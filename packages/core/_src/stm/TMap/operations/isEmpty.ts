import { concreteTMap } from "@effect/core/stm/TMap/operations/_internal/InternalTMap"

/**
 * Tests if the map is empty or not
 *
 * @tsplus getter effect/core/stm/TMap isEmpty
 */
export function isEmpty<K, V>(self: TMap<K, V>): USTM<boolean> {
  concreteTMap(self)
  return self.tSize.get.map((_) => Equals.equals(_, 0))
}
