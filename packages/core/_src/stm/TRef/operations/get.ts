import { getOrMakeEntry } from "@effect-ts/core/stm/TRef/operations/_internal/getOrMakeEntry";

/**
 * Retrieves the value of the `TRef`.
 *
 * @tsplus fluent ets/TRef get
 */
export function get<A>(self: TRef<A>): USTM<A> {
  return STM.Effect((journal) => getOrMakeEntry(self, journal).use((_) => _.unsafeGet()));
}
