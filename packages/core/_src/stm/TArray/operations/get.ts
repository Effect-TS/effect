import { concreteTArray } from "@effect/core/stm/TArray/operations/_internal/InternalTArray"

/**
 * Extracts value from ref in array.
 *
 * @tsplus index ets/TArray
 * @tsplus fluent ets/TArray get
 */
export function get_<A>(self: TArray<A>, index: number): STM<never, never, A> {
  concreteTArray(self)
  if (!Number.isInteger(index) || index < 0 || index >= self.chunk.length) {
    return STM.die(new IndexOutOfBounds(index, 0, self.chunk.length))
  }
  return self.chunk[index].value!.get()
}

/**
 * Extracts value from ref in array.
 *
 * @tsplus static ets/TArray/Aspects get
 */
export const get = Pipeable(get_)
