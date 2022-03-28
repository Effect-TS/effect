import type { Take } from "../definition"
import { concreteTake, TakeInternal } from "./_internal/TakeInternal"

/**
 * Transforms `Take<E, A>` to `Take<E, B>` by applying function `f`.
 *
 * @tsplus fluent ets/Take map
 */
export function map_<E, A, B>(self: Take<E, A>, f: (a: A) => B): Take<E, B> {
  concreteTake(self)
  return new TakeInternal(self._exit.map((chunk) => chunk.map(f)))
}

export const map = Pipeable(map_)
