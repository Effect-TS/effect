import { ArrayIndexOutOfBoundsException } from "../../../data/GlobalExceptions"
import { STM } from "../../STM"
import type { TArray } from "../definition"
import { concrete } from "./_internal/InternalTArray"

/**
 * Atomically updates element in the array with given transactional effect.
 *
 * @tsplus fluent ets/TArray updateSTM
 */
export function updateSTM_<E, A>(
  self: TArray<A>,
  index: number,
  f: (a: A) => STM<unknown, E, A>
): STM<unknown, E, void> {
  concrete(self)
  if (0 <= index && index < self.chunk.length) {
    return STM.Do()
      .bind("currentVal", () => self.chunk.unsafeGet(index)!.get())
      .bind("newVal", ({ currentVal }) => f(currentVal))
      .flatMap(({ newVal }) => self.chunk.unsafeGet(index)!.set(newVal))
  } else {
    return STM.die(new ArrayIndexOutOfBoundsException(index))
  }
}

/**
 * Atomically updates element in the array with given transactional effect.
 *
 * @ets_data_first updateSTM_
 */
export function updateSTM<E, A>(index: number, f: (a: A) => STM<unknown, E, A>) {
  return (self: TArray<A>): STM<unknown, E, void> => self.updateSTM(index, f)
}
