import { getOrMakeEntry } from "@effect/core/stm/TRef/operations/_internal/getOrMakeEntry"

/**
 * Retrieves the value of the `TRef`.
 *
 * @tsplus getter effect/core/stm/TRef get
 * @category getters
 * @since 1.0.0
 */
export function get<A>(self: TRef<A>): USTM<A> {
  return STM.Effect((journal) => getOrMakeEntry(self, journal).use((_) => _.unsafeGet()))
}
