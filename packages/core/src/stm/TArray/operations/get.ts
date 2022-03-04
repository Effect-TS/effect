import { ArrayIndexOutOfBoundsException } from "../../../data/GlobalExceptions"
import { STM } from "../../STM"
import type { TArray } from "../definition"
import { concrete } from "./_internal/InternalTArray"

/**
 * Extracts value from ref in array.
 *
 * @tsplus index ets/TArray
 * @tsplus fluent ets/TArray get
 */
export function get_<A>(self: TArray<A>, index: number): STM<unknown, never, A> {
  concrete(self)
  if (!Number.isInteger(index) || index < 0 || index >= self.chunk.length) {
    return STM.die(new ArrayIndexOutOfBoundsException(index))
  }
  return self.chunk[index].value!.get()
}

/**
 * Extracts value from ref in array.
 *
 * @ets_data_first get_
 */
export function get(index: number) {
  return <A>(self: TArray<A>): STM<unknown, never, A> => self[index]
}
