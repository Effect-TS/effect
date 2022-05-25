import { concreteTake, TakeInternal } from "@effect/core/stream/Take/operations/_internal/TakeInternal"

/**
 * Transforms `Take<E, A>` to `Take<E, B>` by applying function `f`.
 *
 * @tsplus fluent ets/Take map
 */
export function map_<E, A, B>(self: Take<E, A>, f: (a: A) => B): Take<E, B> {
  concreteTake(self)
  return new TakeInternal(self._exit.map((chunk) => chunk.map(f)))
}

/**
 * Transforms `Take<E, A>` to `Take<E, B>` by applying function `f`.
 *
 * @tsplus static ets/Take/Aspects map
 */
export const map = Pipeable(map_)
