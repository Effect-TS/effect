import type { Option } from "../../../data/Option"
import type { USTM } from "../../STM"
import type { TRef } from "../definition"

/**
 * Updates some values of the variable but leaves others alone, returning the
 * old value.
 *
 * @tsplus fluent ets/TRef getAndUpdateSome
 */
export function getAndUpdateSome_<A>(self: TRef<A>, pf: (a: A) => Option<A>): USTM<A> {
  return self.getAndUpdate((a) => pf(a).getOrElse(a))
}

/**
 * Updates some values of the variable but leaves others alone, returning the
 * old value.
 */
export const getAndUpdateSome = Pipeable(getAndUpdateSome_)
