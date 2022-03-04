import type { USTM } from "../../STM"
import { STM } from "../../STM"
import type { TArray } from "../definition"
import { concrete } from "./_internal/InternalTArray"

/**
 * Atomically updates all elements using a pure function.
 *
 * @tsplus fluent ets/TArray transform
 */
export function transform_<A>(self: TArray<A>, f: (a: A) => A): USTM<void> {
  return STM.Effect((journal) => {
    let i = 0
    concrete(self)
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
 * @ets_data_first transform_
 */
export function transform<A>(f: (a: A) => A) {
  return (self: TArray<A>): USTM<void> => self.transform(f)
}
