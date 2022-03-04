import { Tuple } from "../../../collection/immutable/Tuple"
import type { STM } from "../../STM"
import type { ETRef } from "../definition"
import { concreteId } from "../definition"

/**
 * Updates the value of the variable.
 *
 * @tsplus fluent ets/XTRef update
 */
export function update_<E, A>(
  self: ETRef<E, A>,
  f: (a: A) => A
): STM<unknown, E, void> {
  concreteId(self)
  switch (self._tag) {
    case "Atomic": {
      return self.update(f)
    }
    default:
      return (self as ETRef<E, A>).modify((a) => Tuple(undefined, f(a)))
  }
}

/**
 * Updates the value of the variable.
 *
 * @ets_data_first update_
 */
export function update<A>(f: (a: A) => A) {
  return <E>(self: ETRef<E, A>): STM<unknown, E, void> => self.update(f)
}
