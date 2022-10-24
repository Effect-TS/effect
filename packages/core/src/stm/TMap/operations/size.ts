import { concreteTMap } from "@effect/core/stm/TMap/operations/_internal/InternalTMap"

/**
 * Returns the number of bindings.
 *
 * @tsplus getter effect/core/stm/TMap size
 * @category getters
 * @since 1.0.0
 */
export function size<K, V>(self: TMap<K, V>): USTM<number> {
  concreteTMap(self)
  return self.tSize.get
}
