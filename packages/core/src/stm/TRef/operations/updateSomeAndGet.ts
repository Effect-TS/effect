import type { Option } from "../../../data/Option"
import type { USTM } from "../../STM"
import type { TRef } from "../definition"

/**
 * Updates some values of the variable but leaves others alone.
 *
 * @tsplus fluent ets/TRef updateSomeAndGet
 */
export function updateSomeAndGet_<A>(self: TRef<A>, pf: (a: A) => Option<A>): USTM<A> {
  return self.updateAndGet((a) => pf(a).getOrElse(a))
}

/**
 * Updates some values of the variable but leaves others alone.
 */
export const updateSomeAndGet = Pipeable(updateSomeAndGet_)
