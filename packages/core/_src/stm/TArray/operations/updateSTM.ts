import { concreteTArray } from "@effect/core/stm/TArray/operations/_internal/InternalTArray";

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
  concreteTArray(self);
  if (0 <= index && index < self.chunk.length) {
    return STM.Do()
      .bind("currentVal", () => self.chunk.unsafeGet(index)!.get())
      .bind("newVal", ({ currentVal }) => f(currentVal))
      .flatMap(({ newVal }) => self.chunk.unsafeGet(index)!.set(newVal));
  } else {
    return STM.die(new IndexOutOfBounds(index, 0, self.chunk.length));
  }
}

/**
 * Atomically updates element in the array with given transactional effect.
 *
 * @tsplus static ets/TArray/Aspects updateSTM
 */
export const updateSTM = Pipeable(updateSTM_);
