import { Tuple } from "../../../collection/immutable/Tuple"
import type { STM } from "../../STM"
import type { ETRef } from "../definition"
import { concreteId } from "../definition"

/**
 * Updates the value of the variable and returns the new value.
 *
 * @tsplus fluent ets/XTRef updateAndGet
 */
export function updateAndGet_<E, A>(
  self: ETRef<E, A>,
  f: (a: A) => A
): STM<unknown, E, A> {
  concreteId(self)
  switch (self._tag) {
    case "Atomic": {
      return self.updateAndGet(f)
    }
    default:
      return (self as ETRef<E, A>).modify((a) => {
        const result = f(a)
        return Tuple(result, result)
      })
  }
}

/**
 * Updates the value of the variable and returns the new value.
 *
 * @ets_data_first updateAndGet_
 */
export function updateAndGet<A>(f: (a: A) => A) {
  return <E>(self: ETRef<E, A>): STM<unknown, E, A> => self.updateAndGet(f)
}
