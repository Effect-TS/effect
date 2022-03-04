import { Tuple } from "../../../collection/immutable/Tuple"
import type { Option } from "../../../data/Option"
import type { STM } from "../../STM"
import type { ETRef } from "../definition"
import { concreteId } from "../definition"

/**
 * Updates some values of the variable but leaves others alone, returning the
 * old value.
 *
 * @tsplus fluent ets/XTRef getAndUpdateSome
 */
export function getAndUpdateSome_<EA, A>(
  self: ETRef<EA, A>,
  pf: (a: A) => Option<A>
): STM<unknown, EA, A> {
  concreteId(self)
  switch (self._tag) {
    case "Atomic": {
      return self.getAndUpdateSome(pf)
    }
    default: {
      return (self as ETRef<EA, A>).modify((_) =>
        pf(_).fold(Tuple(_, _), (a) => Tuple(_, a))
      )
    }
  }
}

/**
 * Updates some values of the variable but leaves others alone, returning the
 * old value.
 *
 * @ets_data_first getAndUpdateSome_
 */
export function getAndUpdateSome<A>(pf: (a: A) => Option<A>) {
  return <EA>(self: ETRef<EA, A>): STM<unknown, EA, A> => self.getAndUpdateSome(pf)
}
