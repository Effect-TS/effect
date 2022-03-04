import type { Option } from "../../../data/Option"
import type { STM } from "../../STM"
import type { ETRef } from "../definition"
import { concreteId } from "../definition"

/**
 * Updates some values of the variable but leaves others alone.
 *
 * @tsplus fluent ets/XTRef updateSomeAndGet
 */
export function updateSomeAndGet_<E, A>(
  self: ETRef<E, A>,
  pf: (a: A) => Option<A>
): STM<unknown, E, A> {
  concreteId(self)
  switch (self._tag) {
    case "Atomic": {
      return self.updateSomeAndGet(pf)
    }
    default:
      return (self as ETRef<E, A>).updateAndGet((a) => pf(a).getOrElse(a))
  }
}

/**
 * Updates some values of the variable but leaves others alone.
 *
 * @ets_data_first updateSomeAndGet_
 */
export function updateSomeAndGet<A>(pf: (a: A) => Option<A>) {
  return <E>(self: ETRef<E, A>): STM<unknown, E, A> => self.updateSomeAndGet(pf)
}
