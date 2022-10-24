import { IndexOutOfBoundsException } from "@effect/core/io/Cause/errors"
import { concreteTArray } from "@effect/core/stm/TArray/operations/_internal/InternalTArray"
/**
 * Extracts value from ref in array.
 *
 * @tsplus index effect/core/stm/TArray
 * @tsplus static effect/core/stm/TArray.Aspects get
 * @tsplus pipeable effect/core/stm/TArray get
 * @category elements
 * @since 1.0.0
 */
export function get<A>(index: number) {
  return (self: TArray<A>): STM<never, never, A> => {
    concreteTArray(self)
    if (!Number.isInteger(index) || index < 0 || index >= self.chunk.length) {
      return STM.dieSync(new IndexOutOfBoundsException(index, 0, self.chunk.length))
    }
    return self.chunk[index].value!.get
  }
}
