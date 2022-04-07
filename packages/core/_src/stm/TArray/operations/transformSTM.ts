import { concreteTArray } from "@effect/core/stm/TArray/operations/_internal/InternalTArray";

/**
 * Atomically updates all elements using a transactional effect.
 *
 * @tsplus fluent ets/TArray transformSTM
 */
export function transformSTM_<E, A>(
  self: TArray<A>,
  f: (a: A) => STM<unknown, E, A>
): STM<unknown, E, void> {
  concreteTArray(self);
  return STM.forEach(self.chunk, (tref) => tref.get().flatMap(f)).flatMap((newData) =>
    STM.Effect((journal) => {
      let i = 0;
      const iterator = newData[Symbol.iterator]();
      let next: IteratorResult<A, any>;
      while (!(next = iterator.next()).done) {
        self.chunk.unsafeGet(i)!.unsafeSet(next.value, journal);
        i = i + 1;
      }
    })
  );
}

/**
 * Atomically updates all elements using a transactional effect.
 *
 * @tsplus static ets/TArray/Aspects transformSTM
 */
export const transformSTM = Pipeable(transformSTM_);
