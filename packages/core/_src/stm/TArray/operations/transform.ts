import { concreteTArray } from "@effect/core/stm/TArray/operations/_internal/InternalTArray"

/**
 * Atomically updates all elements using a pure function.
 *
 * @tsplus fluent ets/TArray transform
 */
export function transform_<A>(self: TArray<A>, f: (a: A) => A): USTM<void> {
  return STM.Effect((journal) => {
    let i = 0
    concreteTArray(self)
    while (i < self.chunk.length) {
      const current = self.chunk.unsafeGet(i)!.unsafeGet(journal)
      self.chunk.unsafeGet(i)!.unsafeSet(f(current), journal)
      i = i + 1
    }
  })
}

/**
 * Atomically updates all elements using a pure function.
 *
 * @tsplus static ets/TArray/Aspects transform
 */
export const transform = Pipeable(transform_)
