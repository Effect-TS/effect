import { Tuple } from "../../../collection/immutable/Tuple"
import type { STM } from "../../STM"
import type { ETRef } from "../definition"
import { concreteId } from "../definition"

/**
 * Sets the value of the `XTRef` and returns the old value.
 *
 * @tsplus fluent ets/XTRef getAndSet
 */
export function getAndSet_<EA, A>(self: ETRef<EA, A>, a: A): STM<unknown, EA, A> {
  concreteId(self)
  switch (self._tag) {
    case "Atomic": {
      return self.getAndSet(a)
    }
    default: {
      return (self as ETRef<EA, A>).modify((_) => Tuple(_, a))
    }
  }
}

/**
 * Sets the value of the `XTRef` and returns the old value.
 *
 * @ets_data_first getAndSet_
 */
export function getAndSet<A>(a: A) {
  return <EA>(self: ETRef<EA, A>): STM<unknown, EA, A> => self.getAndSet(a)
}
