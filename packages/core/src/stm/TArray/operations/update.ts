import { ArrayIndexOutOfBoundsException } from "../../../data/GlobalExceptions"
import type { USTM } from "../../STM"
import { STM } from "../../STM"
import type { TArray } from "../definition"
import { concrete } from "./_internal/InternalTArray"

/**
 * Updates element in the array with given function.
 *
 * @tsplus fluent ets/TArray update
 */
export function update_<A>(self: TArray<A>, index: number, f: (a: A) => A): USTM<void> {
  concrete(self)
  if (0 <= index && index < self.chunk.length) {
    return self.chunk.unsafeGet(index)!.update(f)
  } else {
    return STM.die(new ArrayIndexOutOfBoundsException(index))
  }
}

/**
 * Updates element in the array with given function.
 *
 * @ets_data_first update_
 */
export function update<A>(index: number, f: (a: A) => A) {
  return (self: TArray<A>): USTM<void> => self.update(index, f)
}
