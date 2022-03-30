import type { Option } from "../../../data/Option"
import type { USTM } from "../../STM"
import type { TRef } from "../definition"

/**
 * Updates some values of the variable but leaves others alone.
 *
 * @tsplus fluent ets/TRef updateSome
 */
export function updateSome_<A>(self: TRef<A>, pf: (a: A) => Option<A>): USTM<void> {
  return self.update((a) => pf(a).getOrElse(a))
}

/**
 * Updates some values of the variable but leaves others alone.
 */
export const updateSome = Pipeable(updateSome_)
