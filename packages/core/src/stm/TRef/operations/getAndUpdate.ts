import { Tuple } from "../../../collection/immutable/Tuple"
import type { STM } from "../../STM"
import type { ETRef } from "../definition"
import { concreteId } from "../definition"

/**
 * Updates the value of the variable and returns the old value.
 *
 * @tsplus fluent ets/XTRef getAndUpdate
 */
export function getAndUpdate_<EA, A>(
  self: ETRef<EA, A>,
  f: (a: A) => A
): STM<unknown, EA, A> {
  concreteId(self)
  switch (self._tag) {
    case "Atomic": {
      return self.getAndUpdate(f)
    }
    default: {
      return (self as ETRef<EA, A>).modify((_) => Tuple(_, f(_)))
    }
  }
}

/**
 * Updates the value of the variable and returns the old value.
 *
 * @ets_data_first getAndUpdate_
 */
export function getAndUpdate<A>(f: (a: A) => A) {
  return <EA>(self: ETRef<EA, A>): STM<unknown, EA, A> => self.getAndUpdate(f)
}
