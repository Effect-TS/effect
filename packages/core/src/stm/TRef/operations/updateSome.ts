import type { Option } from "../../../data/Option"
import type { STM } from "../../STM"
import type { ETRef } from "../definition"
import { concreteId } from "../definition"

/**
 * Updates some values of the variable but leaves others alone.
 *
 * @tsplus fluent ets/XTRef updateSome
 */
export function updateSome_<E, A>(
  self: ETRef<E, A>,
  pf: (a: A) => Option<A>
): STM<unknown, E, void> {
  concreteId(self)
  switch (self._tag) {
    case "Atomic": {
      return self.updateSome(pf)
    }
    default:
      return (self as ETRef<E, A>).update((a) => pf(a).getOrElse(a))
  }
}

/**
 * Updates some values of the variable but leaves others alone.
 *
 * @ets_data_first updateSome_
 */
export function updateSome<A>(pf: (a: A) => Option<A>) {
  return <E>(self: ETRef<E, A>): STM<unknown, E, void> => self.updateSome(pf)
}
