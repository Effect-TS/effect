import { concreteTSet } from "@effect/core/stm/TSet/operations/_internal/InternalTSet"

/**
 * Stores new element in the set.
 *
 * @tsplus fluent ets/TSet put
 */
export function put_<A>(self: TSet<A>, a: A): USTM<void> {
  concreteTSet(self)
  return self.tmap.put(a, undefined as void)
}

/**
 * Stores new element in the set.
 *
 * @tsplus static ets/TSet/Aspects put
 */
export const put = Pipeable(put_)
