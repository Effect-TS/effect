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
      for (let i = 0; i < newData.length; i++) {
        const value = newData.unsafeGet(i)!;
        const entry = self.chunk.unsafeGet(i)!;
        entry.unsafeSet(value, journal);
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
